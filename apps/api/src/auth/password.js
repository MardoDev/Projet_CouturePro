const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

function isPasswordStrongEnough(password) {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
}

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/// Hash de placeholder pour un compte interne créé par un administrateur :
/// personne ne connaît de mot de passe correspondant tant que le titulaire
/// n'a pas défini le sien via le flux de réinitialisation (jamais de mot de
/// passe temporaire envoyé en clair).
async function unusablePasswordHash() {
  return hashPassword(crypto.randomBytes(32).toString("hex"));
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  isPasswordStrongEnough,
  hashPassword,
  verifyPassword,
  unusablePasswordHash,
};
