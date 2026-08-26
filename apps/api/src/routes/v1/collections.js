const express = require("express");
const { prisma } = require("../../db/client");
const { authenticate, requireRole, optionalAuthenticate } = require("../../middleware/auth");
const { auditLog } = require("../../auth/audit");

// UC7 — publication de catalogue : ADMIN ou CONTENT_MANAGER.
const CONTENT_ROLES = ["ADMIN", "CONTENT_MANAGER"];

function isStaff(user) {
  return Boolean(user) && CONTENT_ROLES.includes(user.role);
}

function publicCollection(collection) {
  return {
    id: collection.id,
    name: collection.name,
    season: collection.season,
    year: collection.year,
    description: collection.description,
    status: collection.status,
    coverUrl: collection.coverUrl,
    createdAt: collection.createdAt,
  };
}

function createCollectionsRouter() {
  const router = express.Router();

  // Public : uniquement les collections publiées. Le personnel de contenu
  // voit tout (y compris DRAFT/SCHEDULED/ARCHIVED) pour piloter la
  // planification (UC11).
  router.get("/", optionalAuthenticate, async (request, response) => {
    const where = isStaff(request.user) ? {} : { status: "PUBLISHED" };
    const collections = await prisma.collection.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return response.status(200).json({ collections: collections.map(publicCollection) });
  });

  router.get("/:id", optionalAuthenticate, async (request, response) => {
    const collection = await prisma.collection.findUnique({ where: { id: request.params.id } });
    if (!collection) {
      return response.status(404).json({ error: "NOT_FOUND" });
    }
    if (collection.status !== "PUBLISHED" && !isStaff(request.user)) {
      // Ne pas distinguer "inexistant" de "pas encore publié" pour le public.
      return response.status(404).json({ error: "NOT_FOUND" });
    }
    return response.status(200).json({ collection: publicCollection(collection) });
  });

  router.post("/", authenticate, requireRole(...CONTENT_ROLES), async (request, response) => {
    const { name, season, year, description, coverUrl } = request.body ?? {};
    if (!name || !season || !Number.isInteger(year)) {
      return response.status(400).json({ error: "INVALID_INPUT" });
    }

    const collection = await prisma.collection.create({
      data: {
        name,
        season,
        year,
        description: description ?? null,
        coverUrl: coverUrl ?? null,
        status: "DRAFT",
        createdBy: request.user.id,
      },
    });

    auditLog("collection.created", { byUserId: request.user.id, collectionId: collection.id });

    return response.status(201).json({ collection: publicCollection(collection) });
  });

  router.patch("/:id", authenticate, requireRole(...CONTENT_ROLES), async (request, response) => {
    const existing = await prisma.collection.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return response.status(404).json({ error: "NOT_FOUND" });
    }

    const { name, season, year, description, coverUrl, status } = request.body ?? {};
    const allowedStatuses = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return response.status(400).json({ error: "INVALID_STATUS" });
    }

    const collection = await prisma.collection.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(season !== undefined ? { season } : {}),
        ...(year !== undefined ? { year } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(coverUrl !== undefined ? { coverUrl } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });

    auditLog("collection.updated", { byUserId: request.user.id, collectionId: collection.id });

    return response.status(200).json({ collection: publicCollection(collection) });
  });

  return router;
}

module.exports = { createCollectionsRouter, isStaff, CONTENT_ROLES };
