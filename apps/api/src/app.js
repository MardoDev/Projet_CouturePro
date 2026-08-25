const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { createAuthRouter } = require("./routes/auth");
const { createAdminUsersRouter } = require("./routes/admin-users");

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

  app.get("/api/catalogues", (_request, response) => {
    response.json({
      data: [
        { slug: "ete-tropical-2026", title: "Été Tropical", season: "Été 2026" },
        { slug: "haute-couture-prestige", title: "Haute Couture Prestige", season: "Permanente" },
        { slug: "pret-a-porter-urbain", title: "Prêt-à-Porter Urbain", season: "Automne 2026" },
      ],
    });
  });

  return app;
}

module.exports = { createApp };
