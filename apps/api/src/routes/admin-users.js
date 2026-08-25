const express = require("express");
const { prisma } = require("../db/client");
const { unusablePasswordHash } = require("../auth/password");
const { PASSWORD_RESET_TTL_MS, generateOpaqueToken } = require("../auth/tokens");
const { authenticate, requireRole } = require("../middleware/auth");
const { auditLog } = require("../auth/audit");
const { normalizeEmail, isValidEmail, publicUser } = require("./auth");

// Comptes internes créables par un administrateur (matrice de création,
// CDC section 2). ADMIN est exclu volontairement : sa création est "hors
// application ou administrateur principal désigné par C.D.P" — décision
// humaine non formalisée, pas une API. CLIENT s'inscrit via /auth/register.
const CREATABLE_INTERNAL_ROLES = ["CONTENT_MANAGER", "LOGISTICS"];

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function createAdminUsersRouter() {
  const router = express.Router();

  router.use(authenticate, requireRole("ADMIN"));

  router.get("/", async (_request, response) => {
    const users = await prisma.utilisateur.findMany({
      orderBy: { createdAt: "desc" },
    });
    return response.status(200).json({ users: users.map(publicUser) });
  });

  // Création d'un compte interne : statut initial PENDING_ADMIN (matrice de
  // création). Aucun mot de passe temporaire envoyé en clair — un lien de
  // définition de mot de passe (même mécanisme que /reset-password) est
  // fourni à la place.
  router.post("/", async (request, response) => {
    const email = normalizeEmail(request.body?.email);
    const { firstName, lastName, role } = request.body ?? {};

    if (!isValidEmail(email) || !firstName || !lastName) {
      return response.status(400).json({ error: "INVALID_INPUT" });
    }
    if (!CREATABLE_INTERNAL_ROLES.includes(role)) {
      return response.status(400).json({
        error: "INVALID_ROLE",
        allowed: CREATABLE_INTERNAL_ROLES,
      });
    }

    const existing = await prisma.utilisateur.findUnique({ where: { email } });
    if (existing) {
      return response.status(409).json({ error: "EMAIL_ALREADY_USED" });
    }

    const { raw: setupToken, hash: setupHash } = generateOpaqueToken();
    const user = await prisma.utilisateur.create({
      data: {
        email,
        passwordHash: await unusablePasswordHash(),
        role,
        status: "PENDING_ADMIN",
        firstName,
        lastName,
        passwordResetTokenHash: setupHash,
        passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    auditLog("admin.internal_account_created", {
      byUserId: request.user.id,
      createdUserId: user.id,
      role,
    });

    const devPayload = isProduction() ? {} : { devPasswordSetupToken: setupToken };
    return response.status(201).json({ user: publicUser(user), ...devPayload });
  });

  // Validation d'un compte interne (matrice de création : "Validation :
  // Administrateur"). Décision humaine explicite, distincte de la création.
  router.patch("/:id/activate", async (request, response) => {
    const target = await prisma.utilisateur.findUnique({ where: { id: request.params.id } });
    if (!target) {
      return response.status(404).json({ error: "NOT_FOUND" });
    }
    if (target.status !== "PENDING_ADMIN") {
      return response.status(400).json({ error: "NOT_PENDING_ADMIN", status: target.status });
    }

    const updated = await prisma.utilisateur.update({
      where: { id: target.id },
      data: { status: "ACTIVE" },
    });

    auditLog("admin.internal_account_activated", {
      byUserId: request.user.id,
      activatedUserId: updated.id,
    });

    return response.status(200).json({ user: publicUser(updated) });
  });

  return router;
}

module.exports = { createAdminUsersRouter };
