const { redis } = require("../db/redis");

/// Idempotence des opérations sensibles (critère du skill backend-métier).
/// Le client doit fournir un en-tête Idempotency-Key ; une requête rejouée
/// avec la même clé reçoit la réponse déjà produite au lieu de ré-exécuter
/// l'opération (ex. double clic sur "payer", retry réseau après timeout).
///
/// Portée : protège contre la ré-exécution applicative (ex. deux commandes
/// créées pour un même clic). Ce n'est pas le même mécanisme que RG8
/// (idempotence des webhooks de paiement, garantie par la contrainte UNIQUE
/// sur paiement.raw_event_hash, Phase 2/7).
function idempotent({ ttlSeconds = 60 } = {}) {
  return async function idempotencyMiddleware(request, response, next) {
    const key = request.header("Idempotency-Key");
    if (!key) {
      return response.status(400).json({ error: "IDEMPOTENCY_KEY_REQUIRED" });
    }

    const redisKey = `idempotency:${request.method}:${request.baseUrl}${request.path}:${request.user?.id ?? "anon"}:${key}`;

    let reserved;
    try {
      reserved = await redis.set(
        redisKey,
        JSON.stringify({ status: "pending" }),
        "EX",
        ttlSeconds,
        "NX",
      );
    } catch (error) {
      // Redis indisponible : ne bloque pas l'opération, mais ne peut pas
      // garantir l'idempotence — signalé explicitement au client.
      response.setHeader("X-Idempotency-Degraded", "redis-unavailable");
      return next();
    }

    if (!reserved) {
      const stored = await redis.get(redisKey);
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed?.status === "done") {
        response.setHeader("X-Idempotent-Replay", "true");
        return response.status(parsed.httpStatus).json(parsed.body);
      }
      return response.status(409).json({ error: "DUPLICATE_REQUEST_IN_PROGRESS" });
    }

    const originalJson = response.json.bind(response);
    response.json = (body) => {
      redis
        .set(
          redisKey,
          JSON.stringify({ status: "done", httpStatus: response.statusCode, body }),
          "EX",
          ttlSeconds,
        )
        .catch(() => {});
      return originalJson(body);
    };

    next();
  };
}

module.exports = { idempotent };
