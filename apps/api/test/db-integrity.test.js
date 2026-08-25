// Tests d'intégrité du schéma Prisma/PostgreSQL — Phase 2 (base de données).
//
// Portée : ce fichier vérifie uniquement ce que la base de données peut
// garantir structurellement (contraintes UNIQUE/CHECK, FK ON DELETE).
//   - RG1, RG4, RG5, RG6, RG7, RG8, RG12 : couverts ici.
//   - RG3 (catalogue publiable), RG9 (transitions de statut), RG11 (accès
//     conversation) : règles applicatives, hors portée d'une contrainte DB —
//     à tester en Phase 4 (backend-métier) / Phase 3 (auth-rbac).
//
// Nécessite une base migrée et accessible via DATABASE_URL
// (docker compose up -d && npm run db:migrate --workspace=couture-dynamic-pro-api).
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function unique(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

async function makeUser(role = "ADMIN") {
  return prisma.utilisateur.create({
    data: {
      email: `${unique("user")}@test.dev`,
      passwordHash: "TEST_FIXTURE_NOT_A_REAL_HASH",
      role,
      status: "ACTIVE",
      firstName: "Test",
      lastName: "Fixture",
    },
  });
}

async function makeProduitWithVariante(userId, overrides = {}) {
  return prisma.produit.create({
    data: {
      name: "Produit test",
      slug: unique("produit-test"),
      category: "Test",
      status: "ACTIVE",
      createdBy: userId,
      variantes: {
        create: [
          {
            sku: unique("SKU"),
            size: "M",
            color: "Bleu",
            priceAmount: 1000,
            currency: "XXX",
            stockQuantity: 3,
            status: "ACTIVE",
            ...overrides,
          },
        ],
      },
    },
    include: { variantes: true },
  });
}

before(async () => {
  await prisma.$connect();
});

after(async () => {
  await prisma.$disconnect();
});

test("RG1 — un email ne peut être stocké qu'en minuscules (contrainte CHECK)", async () => {
  const email = `${unique("rg1")}@Test.dev`;

  await assert.rejects(
    prisma.utilisateur.create({
      data: {
        email,
        passwordHash: "x",
        role: "CLIENT",
        status: "PENDING_EMAIL",
        firstName: "A",
        lastName: "B",
      },
    }),
    /email_lowercase_check/,
  );
});

test("RG1 — l'email est unique (insensible à la casse en pratique car normalisé en minuscules)", async () => {
  const email = `${unique("rg1-uq")}@test.dev`;
  const user = await prisma.utilisateur.create({
    data: {
      email,
      passwordHash: "x",
      role: "CLIENT",
      status: "PENDING_EMAIL",
      firstName: "A",
      lastName: "B",
    },
  });

  try {
    await assert.rejects(
      prisma.utilisateur.create({
        data: {
          email,
          passwordHash: "x",
          role: "CLIENT",
          status: "PENDING_EMAIL",
          firstName: "C",
          lastName: "D",
        },
      }),
      (error) => error.code === "P2002",
    );
  } finally {
    await prisma.utilisateur.delete({ where: { id: user.id } });
  }
});

test("RG4 — le slug d'un catalogue est unique", async () => {
  const user = await makeUser();
  const collection = await prisma.collection.create({
    data: {
      name: "Collection test",
      season: "Test",
      year: 2026,
      status: "DRAFT",
      createdBy: user.id,
    },
  });
  const slug = unique("slug-test");
  const catalogue = await prisma.catalogue.create({
    data: {
      collectionId: collection.id,
      title: "Catalogue test",
      slug,
      status: "DRAFT",
      createdBy: user.id,
    },
  });

  try {
    await assert.rejects(
      prisma.catalogue.create({
        data: {
          collectionId: collection.id,
          title: "Catalogue test 2",
          slug,
          status: "DRAFT",
          createdBy: user.id,
        },
      }),
      (error) => error.code === "P2002",
    );
  } finally {
    await prisma.catalogue.delete({ where: { id: catalogue.id } });
    await prisma.collection.delete({ where: { id: collection.id } });
    await prisma.utilisateur.delete({ where: { id: user.id } });
  }
});

test("RG5 — le prix d'une variante ne peut pas être négatif", async () => {
  const user = await makeUser();

  await assert.rejects(
    makeProduitWithVariante(user.id, { priceAmount: -100 }),
    /price_amount_check/,
  );

  await prisma.utilisateur.delete({ where: { id: user.id } });
});

test("RG5 — le stock d'une variante ne peut pas être négatif", async () => {
  const user = await makeUser();

  await assert.rejects(
    makeProduitWithVariante(user.id, { stockQuantity: -1 }),
    /stock_quantity_check/,
  );

  await prisma.utilisateur.delete({ where: { id: user.id } });
});

test("RG6 — la quantité d'une ligne de panier doit être strictement positive", async () => {
  const user = await makeUser();
  const produit = await makeProduitWithVariante(user.id);
  const panier = await prisma.panier.create({
    data: { userId: user.id, status: "ACTIVE" },
  });

  try {
    await assert.rejects(
      prisma.lignePanier.create({
        data: {
          cartId: panier.id,
          variantId: produit.variantes[0].id,
          quantity: 0,
        },
      }),
      /quantity_check/,
    );
  } finally {
    await prisma.panier.delete({ where: { id: panier.id } });
    await prisma.produit.delete({ where: { id: produit.id } });
    await prisma.utilisateur.delete({ where: { id: user.id } });
  }
});

test("RG7 — le snapshot d'une ligne de commande survit à la suppression de la variante", async () => {
  const user = await makeUser();
  const produit = await makeProduitWithVariante(user.id);
  const variant = produit.variantes[0];

  const commande = await prisma.commande.create({
    data: {
      userId: user.id,
      status: "RECEIVED",
      totalAmount: variant.priceAmount,
      currency: "XXX",
      shippingAddressJson: { note: "fixture de test" },
      lignes: {
        create: [
          {
            variantId: variant.id,
            productNameSnapshot: produit.name,
            skuSnapshot: variant.sku,
            priceAmount: variant.priceAmount,
            quantity: 1,
          },
        ],
      },
    },
    include: { lignes: true },
  });
  const ligneId = commande.lignes[0].id;

  try {
    // Suppression directe de la variante : chemin de secours DB (ON DELETE
    // SET NULL). En usage normal (Phase 4), l'application archive la
    // variante au lieu de la supprimer (RG12) — ce test prouve que même en
    // cas de suppression, l'historique de commande n'est pas corrompu.
    await prisma.varianteProduit.delete({ where: { id: variant.id } });

    const ligne = await prisma.ligneCommande.findUniqueOrThrow({ where: { id: ligneId } });
    assert.equal(ligne.variantId, null);
    assert.equal(ligne.productNameSnapshot, produit.name);
    assert.equal(ligne.skuSnapshot, variant.sku);
    assert.equal(ligne.priceAmount, variant.priceAmount);
    assert.equal(ligne.quantity, 1);
  } finally {
    await prisma.ligneCommande.deleteMany({ where: { orderId: commande.id } });
    await prisma.commande.delete({ where: { id: commande.id } });
    await prisma.produit.delete({ where: { id: produit.id } });
    await prisma.utilisateur.delete({ where: { id: user.id } });
  }
});

test("RG8 — un événement de paiement (raw_event_hash) ne peut pas être traité deux fois", async () => {
  const user = await makeUser();
  const commandeA = await prisma.commande.create({
    data: {
      userId: user.id,
      status: "RECEIVED",
      totalAmount: 1000,
      currency: "XXX",
      shippingAddressJson: {},
    },
  });
  const commandeB = await prisma.commande.create({
    data: {
      userId: user.id,
      status: "RECEIVED",
      totalAmount: 1000,
      currency: "XXX",
      shippingAddressJson: {},
    },
  });
  const rawEventHash = unique("evt");

  const paiement = await prisma.paiement.create({
    data: {
      orderId: commandeA.id,
      provider: "CINETPAY",
      providerReference: unique("ref"),
      status: "PAID",
      amount: 1000,
      currency: "XXX",
      rawEventHash,
    },
  });

  try {
    await assert.rejects(
      prisma.paiement.create({
        data: {
          orderId: commandeB.id,
          provider: "CINETPAY",
          providerReference: unique("ref"),
          status: "PAID",
          amount: 1000,
          currency: "XXX",
          rawEventHash, // webhook rejoué : même événement, doit être rejeté
        },
      }),
      (error) => error.code === "P2002",
    );
  } finally {
    await prisma.paiement.delete({ where: { id: paiement.id } });
    await prisma.commande.deleteMany({ where: { id: { in: [commandeA.id, commandeB.id] } } });
    await prisma.utilisateur.delete({ where: { id: user.id } });
  }
});

test("RG12 — une collection référencée par un catalogue ne peut pas être supprimée (archivage requis)", async () => {
  const user = await makeUser();
  const collection = await prisma.collection.create({
    data: {
      name: "Collection protégée",
      season: "Test",
      year: 2026,
      status: "PUBLISHED",
      createdBy: user.id,
    },
  });
  const catalogue = await prisma.catalogue.create({
    data: {
      collectionId: collection.id,
      title: "Catalogue protégé",
      slug: unique("slug-protege"),
      status: "PUBLISHED",
      createdBy: user.id,
    },
  });

  try {
    await assert.rejects(
      prisma.collection.delete({ where: { id: collection.id } }),
      (error) => error.code === "P2003",
    );
  } finally {
    await prisma.catalogue.delete({ where: { id: catalogue.id } });
    await prisma.collection.delete({ where: { id: collection.id } });
    await prisma.utilisateur.delete({ where: { id: user.id } });
  }
});

test("RG12 — un utilisateur auteur d'une collection ne peut pas être supprimé (traçabilité)", async () => {
  const user = await makeUser();
  const collection = await prisma.collection.create({
    data: {
      name: "Collection tracée",
      season: "Test",
      year: 2026,
      status: "DRAFT",
      createdBy: user.id,
    },
  });

  try {
    await assert.rejects(
      prisma.utilisateur.delete({ where: { id: user.id } }),
      (error) => error.code === "P2003",
    );
  } finally {
    await prisma.collection.delete({ where: { id: collection.id } });
    await prisma.utilisateur.delete({ where: { id: user.id } });
  }
});

test("RG10 — supprimer un catalogue supprime ses pages et ses partages en cascade (analytics dépendants)", async () => {
  const user = await makeUser();
  const collection = await prisma.collection.create({
    data: {
      name: "Collection cascade",
      season: "Test",
      year: 2026,
      status: "DRAFT",
      createdBy: user.id,
    },
  });
  const catalogue = await prisma.catalogue.create({
    data: {
      collectionId: collection.id,
      title: "Catalogue cascade",
      slug: unique("slug-cascade"),
      status: "DRAFT",
      createdBy: user.id,
      pages: { create: [{ pageNumber: 1, imageUrl: "https://example.test/1.jpg" }] },
      partages: { create: [{ network: "COPY" }] },
    },
  });

  await prisma.catalogue.delete({ where: { id: catalogue.id } });

  const pages = await prisma.cataloguePage.findMany({ where: { catalogueId: catalogue.id } });
  const partages = await prisma.partage.findMany({ where: { catalogueId: catalogue.id } });
  assert.equal(pages.length, 0);
  assert.equal(partages.length, 0);

  await prisma.collection.delete({ where: { id: collection.id } });
  await prisma.utilisateur.delete({ where: { id: user.id } });
});
