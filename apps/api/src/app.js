const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { createAuthRouter } = require("./routes/auth");
const { createAdminUsersRouter } = require("./routes/admin-users");
const { createCollectionsRouter } = require("./routes/v1/collections");
const { createCataloguesRouter } = require("./routes/v1/catalogues");
const { createProduitsRouter } = require("./routes/v1/produits");
const { createPanierRouter } = require("./routes/v1/panier");
const { createCommandesRouter } = require("./routes/v1/commandes");

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.WEB_ORIGIN || "http://localhost:3000",
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_request, response) => {
    response.json({ service: "couture-dynamic-pro-api", status: "ok" });
  });

  app.use("/api/auth", createAuthRouter());
  app.use("/api/admin/users", createAdminUsersRouter());

  // API métier versionnée (Phase 4). Les paiements réels (CinetPay/Stripe,
  // webhooks vérifiés RG8) arrivent en Phase 7 — aucune route /paiements ici.
  app.use("/api/v1/collections", createCollectionsRouter());
  app.use("/api/v1/catalogues", createCataloguesRouter());
  app.use("/api/v1/produits", createProduitsRouter());
  app.use("/api/v1/panier", createPanierRouter());
  app.use("/api/v1/commandes", createCommandesRouter());

  return app;
}

module.exports = { createApp };
