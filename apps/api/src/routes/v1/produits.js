const express = require("express");
const { prisma } = require("../../db/client");
const { authenticate, requireRole, optionalAuthenticate } = require("../../middleware/auth");
const { auditLog } = require("../../auth/audit");
const { slugify } = require("../../lib/slug");

// UC6 — gestion produit : Administrateur uniquement (le gestionnaire de
// contenu gère collections/catalogues/contenus, pas le catalogue produit).
const PRODUCT_ROLES = ["ADMIN"];

function isStaff(user) {
  return Boolean(user) && PRODUCT_ROLES.includes(user.role);
}

function publicVariante(variante) {
  return {
    id: variante.id,
    sku: variante.sku,
    size: variante.size,
    color: variante.color,
    priceAmount: variante.priceAmount,
    currency: variante.currency,
    stockQuantity: variante.stockQuantity,
    status: variante.status,
  };
}

function publicProduit(produit, { staff }) {
  const variantes = produit.variantes ?? [];
  return {
    id: produit.id,
    collectionId: produit.collectionId,
    name: produit.name,
    slug: produit.slug,
    description: produit.description,
    category: produit.category,
    status: produit.status,
    variantes: (staff ? variantes : variantes.filter((v) => v.status === "ACTIVE")).map(
      publicVariante,
    ),
  };
}

function createProduitsRouter() {
  const router = express.Router();

  router.get("/", optionalAuthenticate, async (request, response) => {
    const staff = isStaff(request.user);
    const produits = await prisma.produit.findMany({
      where: staff ? {} : { status: "ACTIVE" },
      include: { variantes: true },
      orderBy: { name: "asc" },
    });
    return response.status(200).json({ produits: produits.map((p) => publicProduit(p, { staff })) });
  });

  router.get("/:slug", optionalAuthenticate, async (request, response) => {
    const staff = isStaff(request.user);
    const produit = await prisma.produit.findUnique({
      where: { slug: request.params.slug },
      include: { variantes: true },
    });
    if (!produit) {
      return response.status(404).json({ error: "NOT_FOUND" });
    }
    if (produit.status !== "ACTIVE" && !staff) {
      return response.status(404).json({ error: "NOT_FOUND" });
    }
    return response.status(200).json({ produit: publicProduit(produit, { staff }) });
  });

  router.post("/", authenticate, requireRole(...PRODUCT_ROLES), async (request, response) => {
    const { name, category, description, collectionId } = request.body ?? {};
    let { slug } = request.body ?? {};

    if (!name || !category) {
      return response.status(400).json({ error: "INVALID_INPUT" });
    }

    if (collectionId) {
      const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
      if (!collection) {
        return response.status(400).json({ error: "COLLECTION_NOT_FOUND" });
      }
    }

    slug = slug ? slugify(slug) : slugify(name);
    if (!slug) {
      return response.status(400).json({ error: "INVALID_SLUG" });
    }

    let produit;
    try {
      produit = await prisma.produit.create({
        data: {
          name,
          slug,
          category,
          description: description ?? null,
          collectionId: collectionId ?? null,
          status: "DRAFT",
          createdBy: request.user.id,
        },
        include: { variantes: true },
      });
    } catch (error) {
      if (error.code === "P2002") {
        return response.status(409).json({ error: "SLUG_ALREADY_USED" });
      }
      throw error;
    }

    auditLog("produit.created", { byUserId: request.user.id, produitId: produit.id });

    return response.status(201).json({ produit: publicProduit(produit, { staff: true }) });
  });

  router.patch("/:id", authenticate, requireRole(...PRODUCT_ROLES), async (request, response) => {
    const existing = await prisma.produit.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return response.status(404).json({ error: "NOT_FOUND" });
    }

    const { name, category, description, status } = request.body ?? {};
    const allowedStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return response.status(400).json({ error: "INVALID_STATUS" });
    }

    // RG5 — un produit ACTIVE doit avoir au moins une variante ACTIVE avec
    // un prix non négatif (garanti par la contrainte DB sur le prix) pour
    // être réellement vendable.
    if (status === "ACTIVE") {
      const activeVariantCount = await prisma.varianteProduit.count({
        where: { productId: existing.id, status: "ACTIVE" },
      });
      if (activeVariantCount === 0) {
        return response.status(400).json({ error: "NO_ACTIVE_VARIANT" });
      }
    }

    const produit = await prisma.produit.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      include: { variantes: true },
    });

    auditLog("produit.updated", { byUserId: request.user.id, produitId: produit.id });

    return response.status(200).json({ produit: publicProduit(produit, { staff: true }) });
  });

  router.post(
    "/:id/variantes",
    authenticate,
    requireRole(...PRODUCT_ROLES),
    async (request, response) => {
      const produit = await prisma.produit.findUnique({ where: { id: request.params.id } });
      if (!produit) {
        return response.status(404).json({ error: "NOT_FOUND" });
      }

      // Devise validée : XAF uniquement (voir schema.prisma). Le champ reste
      // acceptable en entrée pour rester explicite côté client, mais toute
      // autre valeur est refusée plutôt que silencieusement acceptée.
      const { sku, size, color, priceAmount, currency = "XAF", stockQuantity } = request.body ?? {};
      if (
        !sku ||
        !size ||
        !color ||
        !Number.isInteger(priceAmount) ||
        priceAmount < 0 ||
        !Number.isInteger(stockQuantity) ||
        stockQuantity < 0
      ) {
        return response.status(400).json({ error: "INVALID_INPUT" });
      }
      if (currency !== "XAF") {
        return response.status(400).json({ error: "UNSUPPORTED_CURRENCY", allowed: ["XAF"] });
      }

      let variante;
      try {
        variante = await prisma.varianteProduit.create({
          data: {
            productId: produit.id,
            sku,
            size,
            color,
            priceAmount,
            currency,
            stockQuantity,
            status: "ACTIVE",
          },
        });
      } catch (error) {
        if (error.code === "P2002") {
          return response.status(409).json({ error: "SKU_OR_COMBINATION_ALREADY_USED" });
        }
        throw error;
      }

      auditLog("variante.created", {
        byUserId: request.user.id,
        produitId: produit.id,
        varianteId: variante.id,
      });

      return response.status(201).json({ variante: publicVariante(variante) });
    },
  );

  router.patch(
    "/:id/variantes/:varianteId",
    authenticate,
    requireRole(...PRODUCT_ROLES),
    async (request, response) => {
      const variante = await prisma.varianteProduit.findUnique({
        where: { id: request.params.varianteId },
      });
      if (!variante || variante.productId !== request.params.id) {
        return response.status(404).json({ error: "NOT_FOUND" });
      }

      const { priceAmount, stockQuantity, status } = request.body ?? {};
      if (priceAmount !== undefined && (!Number.isInteger(priceAmount) || priceAmount < 0)) {
        return response.status(400).json({ error: "INVALID_PRICE" });
      }
      if (stockQuantity !== undefined && (!Number.isInteger(stockQuantity) || stockQuantity < 0)) {
        return response.status(400).json({ error: "INVALID_STOCK" });
      }
      const allowedStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"];
      if (status !== undefined && !allowedStatuses.includes(status)) {
        return response.status(400).json({ error: "INVALID_STATUS" });
      }

      const updated = await prisma.varianteProduit.update({
        where: { id: variante.id },
        data: {
          ...(priceAmount !== undefined ? { priceAmount } : {}),
          ...(stockQuantity !== undefined ? { stockQuantity } : {}),
          ...(status !== undefined ? { status } : {}),
        },
      });

      auditLog("variante.updated", {
        byUserId: request.user.id,
        varianteId: updated.id,
      });

      return response.status(200).json({ variante: publicVariante(updated) });
    },
  );

  return router;
}

module.exports = { createProduitsRouter };
