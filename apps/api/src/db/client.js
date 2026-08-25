const { PrismaClient } = require("@prisma/client");

// Singleton — évite d'ouvrir un nouveau pool de connexions à chaque import
// (important avec `node --watch` en dev et les tests qui important ce module).
const prisma = global.__cdpPrisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__cdpPrisma = prisma;
}

module.exports = { prisma };
