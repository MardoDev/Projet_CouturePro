const express = require("express");
const { prisma } = require("../../db/client");
const { authenticate, requireRole } = require("../../middleware/auth");

async function getOrCreateActiveCart(userId) {
  const existing = await prisma.panier.findUnique({ where: { userId } });
  if (existing) {
    return existing;
  }
  return prisma.panier.create({ data: { userId, status: "ACTIVE" } });
}

/// RG6 — le prix affiché est recalculé côté serveur : ligne_panier ne
/// stocke aucun prix (voir MLD), il est toujours dérivé en direct de la
/// variante au moment de la lecture.
async function serializeCart(cart) {
  const lignes = await prisma.lignePanier.findMany({
    where: { cartId: cart.id },
    include: { variante: { include: { produit: true } } },
  });

  const items = lignes.map((ligne) => ({
    id: ligne.id,
    variantId: ligne.variantId,
    quantity: ligne.quantity,
    produitName: ligne.variante.produit.name,
    sku: ligne.variante.sku,
    size: ligne.variante.size,
    color: ligne.variante.color,
    unitPriceAmount: ligne.variante.priceAmount,
    currency: ligne.variante.currency,
    lineTotalAmount: ligne.variante.priceAmount * ligne.quantity,
    variantStatus: ligne.variante.status,
    availableStock: ligne.variante.stockQuantity,
  }));

  const currencies = new Set(items.map((item) => item.currency));

  return {
    id: cart.id,
    status: cart.status,
    items,
    totalAmount: items.reduce((sum, item) => sum + item.lineTotalAmount, 0),
    currency: currencies.size === 1 ? [...currencies][0] : null,
    currencyConflict: currencies.size > 1,
  };
}

function createPanierRouter() {
  const router = express.Router();

  router.use(authenticate, requireRole("CLIENT"));

  router.get("/", async (request, response) => {
    const cart = await getOrCreateActiveCart(request.user.id);
    return response.status(200).json({ panier: await serializeCart(cart) });
  });

  // RG6 — quantité strictement positive (contrainte DB) et disponibilité
  // vérifiée côté serveur (jamais fait confiance au client).
  router.post("/lignes", async (request, response) => {
    const { variantId, quantity } = request.body ?? {};
    if (!variantId || !Number.isInteger(quantity) || quantity < 1) {
      return response.status(400).json({ error: "INVALID_INPUT" });
    }

    const variante = await prisma.varianteProduit.findUnique({ where: { id: variantId } });
    if (!variante || variante.status !== "ACTIVE") {
      return response.status(400).json({ error: "VARIANT_NOT_AVAILABLE" });
    }

    const cart = await getOrCreateActiveCart(request.user.id);
    const existingLine = await prisma.lignePanier.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });
    const desiredQuantity = (existingLine?.quantity ?? 0) + quantity;

    if (desiredQuantity > variante.stockQuantity) {
      return response.status(409).json({
        error: "INSUFFICIENT_STOCK",
        availableStock: variante.stockQuantity,
      });
    }

    if (existingLine) {
      await prisma.lignePanier.update({
        where: { id: existingLine.id },
        data: { quantity: desiredQuantity },
      });
    } else {
      await prisma.lignePanier.create({
        data: { cartId: cart.id, variantId, quantity: desiredQuantity },
      });
    }

    return response.status(200).json({ panier: await serializeCart(cart) });
  });

  router.patch("/lignes/:ligneId", async (request, response) => {
    const { quantity } = request.body ?? {};
    if (!Number.isInteger(quantity) || quantity < 1) {
      return response.status(400).json({ error: "INVALID_INPUT" });
    }

    const cart = await getOrCreateActiveCart(request.user.id);
    const ligne = await prisma.lignePanier.findUnique({
      where: { id: request.params.ligneId },
      include: { variante: true },
    });
    if (!ligne || ligne.cartId !== cart.id) {
      return response.status(404).json({ error: "NOT_FOUND" });
    }
    if (quantity > ligne.variante.stockQuantity) {
      return response.status(409).json({
        error: "INSUFFICIENT_STOCK",
        availableStock: ligne.variante.stockQuantity,
      });
    }

    await prisma.lignePanier.update({ where: { id: ligne.id }, data: { quantity } });

    return response.status(200).json({ panier: await serializeCart(cart) });
  });

  router.delete("/lignes/:ligneId", async (request, response) => {
    const cart = await getOrCreateActiveCart(request.user.id);
    const ligne = await prisma.lignePanier.findUnique({ where: { id: request.params.ligneId } });
    if (!ligne || ligne.cartId !== cart.id) {
      return response.status(404).json({ error: "NOT_FOUND" });
    }

    await prisma.lignePanier.delete({ where: { id: ligne.id } });

    return response.status(200).json({ panier: await serializeCart(cart) });
  });

  return router;
}

module.exports = { createPanierRouter, getOrCreateActiveCart, serializeCart };
