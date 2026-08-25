-- RG3 — catalogue publiable : un catalogue publié possède une couverture et
-- une description (title/slug sont déjà NOT NULL au niveau colonne, donc
-- toujours garantis, y compris en DRAFT).
--
-- Portée volontairement partielle : la condition "au moins une page ou un
-- média valide" du RG3 ne peut pas s'exprimer dans un CHECK sur une seule
-- table (PostgreSQL n'autorise pas de sous-requête vers catalogue_page dans
-- un CHECK). Cette partie reste une validation applicative à implémenter en
-- Phase 4 (backend-métier), au moment de la transition vers PUBLISHED.
ALTER TABLE "catalogue" ADD CONSTRAINT "catalogue_publiable_check" CHECK (
  "status" <> 'PUBLISHED'::"CatalogueStatus"
  OR (
    "cover_url" IS NOT NULL AND length(trim("cover_url")) > 0
    AND "description" IS NOT NULL AND length(trim("description")) > 0
  )
);
