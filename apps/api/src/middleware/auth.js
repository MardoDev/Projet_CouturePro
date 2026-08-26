const { prisma } = require("../db/client");
const { SESSION_COOKIE_NAME, verifySessionToken } = require("../auth/tokens");

/// RG2 — deny-by-default : toute route protégée exige un cookie de session
/// valide ET un compte actuellement ACTIVE. Le statut est relu en base à
/// chaque requête (pas seulement au moment du login) pour qu'une
/// suspension prenne effet immédiatement, même si le token n'a pas expiré.
async function authenticate(request, response, next) {
  const token = request.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return response.status(401).json({ error: "AUTHENTICATION_REQUIRED" });
  }

  let payload;
  try {
    payload = verifySessionToken(token);
  } catch {
    return response.status(401).json({ error: "INVALID_SESSION" });
  }

  const user = await prisma.utilisateur.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== "ACTIVE") {
    return response.status(401).json({ error: "ACCOUNT_NOT_ACTIVE" });
  }

  request.user = user;
  next();
}

/// Deny-by-default : n'autorise que les rôles explicitement listés.
function requireRole(...allowedRoles) {
  return (request, response, next) => {
    if (!request.user) {
      return response.status(401).json({ error: "AUTHENTICATION_REQUIRED" });
    }
    if (!allowedRoles.includes(request.user.role)) {
      return response.status(403).json({ error: "FORBIDDEN" });
    }
    next();
  };
}

/// Pour les routes publiques dont le contenu varie selon le rôle (ex. un
/// contenu manager voit ses brouillons, le public non). N'échoue jamais :
/// un cookie absent, invalide ou expiré laisse simplement request.user
/// indéfini plutôt que de rejeter la requête.
async function optionalAuthenticate(request, _response, next) {
  const token = request.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return next();
  }
  try {
    const payload = verifySessionToken(token);
    const user = await prisma.utilisateur.findUnique({ where: { id: payload.sub } });
    if (user && user.status === "ACTIVE") {
      request.user = user;
    }
  } catch {
    // Token invalide/expiré : traité comme anonyme, pas comme une erreur.
  }
  next();
}

module.exports = { authenticate, requireRole, optionalAuthenticate };
