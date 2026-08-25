const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");

const SESSION_COOKIE_NAME = "cdp_session";
const SESSION_TTL_SECONDS = 2 * 60 * 60; // 2h — pas de refresh token en MVP (voir GUIDE-VIBE-CODING.md, décision à revisiter si besoin).
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

function signSessionToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    requireEnv("JWT_SECRET"),
    { expiresIn: SESSION_TTL_SECONDS },
  );
}

function verifySessionToken(token) {
  return jwt.verify(token, requireEnv("JWT_SECRET"));
}

/// Génère un token opaque à usage unique (vérification email, reset mdp).
/// Le token brut est renvoyé une seule fois à l'appelant (pour l'email à
/// envoyer) ; seul son hash SHA-256 est stocké en base, comme un mot de
/// passe — un accès en lecture à la base ne permet pas de forger un lien.
function generateOpaqueToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function hashOpaqueToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  signSessionToken,
  verifySessionToken,
  generateOpaqueToken,
  hashOpaqueToken,
};
