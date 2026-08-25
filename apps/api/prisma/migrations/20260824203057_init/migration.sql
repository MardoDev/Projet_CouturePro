-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CONTENT_MANAGER', 'CLIENT', 'LOGISTICS');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_EMAIL', 'PENDING_ADMIN', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CatalogueStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CatalogItemStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('CINETPAY', 'STRIPE');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ShareNetwork" AS ENUM ('WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'TWITTER_X', 'COPY');

-- CreateTable
CREATE TABLE "utilisateur" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_profile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phone" TEXT,
    "address_json" JSONB,
    "consent_marketing" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "description" TEXT,
    "status" "CatalogueStatus" NOT NULL,
    "cover_url" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogue" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "cover_url" TEXT,
    "status" "CatalogueStatus" NOT NULL,
    "published_at" TIMESTAMP(3),
    "pdf_url" TEXT,
    "qr_url" TEXT,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "catalogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogue_page" (
    "id" TEXT NOT NULL,
    "catalogue_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "alt_text" TEXT,

    CONSTRAINT "catalogue_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produit" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "status" "CatalogItemStatus" NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variante_produit" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "price_amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "stock_quantity" INTEGER NOT NULL,
    "status" "CatalogItemStatus" NOT NULL,

    CONSTRAINT "variante_produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panier" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "CartStatus" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "panier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ligne_panier" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ligne_panier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commande" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "shipping_address_json" JSONB NOT NULL,
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ligne_commande" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "product_name_snapshot" TEXT NOT NULL,
    "sku_snapshot" TEXT NOT NULL,
    "price_amount" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ligne_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiement" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_reference" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "raw_event_hash" TEXT,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "staff_id" TEXT,
    "status" "ConversationStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachment_url" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partage" (
    "id" TEXT NOT NULL,
    "catalogue_id" TEXT NOT NULL,
    "user_id" TEXT,
    "network" "ShareNetwork" NOT NULL,
    "short_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE INDEX "utilisateur_role_status_idx" ON "utilisateur"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "client_profile_user_id_key" ON "client_profile"("user_id");

-- CreateIndex
CREATE INDEX "collection_created_by_idx" ON "collection"("created_by");

-- CreateIndex
CREATE INDEX "collection_status_idx" ON "collection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "catalogue_slug_key" ON "catalogue"("slug");

-- CreateIndex
CREATE INDEX "catalogue_collection_id_idx" ON "catalogue"("collection_id");

-- CreateIndex
CREATE INDEX "catalogue_created_by_idx" ON "catalogue"("created_by");

-- CreateIndex
CREATE INDEX "catalogue_status_idx" ON "catalogue"("status");

-- CreateIndex
CREATE UNIQUE INDEX "catalogue_page_catalogue_id_page_number_key" ON "catalogue_page"("catalogue_id", "page_number");

-- CreateIndex
CREATE UNIQUE INDEX "produit_slug_key" ON "produit"("slug");

-- CreateIndex
CREATE INDEX "produit_collection_id_idx" ON "produit"("collection_id");

-- CreateIndex
CREATE INDEX "produit_created_by_idx" ON "produit"("created_by");

-- CreateIndex
CREATE INDEX "produit_status_idx" ON "produit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "variante_produit_sku_key" ON "variante_produit"("sku");

-- CreateIndex
CREATE INDEX "variante_produit_status_idx" ON "variante_produit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "variante_produit_product_id_size_color_key" ON "variante_produit"("product_id", "size", "color");

-- CreateIndex
CREATE UNIQUE INDEX "panier_user_id_key" ON "panier"("user_id");

-- CreateIndex
CREATE INDEX "ligne_panier_variant_id_idx" ON "ligne_panier"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "ligne_panier_cart_id_variant_id_key" ON "ligne_panier"("cart_id", "variant_id");

-- CreateIndex
CREATE INDEX "commande_user_id_idx" ON "commande"("user_id");

-- CreateIndex
CREATE INDEX "commande_status_idx" ON "commande"("status");

-- CreateIndex
CREATE INDEX "ligne_commande_order_id_idx" ON "ligne_commande"("order_id");

-- CreateIndex
CREATE INDEX "ligne_commande_variant_id_idx" ON "ligne_commande"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "paiement_provider_reference_key" ON "paiement"("provider_reference");

-- CreateIndex
CREATE UNIQUE INDEX "paiement_raw_event_hash_key" ON "paiement"("raw_event_hash");

-- CreateIndex
CREATE INDEX "paiement_order_id_idx" ON "paiement"("order_id");

-- CreateIndex
CREATE INDEX "paiement_status_idx" ON "paiement"("status");

-- CreateIndex
CREATE INDEX "conversation_client_id_idx" ON "conversation"("client_id");

-- CreateIndex
CREATE INDEX "conversation_staff_id_idx" ON "conversation"("staff_id");

-- CreateIndex
CREATE INDEX "message_conversation_id_idx" ON "message"("conversation_id");

-- CreateIndex
CREATE INDEX "message_sender_id_idx" ON "message"("sender_id");

-- CreateIndex
CREATE INDEX "partage_catalogue_id_idx" ON "partage"("catalogue_id");

-- CreateIndex
CREATE INDEX "partage_user_id_idx" ON "partage"("user_id");

-- AddForeignKey
ALTER TABLE "client_profile" ADD CONSTRAINT "client_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection" ADD CONSTRAINT "collection_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogue" ADD CONSTRAINT "catalogue_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogue" ADD CONSTRAINT "catalogue_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogue_page" ADD CONSTRAINT "catalogue_page_catalogue_id_fkey" FOREIGN KEY ("catalogue_id") REFERENCES "catalogue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit" ADD CONSTRAINT "produit_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit" ADD CONSTRAINT "produit_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variante_produit" ADD CONSTRAINT "variante_produit_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panier" ADD CONSTRAINT "panier_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_panier" ADD CONSTRAINT "ligne_panier_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "panier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_panier" ADD CONSTRAINT "ligne_panier_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variante_produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande" ADD CONSTRAINT "commande_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_commande" ADD CONSTRAINT "ligne_commande_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_commande" ADD CONSTRAINT "ligne_commande_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variante_produit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiement" ADD CONSTRAINT "paiement_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partage" ADD CONSTRAINT "partage_catalogue_id_fkey" FOREIGN KEY ("catalogue_id") REFERENCES "catalogue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partage" ADD CONSTRAINT "partage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraint (contraintes non exprimables nativement dans schema.prisma)

-- RG1 : unicité d'email insensible à la casse. L'index unique Postgres est
-- sensible à la casse ; cette contrainte force le stockage en minuscules,
-- ce qui rend l'unicité de fait insensible à la casse. La normalisation
-- (lower()) doit aussi être appliquée côté application (Phase 3).
ALTER TABLE "utilisateur" ADD CONSTRAINT "utilisateur_email_lowercase_check" CHECK ("email" = lower("email"));

-- RG5 : produit vendable avec prix non négatif.
ALTER TABLE "variante_produit" ADD CONSTRAINT "variante_produit_price_amount_check" CHECK ("price_amount" >= 0);
-- RG5 : stock non négatif.
ALTER TABLE "variante_produit" ADD CONSTRAINT "variante_produit_stock_quantity_check" CHECK ("stock_quantity" >= 0);

-- RG6 : quantité de panier strictement positive.
ALTER TABLE "ligne_panier" ADD CONSTRAINT "ligne_panier_quantity_check" CHECK ("quantity" > 0);

-- RG6/RG7 : montant total de commande non négatif.
ALTER TABLE "commande" ADD CONSTRAINT "commande_total_amount_check" CHECK ("total_amount" >= 0);

-- RG7 : ligne de commande — prix snapshot non négatif, quantité strictement positive.
ALTER TABLE "ligne_commande" ADD CONSTRAINT "ligne_commande_price_amount_check" CHECK ("price_amount" >= 0);
ALTER TABLE "ligne_commande" ADD CONSTRAINT "ligne_commande_quantity_check" CHECK ("quantity" > 0);

-- RG8 : montant de paiement non négatif.
ALTER TABLE "paiement" ADD CONSTRAINT "paiement_amount_check" CHECK ("amount" >= 0);
