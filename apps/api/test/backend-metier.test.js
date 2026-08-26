// Tests d'intégration Backend métier — Phase 4.
//
// Couvre : création/publication de catalogue (RG3, RG4), disponibilité et
// prix recalculés côté serveur (RG5, RG6), snapshot de commande (RG7),
// idempotence du checkout, transitions de statut (RG9), périmètre par rôle
// (RG2) sur des ressources réelles (contrairement à Phase 3, testé alors
// uniquement sur /api/admin/users).
//
// Nécessite une base migrée + Redis accessibles (voir README, docker-compose).
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createApp } = require("../src/app");
const { prisma } = require("../src/db/client");
const { redis } = require("../src/db/redis");
const { hashPassword } = require("../src/auth/password");

let server;
let baseUrl;
const createdUserIds = [];
const createdCollectionIds = [];

before(async () => {
  const app = createApp();
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  // Ordre imposé par les FK RESTRICT (RG12, voir docs/etude-merise.md) :
  // panier/commande/produit/catalogue référencent les utilisateurs ou
  // collections de test et doivent disparaître avant eux.
  await prisma.panier.deleteMany({ where: { userId: { in: createdUserIds } } }); // cascade ligne_panier
  await prisma.commande.deleteMany({ where: { userId: { in: createdUserIds } } }); // cascade ligne_commande
  await prisma.produit.deleteMany({ where: { createdBy: { in: createdUserIds } } }); // cascade variante_produit
  await prisma.catalogue.deleteMany({ where: { collectionId: { in: createdCollectionIds } } }); // cascade pages/partages
  await prisma.collection.deleteMany({ where: { id: { in: createdCollectionIds } } });
  await prisma.utilisateur.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
  redis.disconnect();
  server.close();
  server.closeAllConnections();
});

function unique(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function extractCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  return setCookie ? setCookie.split(";")[0] : null;
}

async function api(path, { method = "GET", body, cookie, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  return { status: response.status, body: json, cookie: extractCookie(response) };
}

async function createActiveUser(role) {
  const email = `${unique(role.toLowerCase())}@test.dev`;
  const user = await prisma.utilisateur.create({
    data: {
      email,
      passwordHash: await hashPassword("correct-horse-1"),
      role,
      status: "ACTIVE",
      firstName: "Test",
      lastName: role,
    },
  });
  createdUserIds.push(user.id);
  const login = await api("/api/auth/login", {
    method: "POST",
    body: { email, password: "correct-horse-1" },
  });
  assert.equal(login.status, 200);
  return { id: user.id, cookie: login.cookie };
}

async function makeCollection(adminCookie, overrides = {}) {
  const create = await api("/api/v1/collections", {
    method: "POST",
    body: { name: unique("Collection"), season: "Test", year: 2026, ...overrides },
    cookie: adminCookie,
  });
  assert.equal(create.status, 201);
  createdCollectionIds.push(create.body.collection.id);
  return create.body.collection;
}

async function makeActiveProduitWithStock(adminCookie, stockQuantity = 5) {
  const produitRes = await api("/api/v1/produits", {
    method: "POST",
    body: { name: unique("Produit"), category: "Test" },
    cookie: adminCookie,
  });
  assert.equal(produitRes.status, 201);
  const produit = produitRes.body.produit;

  const varianteRes = await api(`/api/v1/produits/${produit.id}/variantes`, {
    method: "POST",
    body: {
      sku: unique("SKU"),
      size: "M",
      color: "Bleu",
      priceAmount: 2000,
      currency: "XAF",
      stockQuantity,
    },
    cookie: adminCookie,
  });
  assert.equal(varianteRes.status, 201);

  const activate = await api(`/api/v1/produits/${produit.id}`, {
    method: "PATCH",
    body: { status: "ACTIVE" },
    cookie: adminCookie,
  });
  assert.equal(activate.status, 200);

  return { produit, variante: varianteRes.body.variante };
}

// --- Collections -------------------------------------------------------

test("collections — un client ne peut pas créer de collection", async () => {
  const client = await createActiveUser("CLIENT");
  const { status } = await api("/api/v1/collections", {
    method: "POST",
    body: { name: "X", season: "Test", year: 2026 },
    cookie: client.cookie,
  });
  assert.equal(status, 403);
});

test("collections — le public ne voit pas les brouillons, le staff si", async () => {
  const admin = await createActiveUser("ADMIN");
  const collection = await makeCollection(admin.cookie);

  const publicList = await api("/api/v1/collections");
  assert.equal(publicList.status, 200);
  assert.ok(!publicList.body.collections.some((c) => c.id === collection.id));

  const staffList = await api("/api/v1/collections", { cookie: admin.cookie });
  assert.ok(staffList.body.collections.some((c) => c.id === collection.id));
});

// --- Catalogues (RG3, RG4) ----------------------------------------------

test("catalogues — RG3 : publication refusée sans couverture/description/page", async () => {
  const admin = await createActiveUser("ADMIN");
  const collection = await makeCollection(admin.cookie);
  const create = await api("/api/v1/catalogues", {
    method: "POST",
    body: { collectionId: collection.id, title: unique("Catalogue") },
    cookie: admin.cookie,
  });
  assert.equal(create.status, 201);

  const publish = await api(`/api/v1/catalogues/${create.body.catalogue.id}`, {
    method: "PATCH",
    body: { status: "PUBLISHED" },
    cookie: admin.cookie,
  });
  assert.equal(publish.status, 400);
  assert.equal(publish.body.error, "NOT_PUBLISHABLE");
  assert.ok(publish.body.details.includes("AT_LEAST_ONE_PAGE_REQUIRED"));
});

test("catalogues — RG3/RG4 : publication réussie puis slug verrouillé", async () => {
  const admin = await createActiveUser("ADMIN");
  const collection = await makeCollection(admin.cookie);
  const create = await api("/api/v1/catalogues", {
    method: "POST",
    body: { collectionId: collection.id, title: unique("Catalogue") },
    cookie: admin.cookie,
  });
  const catalogueId = create.body.catalogue.id;

  await api(`/api/v1/catalogues/${catalogueId}/pages`, {
    method: "POST",
    body: { pageNumber: 1, imageUrl: "https://example.test/1.jpg" },
    cookie: admin.cookie,
  });

  const publish = await api(`/api/v1/catalogues/${catalogueId}`, {
    method: "PATCH",
    body: { status: "PUBLISHED", coverUrl: "https://example.test/cover.jpg", description: "Desc." },
    cookie: admin.cookie,
  });
  assert.equal(publish.status, 200);
  assert.equal(publish.body.catalogue.status, "PUBLISHED");

  const publicView = await api(`/api/v1/catalogues/${publish.body.catalogue.slug}`);
  assert.equal(publicView.status, 200);
  assert.equal(publicView.body.catalogue.pages.length, 1);

  const changeSlug = await api(`/api/v1/catalogues/${catalogueId}`, {
    method: "PATCH",
    body: { slug: "nouveau-slug" },
    cookie: admin.cookie,
  });
  assert.equal(changeSlug.status, 409);
  assert.equal(changeSlug.body.error, "SLUG_LOCKED_WHEN_PUBLISHED");
});

test("catalogues — RG4 : slug déjà utilisé refusé à la création", async () => {
  const admin = await createActiveUser("ADMIN");
  const collection = await makeCollection(admin.cookie);
  const slug = unique("slug-dup");
  const first = await api("/api/v1/catalogues", {
    method: "POST",
    body: { collectionId: collection.id, title: "A", slug },
    cookie: admin.cookie,
  });
  assert.equal(first.status, 201);

  const second = await api("/api/v1/catalogues", {
    method: "POST",
    body: { collectionId: collection.id, title: "B", slug },
    cookie: admin.cookie,
  });
  assert.equal(second.status, 409);
  assert.equal(second.body.error, "SLUG_ALREADY_USED");
});

// --- Produits / variantes (RG5) ------------------------------------------

test("produits — RG5 : passage à ACTIVE refusé sans variante active", async () => {
  const admin = await createActiveUser("ADMIN");
  const create = await api("/api/v1/produits", {
    method: "POST",
    body: { name: unique("Produit"), category: "Test" },
    cookie: admin.cookie,
  });
  const activate = await api(`/api/v1/produits/${create.body.produit.id}`, {
    method: "PATCH",
    body: { status: "ACTIVE" },
    cookie: admin.cookie,
  });
  assert.equal(activate.status, 400);
  assert.equal(activate.body.error, "NO_ACTIVE_VARIANT");
});

test("produits — un gestionnaire de contenu ne peut pas créer de produit (UC6 : ADMIN uniquement)", async () => {
  const contentManager = await createActiveUser("CONTENT_MANAGER");
  const { status } = await api("/api/v1/produits", {
    method: "POST",
    body: { name: "X", category: "Test" },
    cookie: contentManager.cookie,
  });
  assert.equal(status, 403);
});

test("produits — le public ne voit pas les variantes archivées d'un produit actif", async () => {
  const admin = await createActiveUser("ADMIN");
  const { produit, variante } = await makeActiveProduitWithStock(admin.cookie);

  await api(`/api/v1/produits/${produit.id}/variantes/${variante.id}`, {
    method: "PATCH",
    body: { status: "ARCHIVED" },
    cookie: admin.cookie,
  });

  const publicView = await api(`/api/v1/produits/${produit.slug}`);
  assert.equal(publicView.status, 200);
  assert.equal(publicView.body.produit.variantes.length, 0);
});

// --- Panier (RG6) ----------------------------------------------------------

test("panier — RG6 : le prix n'est jamais accepté du client, toujours recalculé", async () => {
  const admin = await createActiveUser("ADMIN");
  const client = await createActiveUser("CLIENT");
  const { variante } = await makeActiveProduitWithStock(admin.cookie, 5);

  const add = await api("/api/v1/panier/lignes", {
    method: "POST",
    body: { variantId: variante.id, quantity: 2, priceAmount: 1 }, // priceAmount ignoré
    cookie: client.cookie,
  });
  assert.equal(add.status, 200);
  const item = add.body.panier.items.find((i) => i.variantId === variante.id);
  assert.equal(item.unitPriceAmount, 2000);
  assert.equal(item.lineTotalAmount, 4000);
});

test("panier — RG6 : stock insuffisant refusé", async () => {
  const admin = await createActiveUser("ADMIN");
  const client = await createActiveUser("CLIENT");
  const { variante } = await makeActiveProduitWithStock(admin.cookie, 1);

  const { status, body } = await api("/api/v1/panier/lignes", {
    method: "POST",
    body: { variantId: variante.id, quantity: 5 },
    cookie: client.cookie,
  });
  assert.equal(status, 409);
  assert.equal(body.error, "INSUFFICIENT_STOCK");
});

test("panier — ajouter deux fois la même variante fusionne la quantité", async () => {
  const admin = await createActiveUser("ADMIN");
  const client = await createActiveUser("CLIENT");
  const { variante } = await makeActiveProduitWithStock(admin.cookie, 10);

  await api("/api/v1/panier/lignes", {
    method: "POST",
    body: { variantId: variante.id, quantity: 2 },
    cookie: client.cookie,
  });
  const second = await api("/api/v1/panier/lignes", {
    method: "POST",
    body: { variantId: variante.id, quantity: 3 },
    cookie: client.cookie,
  });
  const item = second.body.panier.items.find((i) => i.variantId === variante.id);
  assert.equal(item.quantity, 5);
});

// --- Commandes (RG7, RG9, idempotence) -------------------------------------

test("commandes — panier vide refusé", async () => {
  const client = await createActiveUser("CLIENT");
  const { status, body } = await api("/api/v1/commandes", {
    method: "POST",
    body: { shippingAddressJson: { line1: "1 rue Test" } },
    cookie: client.cookie,
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  assert.equal(status, 400);
  assert.equal(body.error, "EMPTY_CART");
});

test("commandes — Idempotency-Key requis", async () => {
  const client = await createActiveUser("CLIENT");
  const { status, body } = await api("/api/v1/commandes", {
    method: "POST",
    body: { shippingAddressJson: {} },
    cookie: client.cookie,
  });
  assert.equal(status, 400);
  assert.equal(body.error, "IDEMPOTENCY_KEY_REQUIRED");
});

test("commandes — RG7 : checkout crée un snapshot immuable, décrémente le stock, vide le panier ; rejouer la clé d'idempotence ne recrée pas de commande", async () => {
  const admin = await createActiveUser("ADMIN");
  const client = await createActiveUser("CLIENT");
  const { produit, variante } = await makeActiveProduitWithStock(admin.cookie, 5);

  await api("/api/v1/panier/lignes", {
    method: "POST",
    body: { variantId: variante.id, quantity: 2 },
    cookie: client.cookie,
  });

  const idempotencyKey = crypto.randomUUID();
  const checkout = await api("/api/v1/commandes", {
    method: "POST",
    body: { shippingAddressJson: { line1: "1 rue Test" } },
    cookie: client.cookie,
    headers: { "Idempotency-Key": idempotencyKey },
  });
  assert.equal(checkout.status, 201);
  assert.equal(checkout.body.commande.status, "RECEIVED");
  assert.equal(checkout.body.commande.totalAmount, 4000);
  assert.equal(checkout.body.commande.lignes[0].productNameSnapshot, produit.name);
  assert.equal(checkout.body.commande.lignes[0].skuSnapshot, variante.sku);

  const cartAfter = await api("/api/v1/panier", { cookie: client.cookie });
  assert.equal(cartAfter.body.panier.items.length, 0);

  const produitAfter = await api(`/api/v1/produits/${produit.slug}`, { cookie: admin.cookie });
  assert.equal(produitAfter.body.produit.variantes[0].stockQuantity, 3);

  const replay = await api("/api/v1/commandes", {
    method: "POST",
    body: { shippingAddressJson: { line1: "1 rue Test" } },
    cookie: client.cookie,
    headers: { "Idempotency-Key": idempotencyKey },
  });
  assert.equal(replay.status, 201);
  assert.equal(replay.body.commande.id, checkout.body.commande.id);

  const allOrders = await prisma.commande.count({ where: { userId: client.id } });
  assert.equal(allOrders, 1);
});

test("commandes — RG9 : transitions hors graphe refusées, périmètre logistique respecté", async () => {
  const admin = await createActiveUser("ADMIN");
  const logistics = await createActiveUser("LOGISTICS");
  const client = await createActiveUser("CLIENT");
  const { variante } = await makeActiveProduitWithStock(admin.cookie, 5);

  await api("/api/v1/panier/lignes", {
    method: "POST",
    body: { variantId: variante.id, quantity: 1 },
    cookie: client.cookie,
  });
  const checkout = await api("/api/v1/commandes", {
    method: "POST",
    body: { shippingAddressJson: {} },
    cookie: client.cookie,
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  const commandeId = checkout.body.commande.id;

  // Le client ne peut pas changer le statut.
  const asClient = await api(`/api/v1/commandes/${commandeId}/statut`, {
    method: "PATCH",
    body: { status: "PREPARING" },
    cookie: client.cookie,
  });
  assert.equal(asClient.status, 403);

  // La logistique ne peut pas sauter directement à DELIVERED depuis RECEIVED.
  const skip = await api(`/api/v1/commandes/${commandeId}/statut`, {
    method: "PATCH",
    body: { status: "DELIVERED" },
    cookie: logistics.cookie,
  });
  assert.equal(skip.status, 409);
  assert.equal(skip.body.error, "INVALID_TRANSITION");

  const toPreparing = await api(`/api/v1/commandes/${commandeId}/statut`, {
    method: "PATCH",
    body: { status: "PREPARING" },
    cookie: admin.cookie,
  });
  assert.equal(toPreparing.status, 200);

  const toShipped = await api(`/api/v1/commandes/${commandeId}/statut`, {
    method: "PATCH",
    body: { status: "SHIPPED" },
    cookie: logistics.cookie,
  });
  assert.equal(toShipped.status, 200);

  const toDelivered = await api(`/api/v1/commandes/${commandeId}/statut`, {
    method: "PATCH",
    body: { status: "DELIVERED" },
    cookie: logistics.cookie,
  });
  assert.equal(toDelivered.status, 200);
});

test("commandes — RG2 : un client ne voit pas la commande d'un autre (404, pas 403)", async () => {
  const admin = await createActiveUser("ADMIN");
  const clientA = await createActiveUser("CLIENT");
  const clientB = await createActiveUser("CLIENT");
  const { variante } = await makeActiveProduitWithStock(admin.cookie, 5);

  await api("/api/v1/panier/lignes", {
    method: "POST",
    body: { variantId: variante.id, quantity: 1 },
    cookie: clientA.cookie,
  });
  const checkout = await api("/api/v1/commandes", {
    method: "POST",
    body: { shippingAddressJson: {} },
    cookie: clientA.cookie,
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });

  const asOwner = await api(`/api/v1/commandes/${checkout.body.commande.id}`, { cookie: clientA.cookie });
  assert.equal(asOwner.status, 200);

  const asOther = await api(`/api/v1/commandes/${checkout.body.commande.id}`, { cookie: clientB.cookie });
  assert.equal(asOther.status, 404);

  const listOther = await api("/api/v1/commandes", { cookie: clientB.cookie });
  assert.ok(!listOther.body.commandes.some((c) => c.id === checkout.body.commande.id));
});
