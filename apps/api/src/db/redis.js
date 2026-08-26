const Redis = require("ioredis");

// Singleton, même logique que src/db/client.js (Prisma).
const redis = global.__cdpRedis || new Redis(process.env.REDIS_URL, {
  // Ne bloque pas le démarrage/les tests si Redis est temporairement
  // indisponible ; les appelants (idempotence) doivent rester tolérants.
  lazyConnect: false,
  maxRetriesPerRequest: 2,
});

if (process.env.NODE_ENV !== "production") {
  global.__cdpRedis = redis;
}

module.exports = { redis };
