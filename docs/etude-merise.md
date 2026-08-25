# Étude Merise — Couture Dynamic Pro

**Version :** 1.2 — dérivée du CDC v1.2  
**Compteurs de référence : 4 acteurs, 15 entités, 12 règles de gestion**

## 1. Acteurs

1. Administrateur / Propriétaire
2. Client / Acheteur
3. Gestionnaire de contenu
4. Opérateur logistique / Livreur

## 2. Entités du MCD

Les 15 entités sont : `UTILISATEUR`, `CLIENT_PROFILE`, `COLLECTION`, `CATALOGUE`, `CATALOGUE_PAGE`, `PRODUIT`, `VARIANTE_PRODUIT`, `PANIER`, `LIGNE_PANIER`, `COMMANDE`, `LIGNE_COMMANDE`, `PAIEMENT`, `CONVERSATION`, `MESSAGE`, `PARTAGE`.

## 3. MCD textuel

- `UTILISATEUR` 1,N `CLIENT_PROFILE` est en pratique 0,1 côté profil client ; un utilisateur de rôle CLIENT peut posséder un profil.
- `COLLECTION` 1,N `CATALOGUE` ; un catalogue appartient à une collection.
- `CATALOGUE` 1,N `CATALOGUE_PAGE` ; une page ne vit pas sans son catalogue.
- `COLLECTION` 0,N `PRODUIT` ; un produit peut être présenté dans une collection.
- `PRODUIT` 1,N `VARIANTE_PRODUIT` ; une variante porte taille, couleur, prix et stock.
- `UTILISATEUR` 1,1 `PANIER` actif ; un panier contient 0,N `LIGNE_PANIER`.
- `LIGNE_PANIER` N,1 `VARIANTE_PRODUIT`.
- `UTILISATEUR` 1,N `COMMANDE` ; une commande contient 1,N `LIGNE_COMMANDE`.
- `LIGNE_COMMANDE` N,1 `VARIANTE_PRODUIT` avec snapshot des attributs commerciaux.
- `COMMANDE` 1,N `PAIEMENT` pour tentatives et remboursements éventuels.
- `CONVERSATION` N,N `UTILISATEUR` est matérialisé par les participants applicatifs ; pour le MVP, le client et le personnel habilité sont référencés dans la conversation.
- `CONVERSATION` 1,N `MESSAGE`.
- `UTILISATEUR` 0,N `PARTAGE` et `CATALOGUE` 1,N `PARTAGE`.

## 4. MLD / schéma relationnel

```text
UTILISATEUR(id PK, email UQ, password_hash, role, status, first_name, last_name, email_verified_at NULL, email_verification_token_hash NULL, email_verification_expires_at NULL, password_reset_token_hash NULL, password_reset_expires_at NULL, created_at, updated_at)
CLIENT_PROFILE(id PK, user_id FK->UTILISATEUR.id UQ, phone, address_json, consent_marketing, created_at)
COLLECTION(id PK, name, season, year, description, status, cover_url, created_by FK->UTILISATEUR.id, created_at)
CATALOGUE(id PK, collection_id FK->COLLECTION.id, title, slug UQ, description, cover_url, status, published_at, pdf_url, qr_url, created_by FK->UTILISATEUR.id)
CATALOGUE_PAGE(id PK, catalogue_id FK->CATALOGUE.id, page_number, image_url, alt_text, UQ(catalogue_id,page_number))
PRODUIT(id PK, collection_id FK->COLLECTION.id NULL, name, slug UQ, description, category, status, created_by FK->UTILISATEUR.id)
VARIANTE_PRODUIT(id PK, product_id FK->PRODUIT.id, sku UQ, size, color, price_amount, currency, stock_quantity, status, UQ(product_id,size,color))
PANIER(id PK, user_id FK->UTILISATEUR.id UQ, status, updated_at)
LIGNE_PANIER(id PK, cart_id FK->PANIER.id, variant_id FK->VARIANTE_PRODUIT.id, quantity, UQ(cart_id,variant_id))
COMMANDE(id PK, user_id FK->UTILISATEUR.id, status, total_amount, currency, shipping_address_json, placed_at, updated_at)
LIGNE_COMMANDE(id PK, order_id FK->COMMANDE.id, variant_id FK->VARIANTE_PRODUIT.id NULL, product_name_snapshot, sku_snapshot, price_amount, quantity)
PAIEMENT(id PK, order_id FK->COMMANDE.id, provider, provider_reference UQ, status, amount, currency, raw_event_hash UQ NULL, paid_at)
CONVERSATION(id PK, client_id FK->UTILISATEUR.id, staff_id FK->UTILISATEUR.id NULL, status, created_at, updated_at)
MESSAGE(id PK, conversation_id FK->CONVERSATION.id, sender_id FK->UTILISATEUR.id, body, attachment_url NULL, sent_at, read_at NULL)
PARTAGE(id PK, catalogue_id FK->CATALOGUE.id, user_id FK->UTILISATEUR.id NULL, network, short_url NULL, created_at)
```

## 5. Matrice des clés étrangères et ON DELETE

| Source | Cible | Null | ON DELETE | Justification |
|---|---|---:|---|---|
| CLIENT_PROFILE.user_id | UTILISATEUR | non | CASCADE | Profil dépendant |
| COLLECTION.created_by | UTILISATEUR | non | RESTRICT | Historique d'auteur |
| CATALOGUE.collection_id | COLLECTION | non | RESTRICT | Catalogue publié à conserver |
| CATALOGUE.created_by | UTILISATEUR | non | RESTRICT | Traçabilité |
| CATALOGUE_PAGE.catalogue_id | CATALOGUE | non | CASCADE | Pages dépendantes |
| PRODUIT.collection_id | COLLECTION | oui | SET NULL | Produit réutilisable |
| PRODUIT.created_by | UTILISATEUR | non | RESTRICT | Traçabilité |
| VARIANTE_PRODUIT.product_id | PRODUIT | non | CASCADE | Variante dépendante |
| PANIER.user_id | UTILISATEUR | non | CASCADE | Panier privé |
| LIGNE_PANIER.cart_id | PANIER | non | CASCADE | Ligne dépendante |
| LIGNE_PANIER.variant_id | VARIANTE_PRODUIT | non | RESTRICT | Disponibilité à préserver |
| COMMANDE.user_id | UTILISATEUR | non | RESTRICT | Historique commercial |
| LIGNE_COMMANDE.order_id | COMMANDE | non | CASCADE | Ligne d'une commande |
| LIGNE_COMMANDE.variant_id | VARIANTE_PRODUIT | oui | SET NULL | Snapshot conservé si variante archivée |
| PAIEMENT.order_id | COMMANDE | non | CASCADE | Événements de la commande |
| CONVERSATION.client_id | UTILISATEUR | non | RESTRICT | Historique support |
| CONVERSATION.staff_id | UTILISATEUR | oui | SET NULL | Personnel remplaçable |
| MESSAGE.conversation_id | CONVERSATION | non | CASCADE | Message dépendant |
| MESSAGE.sender_id | UTILISATEUR | non | RESTRICT | Audit de l'auteur |
| PARTAGE.catalogue_id | CATALOGUE | non | CASCADE | Analytics du catalogue |
| PARTAGE.user_id | UTILISATEUR | oui | SET NULL | Partage anonyme possible |

## 6. Contraintes et règles

RG1 email unique insensible à la casse. RG2 rôle et statut contrôlés côté serveur. RG3 catalogue publiable complet. RG4 slug unique et redirection lors d'un changement. RG5 produit vendable avec variante active. RG6 quantité positive et prix recalculé serveur. RG7 snapshot de ligne de commande. RG8 paiement confirmé et idempotent. RG9 transitions de commande contrôlées. RG10 partage traçable avec minimisation. RG11 accès conversation restreint. RG12 archivage et conservation des commandes/paiements.

## 7. MOT — flux principaux

### Publication d'un catalogue

Administrateur ou gestionnaire autorisé saisit les métadonnées → API valide RG3/RG4 → médias envoyés à Cloudinary → pages enregistrées → PDF, QR et métadonnées OG générés → publication immédiate ou planifiée → PARTAGE et vues disponibles à l'analytics.

### Commande et paiement

Client sélectionne variante → panier valide RG5/RG6 → checkout crée commande et snapshots selon RG7 → prestataire reçoit l'intention → webhook signé vérifié selon RG8 → commande passe au statut autorisé RG9 → notification client.

### Partage

Client ou visiteur clique un réseau → API crée PARTAGE selon RG10 → réseau reçoit URL courte/URL canonique et OG → redirection vers CATALOGUE → compteur de vue incrémenté.

### Conversation

Client ouvre ou reprend une conversation → serveur Socket.IO vérifie RG11 → message persistant → notification au personnel habilité → lecture et présence synchronisées.

## 8. Dictionnaire minimal

| Attribut | Type | Contraintes |
|---|---|---|
| email | varchar | unique, non nul, normalisé |
| role | enum | ADMIN, CONTENT_MANAGER, CLIENT, LOGISTICS |
| status | enum | PENDING_EMAIL, PENDING_ADMIN, ACTIVE, SUSPENDED |
| slug | varchar | unique, URL-safe |
| price_amount | integer/bigint | montant en unité mineure, >= 0 |
| stock_quantity | integer | >= 0 |
| status catalogue | enum | DRAFT, SCHEDULED, PUBLISHED, ARCHIVED |
| status commande | enum | RECEIVED, PREPARING, SHIPPED, DELIVERED, CANCELLED, FAILED |
| status paiement | enum | INITIATED, PENDING, PAID, FAILED, REFUNDED |
| network | enum | WHATSAPP, FACEBOOK, INSTAGRAM, TWITTER_X, COPY |
| quantity | integer | > 0 |
| currency | char(3) | devise validée par C.D.P |

## 9. Décisions à valider

Cardinalité exacte des conversations multi-agents, devise et unité monétaire, stratégie de stock réservé pendant paiement, politique d'anonymisation, durée de conservation et règles de suppression. Ces décisions ne doivent pas être codées comme faits acquis.

## Historique

- v1.2.1 — 25 août 2026 : ajout à UTILISATEUR de 5 colonnes techniques
  (vérification email, réinitialisation de mot de passe) pour la Phase 3
  (auth-rbac). Ne change ni le nombre d'entités (15) ni les RG — précision
  technique, pas une règle métier nouvelle.
- v1.2 — 21 août 2026 : 15 entités, MLD, FK, ON DELETE, MOT et dictionnaire dérivés du CDC.
