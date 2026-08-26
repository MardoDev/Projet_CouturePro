const express = require("express");
const { prisma } = require("../../db/client");
const { authenticate, requireRole } = require("../../middleware/auth");
const { idempotent } = require("../../middleware/idempotency");
const { auditLog } = require("../../auth/audit");
const { getOrCreateActiveCart } = require("./panier");

// RG9 — transitions autorisées. FAILED n'apparaît pas ici : c'est un état
// déclenché par un échec de paiement (webhook, Phase 7), pas une action
// manuelle de cet endpoint.
const ADMIN_TRANSITIONS = {
  RECEIVED: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
};
// RG2 — périmètre logistique : uniquement les actions d'expédition.
const LOGISTICS_TRANSITIONS = {
  PREPARING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
};

function publicCommande(commande) {
  return {
    id: commande.id,
    status: commande.status,
    totalAmount: commande.totalAmount,
    currency: commande.currency,
    shippingAddressJson: commande.shippingAddressJson,
    placedAt: commande.placedAt,
    lignes: (commande.lignes ?? []).map((ligne) => ({
      id: ligne.id,
      variantId: ligne.variantId,
      productNameSnapshot: ligne.productNameSnapshot,
      skuSnapshot: ligne.skuSnapshot,
      priceAmount: ligne.priceAmount,
      quantity: ligne.quantity,
    })),
  };
}

function createCommandesRouter() {
  const router = express.Router();

  router.use(authenticate);

  // RG6/RG7 — checkout : disponibilité vérifiée et stock décrémenté
  // atomiquement, snapshot immuable capturé au moment de l'achat. Aucun
  // paiement n'est initié ici (Phase 7, avec webhooks vérifiés, RG8).
  router.post("/", requireRole("CLIENT"), idempotent(), async (request, response) => {
    const { shippingAddressJson } = request.body ?? {};
    if (!shippingAddressJson || typeof shippingAddressJson !== "object") {
      return response.status(400).json({ error: "SHIPPING_ADDRESS_REQUIRED" });
    }

    const cart = await getOrCreateActiveCart(request.user.id);
    const lignes = await prisma.lignePanier.findMany({
      where: { cartId: cart.id },
      include: { variante: { include: { produit: true } } },
    });

    if (lignes.length === 0) {
      return response.status(400).json({ error: "EMPTY_CART" });
    }

    const unavailable = lignes.find((ligne) => ligne.variante.status !== "ACTIVE");
    if (unavailable) {
      return response.status(409).json({ error: "VARIANT_NOT_AVAILABLE", variantId: unavailable.variantId });
    }

    const currencies = new Set(lignes.map((ligne) => ligne.variante.currency));
    if (currencies.size > 1) {
      return response.status(409).json({ error: "CURRENCY_CONFLICT" });
    }

    try {
      const commande = await prisma.$transaction(async (tx) => {
        // Décrément atomique conditionné au stock disponible : évite la
        // survente en cas de requêtes concurrentes (pas de verrou explicite
        // nécessaire, la condition WHERE porte la garantie).
        for (const ligne of lignes) {
          const result = await tx.varianteProduit.updateMany({
            where: { id: ligne.variantId, stockQuantity: { gte: ligne.quantity } },
            data: { stockQuantity: { decrement: ligne.quantity } },
          });
          if (result.count === 0) {
            const error = new Error("INSUFFICIENT_STOCK");
            error.code = "INSUFFICIENT_STOCK";
            error.variantId = ligne.variantId;
            throw error;
          }
        }

        const totalAmount = lignes.reduce(
          (sum, ligne) => sum + ligne.variante.priceAmount * ligne.quantity,
          0,
        );

        const created = await tx.commande.create({
          data: {
            userId: request.user.id,
            status: "RECEIVED",
            totalAmount,
            currency: [...currencies][0],
            shippingAddressJson,
            lignes: {
              create: lignes.map((ligne) => ({
                variantId: ligne.variantId,
                productNameSnapshot: ligne.variante.produit.name,
                skuSnapshot: ligne.variante.sku,
                priceAmount: ligne.variante.priceAmount,
                quantity: ligne.quantity,
              })),
            },
          },
          include: { lignes: true },
        });

        await tx.lignePanier.deleteMany({ where: { cartId: cart.id } });

        return created;
      });

      auditLog("commande.created", { byUserId: request.user.id, commandeId: commande.id });

      return response.status(201).json({ commande: publicCommande(commande) });
    } catch (error) {
      if (error.code === "INSUFFICIENT_STOCK") {
        return response.status(409).json({ error: "INSUFFICIENT_STOCK", variantId: error.variantId });
      }
      throw error;
    }
  });

  // RG2 — un client ne voit que ses commandes ; la logistique ne voit que
  // son périmètre (commandes en préparation/expédition) ; l'admin voit tout.
  router.get("/", async (request, response) => {
    let where;
    if (request.user.role === "CLIENT") {
      where = { userId: request.user.id };
    } else if (request.user.role === "LOGISTICS") {
      where = { status: { in: ["PREPARING", "SHIPPED"] } };
    } else if (request.user.role === "ADMIN") {
      const { status } = request.query ?? {};
      where = status ? { status } : {};
    } else {
      return response.status(403).json({ error: "FORBIDDEN" });
    }

    const commandes = await prisma.commande.findMany({
      where,
      include: { lignes: true },
      orderBy: { placedAt: "desc" },
    });
    return response.status(200).json({ commandes: commandes.map(publicCommande) });
  });

  router.get("/:id", async (request, response) => {
    const commande = await prisma.commande.findUnique({
      where: { id: request.params.id },
      include: { lignes: true },
    });
    if (!commande) {
      return response.status(404).json({ error: "NOT_FOUND" });
    }

    const visible =
      request.user.role === "ADMIN" ||
      (request.user.role === "CLIENT" && commande.userId === request.user.id) ||
      (request.user.role === "LOGISTICS" && ["PREPARING", "SHIPPED"].includes(commande.status));
    if (!visible) {
      // 404 et non 403 : ne pas confirmer l'existence d'une commande hors périmètre.
      return response.status(404).json({ error: "NOT_FOUND" });
    }

    return response.status(200).json({ commande: publicCommande(commande) });
  });

  router.patch(
    "/:id/statut",
    requireRole("ADMIN", "LOGISTICS"),
    async (request, response) => {
      const commande = await prisma.commande.findUnique({ where: { id: request.params.id } });
      if (!commande) {
        return response.status(404).json({ error: "NOT_FOUND" });
      }

      const { status } = request.body ?? {};
      const transitions =
        request.user.role === "ADMIN" ? ADMIN_TRANSITIONS : LOGISTICS_TRANSITIONS;
      const allowedTargets = transitions[commande.status] ?? [];

      if (!status || !allowedTargets.includes(status)) {
        return response.status(409).json({
          error: "INVALID_TRANSITION",
          from: commande.status,
          allowed: allowedTargets,
        });
      }

      const updated = await prisma.commande.update({
        where: { id: commande.id },
        data: { status },
        include: { lignes: true },
      });

      auditLog("commande.status_changed", {
        byUserId: request.user.id,
        commandeId: updated.id,
        from: commande.status,
        to: status,
      });

      return response.status(200).json({ commande: publicCommande(updated) });
    },
  );

  return router;
}

module.exports = { createCommandesRouter };
