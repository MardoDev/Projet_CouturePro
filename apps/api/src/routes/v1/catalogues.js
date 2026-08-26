const express = require("express");
const { prisma } = require("../../db/client");
const { authenticate, requireRole, optionalAuthenticate } = require("../../middleware/auth");
const { auditLog } = require("../../auth/audit");
const { slugify } = require("../../lib/slug");
const { isStaff, CONTENT_ROLES } = require("./collections");

function publicCatalogue(catalogue) {
  return {
    id: catalogue.id,
    collectionId: catalogue.collectionId,
    title: catalogue.title,
    slug: catalogue.slug,
    description: catalogue.description,
    coverUrl: catalogue.coverUrl,
    status: catalogue.status,
    publishedAt: catalogue.publishedAt,
    pdfUrl: catalogue.pdfUrl,
    qrUrl: catalogue.qrUrl,
    pages: catalogue.pages
      ? catalogue.pages
          .slice()
          .sort((a, b) => a.pageNumber - b.pageNumber)
          .map((page) => ({
            id: page.id,
            pageNumber: page.pageNumber,
            imageUrl: page.imageUrl,
            altText: page.altText,
          }))
      : undefined,
  };
}

/// RG3 — partie applicative non exprimable en CHECK single-table (voir
/// migration catalogue_publiable_check) : au moins une page. Le reste
/// (couverture + description) est déjà garanti par la contrainte DB ; il
/// est revérifié ici pour renvoyer une erreur 400 lisible plutôt qu'une
/// erreur DB brute.
function publicationErrors(catalogue, pageCount) {
  const errors = [];
  if (!catalogue.coverUrl || catalogue.coverUrl.trim().length === 0) {
    errors.push("MISSING_COVER_URL");
  }
  if (!catalogue.description || catalogue.description.trim().length === 0) {
    errors.push("MISSING_DESCRIPTION");
  }
  if (pageCount < 1) {
    errors.push("AT_LEAST_ONE_PAGE_REQUIRED");
  }
  return errors;
}

function createCataloguesRouter() {
  const router = express.Router();

  router.get("/", optionalAuthenticate, async (request, response) => {
    const where = isStaff(request.user) ? {} : { status: "PUBLISHED" };
    const catalogues = await prisma.catalogue.findMany({
      where,
      orderBy: { publishedAt: "desc" },
    });
    return response.status(200).json({ catalogues: catalogues.map(publicCatalogue) });
  });

  router.get("/:slug", optionalAuthenticate, async (request, response) => {
    const catalogue = await prisma.catalogue.findUnique({
      where: { slug: request.params.slug },
      include: { pages: true },
    });
    if (!catalogue) {
      return response.status(404).json({ error: "NOT_FOUND" });
    }
    if (catalogue.status !== "PUBLISHED" && !isStaff(request.user)) {
      return response.status(404).json({ error: "NOT_FOUND" });
    }
    return response.status(200).json({ catalogue: publicCatalogue(catalogue) });
  });

  router.post("/", authenticate, requireRole(...CONTENT_ROLES), async (request, response) => {
    const { collectionId, title, description, coverUrl } = request.body ?? {};
    let { slug } = request.body ?? {};

    if (!collectionId || !title) {
      return response.status(400).json({ error: "INVALID_INPUT" });
    }

    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) {
      return response.status(400).json({ error: "COLLECTION_NOT_FOUND" });
    }

    slug = slug ? slugify(slug) : slugify(title);
    if (!slug) {
      return response.status(400).json({ error: "INVALID_SLUG" });
    }

    let catalogue;
    try {
      catalogue = await prisma.catalogue.create({
        data: {
          collectionId,
          title,
          slug,
          description: description ?? null,
          coverUrl: coverUrl ?? null,
          status: "DRAFT",
          createdBy: request.user.id,
        },
      });
    } catch (error) {
      if (error.code === "P2002") {
        return response.status(409).json({ error: "SLUG_ALREADY_USED" });
      }
      throw error;
    }

    auditLog("catalogue.created", { byUserId: request.user.id, catalogueId: catalogue.id });

    return response.status(201).json({ catalogue: publicCatalogue(catalogue) });
  });

  router.patch("/:id", authenticate, requireRole(...CONTENT_ROLES), async (request, response) => {
    const existing = await prisma.catalogue.findUnique({
      where: { id: request.params.id },
      include: { pages: true },
    });
    if (!existing) {
      return response.status(404).json({ error: "NOT_FOUND" });
    }

    const { title, description, coverUrl, status } = request.body ?? {};
    let { slug } = request.body ?? {};

    // RG4 — slug stable : pas de changement de slug une fois publié.
    if (slug !== undefined && existing.status === "PUBLISHED") {
      return response.status(409).json({ error: "SLUG_LOCKED_WHEN_PUBLISHED" });
    }
    if (slug !== undefined) {
      slug = slugify(slug);
      if (!slug) {
        return response.status(400).json({ error: "INVALID_SLUG" });
      }
    }

    const allowedStatuses = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return response.status(400).json({ error: "INVALID_STATUS" });
    }

    // RG3 — vérifié avant écriture pour une erreur 400 lisible (la
    // contrainte DB reste le filet de sécurité final, cf. migration
    // catalogue_publiable_check).
    if (status === "PUBLISHED") {
      const merged = {
        coverUrl: coverUrl !== undefined ? coverUrl : existing.coverUrl,
        description: description !== undefined ? description : existing.description,
      };
      const errors = publicationErrors(merged, existing.pages.length);
      if (errors.length > 0) {
        return response.status(400).json({ error: "NOT_PUBLISHABLE", details: errors });
      }
    }

    let catalogue;
    try {
      catalogue = await prisma.catalogue.update({
        where: { id: existing.id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(coverUrl !== undefined ? { coverUrl } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(status === "PUBLISHED" && existing.status !== "PUBLISHED"
            ? { publishedAt: new Date() }
            : {}),
        },
      });
    } catch (error) {
      if (error.code === "P2002") {
        return response.status(409).json({ error: "SLUG_ALREADY_USED" });
      }
      throw error;
    }

    auditLog("catalogue.updated", {
      byUserId: request.user.id,
      catalogueId: catalogue.id,
      status: catalogue.status,
    });

    return response.status(200).json({ catalogue: publicCatalogue({ ...catalogue, pages: existing.pages }) });
  });

  router.post(
    "/:id/pages",
    authenticate,
    requireRole(...CONTENT_ROLES),
    async (request, response) => {
      const catalogue = await prisma.catalogue.findUnique({ where: { id: request.params.id } });
      if (!catalogue) {
        return response.status(404).json({ error: "NOT_FOUND" });
      }

      const { pageNumber, imageUrl, altText } = request.body ?? {};
      if (!Number.isInteger(pageNumber) || pageNumber < 1 || !imageUrl) {
        return response.status(400).json({ error: "INVALID_INPUT" });
      }

      let page;
      try {
        page = await prisma.cataloguePage.create({
          data: { catalogueId: catalogue.id, pageNumber, imageUrl, altText: altText ?? null },
        });
      } catch (error) {
        if (error.code === "P2002") {
          return response.status(409).json({ error: "PAGE_NUMBER_ALREADY_USED" });
        }
        throw error;
      }

      auditLog("catalogue.page_added", {
        byUserId: request.user.id,
        catalogueId: catalogue.id,
        pageId: page.id,
      });

      return response.status(201).json({
        page: { id: page.id, pageNumber: page.pageNumber, imageUrl: page.imageUrl, altText: page.altText },
      });
    },
  );

  router.delete(
    "/:id/pages/:pageId",
    authenticate,
    requireRole(...CONTENT_ROLES),
    async (request, response) => {
      const page = await prisma.cataloguePage.findUnique({ where: { id: request.params.pageId } });
      if (!page || page.catalogueId !== request.params.id) {
        return response.status(404).json({ error: "NOT_FOUND" });
      }

      await prisma.cataloguePage.delete({ where: { id: page.id } });

      auditLog("catalogue.page_removed", {
        byUserId: request.user.id,
        catalogueId: request.params.id,
        pageId: page.id,
      });

      return response.status(204).send();
    },
  );

  return router;
}

module.exports = { createCataloguesRouter };
