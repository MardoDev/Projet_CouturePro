const express = require("express");
const { prisma } = require("../db/client");
const {
  hashPassword,
  verifyPassword,
  isPasswordStrongEnough,
  MIN_PASSWORD_LENGTH,
} = require("../auth/password");
const {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  signSessionToken,
  generateOpaqueToken,
  hashOpaqueToken,
} = require("../auth/tokens");
const { authenticate } = require("../middleware/auth");
const { auditLog } = require("../auth/audit");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : email;
}

function isValidEmail(email) {
  return typeof email === "string" && EMAIL_PATTERN.test(email);
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

function setSessionCookie(response, user) {
  response.cookie(SESSION_COOKIE_NAME, signSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/",
  });
}

function createAuthRouter() {
  const router = express.Router();

  // RG1/RG2 — inscription client. Statut initial PENDING_EMAIL (matrice de
  // création, CDC section 2) : le compte n'est pas ACTIVE tant que l'email
  // n'est pas vérifié.
  router.post("/register", async (request, response) => {
    const email = normalizeEmail(request.body?.email);
    const { password, firstName, lastName } = request.body ?? {};

    if (!isValidEmail(email) || !firstName || !lastName) {
      return response.status(400).json({ error: "INVALID_INPUT" });
    }
    if (!isPasswordStrongEnough(password)) {
      return response
        .status(400)
        .json({ error: "WEAK_PASSWORD", minLength: MIN_PASSWORD_LENGTH });
    }

    const existing = await prisma.utilisateur.findUnique({ where: { email } });
    if (existing) {
      // RG1 : ne pas révéler quel email existe déjà (hygiène anti-énumération).
      return response.status(409).json({ error: "EMAIL_ALREADY_USED" });
    }

    const passwordHash = await hashPassword(password);
    const { raw: verificationToken, hash: verificationHash } = generateOpaqueToken();

    const user = await prisma.utilisateur.create({
      data: {
        email,
        passwordHash,
        role: "CLIENT",
        status: "PENDING_EMAIL",
        firstName,
        lastName,
        emailVerificationTokenHash: verificationHash,
        emailVerificationExpiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
        clientProfile: { create: { consentMarketing: false } },
      },
    });

    auditLog("user.registered", { userId: user.id });

    // A VALIDER : aucun prestataire d'envoi d'email n'est défini dans la
    // stack (CLAUDE.md). Le lien de vérification n'est donc pas envoyé —
    // il est seulement renvoyé ici en environnement non-production, pour
    // permettre de dérouler le flux en développement/tests. Brancher un
    // vrai envoi (et retirer ce champ de la réponse) avant la Phase 9.
    const devPayload = isProduction()
      ? {}
      : { devEmailVerificationToken: verificationToken };

    return response.status(201).json({ user: publicUser(user), ...devPayload });
  });

  router.get("/verify-email", async (request, response) => {
    const token = request.query?.token;
    if (typeof token !== "string" || token.length === 0) {
      return response.status(400).json({ error: "INVALID_INPUT" });
    }

    const tokenHash = hashOpaqueToken(token);
    const user = await prisma.utilisateur.findFirst({
      where: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: { gt: new Date() },
        status: "PENDING_EMAIL",
      },
    });
    if (!user) {
      return response.status(400).json({ error: "INVALID_OR_EXPIRED_TOKEN" });
    }

    await prisma.utilisateur.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    auditLog("user.email_verified", { userId: user.id });

    return response.status(200).json({ verified: true });
  });

  // RG2 — deny-by-default : un compte non ACTIVE ne reçoit pas de session,
  // quel que soit le mot de passe fourni.
  router.post("/login", async (request, response) => {
    const email = normalizeEmail(request.body?.email);
    const { password } = request.body ?? {};

    if (!isValidEmail(email) || typeof password !== "string") {
      return response.status(400).json({ error: "INVALID_INPUT" });
    }

    const user = await prisma.utilisateur.findUnique({ where: { email } });
    const passwordMatches = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
      auditLog("user.login_failed", { email });
      return response.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    if (user.status !== "ACTIVE") {
      auditLog("user.login_blocked", { userId: user.id, status: user.status });
      return response.status(403).json({ error: "ACCOUNT_NOT_ACTIVE", status: user.status });
    }

    setSessionCookie(response, user);
    auditLog("user.login_succeeded", { userId: user.id });

    return response.status(200).json({ user: publicUser(user) });
  });

  router.post("/logout", (request, response) => {
    response.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return response.status(200).json({ loggedOut: true });
  });

  // RG2 — un client ne lit que ses propres données : /me ne renvoie que le
  // compte authentifié, jamais une ressource passée en paramètre.
  router.get("/me", authenticate, (request, response) => {
    return response.status(200).json({ user: publicUser(request.user) });
  });

  router.post("/request-password-reset", async (request, response) => {
    const email = normalizeEmail(request.body?.email);
    if (!isValidEmail(email)) {
      return response.status(400).json({ error: "INVALID_INPUT" });
    }

    const user = await prisma.utilisateur.findUnique({ where: { email } });

    // Réponse identique que le compte existe ou non (anti-énumération).
    const genericResponse = { message: "IF_ACCOUNT_EXISTS_RESET_LINK_SENT" };
    if (!user) {
      return response.status(200).json(genericResponse);
    }

    const { raw: resetToken, hash: resetHash } = generateOpaqueToken();
    await prisma.utilisateur.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: resetHash,
        passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    auditLog("user.password_reset_requested", { userId: user.id });

    // Même limite que /register : pas de prestataire email dans la stack.
    const devPayload = isProduction() ? {} : { devPasswordResetToken: resetToken };
    return response.status(200).json({ ...genericResponse, ...devPayload });
  });

  router.post("/reset-password", async (request, response) => {
    const { token, password } = request.body ?? {};
    if (typeof token !== "string" || token.length === 0) {
      return response.status(400).json({ error: "INVALID_INPUT" });
    }
    if (!isPasswordStrongEnough(password)) {
      return response
        .status(400)
        .json({ error: "WEAK_PASSWORD", minLength: MIN_PASSWORD_LENGTH });
    }

    const tokenHash = hashOpaqueToken(token);
    const user = await prisma.utilisateur.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });
    if (!user) {
      return response.status(400).json({ error: "INVALID_OR_EXPIRED_TOKEN" });
    }

    await prisma.utilisateur.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    auditLog("user.password_reset_completed", { userId: user.id });

    return response.status(200).json({ reset: true });
  });

  return router;
}

module.exports = { createAuthRouter, normalizeEmail, isValidEmail, publicUser };
