// Seed non sensible — données de développement uniquement.
//
// - Aucun secret réel : le "password_hash" est un marqueur explicite, pas un
//   hash bcrypt valide (l'authentification arrive en Phase 3).
// - "XXX" (ISO 4217 : "pas de devise") est utilisé pour currency tant que la
//   devise réelle n'est pas validée (voir GUIDE-VIBE-CODING.md) — ne jamais
//   traiter cette valeur comme une décision métier acquise.
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.utilisateur.upsert({
    where: { email: "admin@cdp-couture.dev" },
    update: {},
    create: {
      email: "admin@cdp-couture.dev",
      passwordHash: "SEED_FIXTURE_NOT_A_REAL_HASH",
      role: "ADMIN",
      status: "ACTIVE",
      firstName: "Admin",
      lastName: "C.D.P",
    },
  });

  const client = await prisma.utilisateur.upsert({
    where: { email: "client.demo@cdp-couture.dev" },
    update: {},
    create: {
      email: "client.demo@cdp-couture.dev",
      passwordHash: "SEED_FIXTURE_NOT_A_REAL_HASH",
      role: "CLIENT",
      status: "ACTIVE",
      firstName: "Client",
      lastName: "Démo",
      clientProfile: {
        create: {
          consentMarketing: false,
        },
      },
    },
  });

  const collection = await prisma.collection.upsert({
    where: { id: "seed-collection-ete-tropical" },
    update: {},
    create: {
      id: "seed-collection-ete-tropical",
      name: "Été Tropical",
      season: "Été",
      year: 2026,
      description: "Collection de démonstration (seed).",
      status: "PUBLISHED",
      createdBy: admin.id,
    },
  });

  const catalogue = await prisma.catalogue.upsert({
    where: { slug: "ete-tropical-2026" },
    update: {},
    create: {
      collectionId: collection.id,
      title: "Été Tropical 2026",
      slug: "ete-tropical-2026",
      description: "Catalogue de démonstration (seed).",
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdBy: admin.id,
      pages: {
        create: [
          { pageNumber: 1, imageUrl: "https://placehold.co/800x1200?text=Page+1" },
          { pageNumber: 2, imageUrl: "https://placehold.co/800x1200?text=Page+2" },
        ],
      },
    },
  });

  const produit = await prisma.produit.upsert({
    where: { slug: "robe-wax-ete" },
    update: {},
    create: {
      collectionId: collection.id,
      name: "Robe Wax Été",
      slug: "robe-wax-ete",
      description: "Produit de démonstration (seed).",
      category: "Robes",
      status: "ACTIVE",
      createdBy: admin.id,
      variantes: {
        create: [
          {
            sku: "ROBE-WAX-ETE-M-ROUGE",
            size: "M",
            color: "Rouge",
            priceAmount: 25000,
            currency: "XXX",
            stockQuantity: 5,
            status: "ACTIVE",
          },
        ],
      },
    },
  });

  console.log("Seed terminé :", {
    admin: admin.email,
    client: client.email,
    collection: collection.name,
    catalogue: catalogue.slug,
    produit: produit.slug,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
