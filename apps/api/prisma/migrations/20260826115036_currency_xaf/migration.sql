-- AlterTable
ALTER TABLE "commande" ALTER COLUMN "currency" SET DEFAULT 'XAF';

-- AlterTable
ALTER TABLE "paiement" ALTER COLUMN "currency" SET DEFAULT 'XAF';

-- AlterTable
ALTER TABLE "variante_produit" ALTER COLUMN "currency" SET DEFAULT 'XAF';

-- CheckConstraint : devise validée par C.D.P le 26/08/2026 = XAF uniquement.
-- Une seule devise en usage (pas de multi-devise, V2 non anticipée).
ALTER TABLE "variante_produit" ADD CONSTRAINT "variante_produit_currency_xaf_check" CHECK ("currency" = 'XAF');
ALTER TABLE "commande" ADD CONSTRAINT "commande_currency_xaf_check" CHECK ("currency" = 'XAF');
ALTER TABLE "paiement" ADD CONSTRAINT "paiement_currency_xaf_check" CHECK ("currency" = 'XAF');
