# Cahier des charges — Couture Dynamic Pro

**Version :** 1.2 — blueprint généré à partir de `CDC_CoutureDynamicPro_v1.1.docx`  
**Statut :** Draft pour validation client  
**Porteur :** Couture Dynamic Pro (C.D.P), Pointe-Noire, République du Congo  
**Slogan :** Votre Style Chic  
**Confidentialité :** Document confidentiel — usage interne

## 0. Profil et hypothèses à valider

C.D.P veut vendre ses créations en ligne, présenter ses collections sous forme de cartes-catalogues partageables et faciliter le contact direct avec ses clients.

- Stack imposée par le CDC : Next.js 14 + TypeScript, Tailwind CSS + shadcn/ui, Node.js + Express, PostgreSQL + Prisma, Socket.IO + Redis, Cloudinary, CinetPay + Stripe, Vercel + Railway.
- Charte : `#E8A898` rose pêche, `#C97D6A` pêche foncé, `#C9A46A` doré chaud, `#FDF6F0` ivoire crème, Georgia pour les titres et Calibri pour le corps.
- Déploiement cible : front Vercel, API Railway, PostgreSQL managé, stockage média Cloudinary, domaine `cdp-couture.com`.
- Durée cible : 5 à 6 mois, puis maintenance continue.
- Hypothèses à valider : devise et fiscalité exactes, zones et tarifs de livraison, politique d'annulation/remboursement, conservation des données, responsable légal du traitement, modalités de validation des comptes internes, contrat et disponibilité des prestataires de paiement.
- Les fonctions V2 (fidélité, sur-mesure guidé, ventes flash, mobile React Native, recommandations IA, 3D) sont hors MVP et ne doivent pas être implémentées par défaut.

**Compteurs de référence : 4 acteurs, 15 entités, 12 règles de gestion.**

## 1. Objectifs et périmètre

### Objectifs

1. Mettre en ligne une boutique de prêt-à-porter et de créations exclusives.
2. Publier des collections via des catalogues consultables, téléchargeables et partageables.
3. Générer des aperçus sociaux Open Graph et des QR codes par catalogue.
4. Permettre panier, commande, paiement et suivi de commande.
5. Donner à C.D.P un back-office pour produits, catalogues, commandes, contenus et indicateurs.
6. Offrir un chat client-couturier et un formulaire de devis sur mesure.

### Périmètre MVP

Accueil, catalogue et recherche, fiche produit, six premiers catalogues, page catalogue avec flipbook et PDF, partage WhatsApp/Facebook et copie de lien, QR code, contact/devis, SEO, responsive, authentification client, panier, commande, CinetPay, back-office produits/catalogues/commandes.

### Périmètre palier 2

Stripe, chat temps réel, blog, avis, analytics détaillés des partages et tableau de bord enrichi.

### Hors périmètre initial

Fidélité, ventes flash, prise de mesures guidée, application mobile, recommandations IA et visualisation 3D.

## 2. Acteurs et comptes

| Acteur | Responsabilités |
|---|---|
| Administrateur / Propriétaire | Paramètres, comptes internes, produits, collections, catalogues, commandes, promotions, analytics et réponses client |
| Client / Acheteur | Consultation, partage, panier, commande, paiement, suivi, chat, devis |
| Gestionnaire de contenu | Articles, contenus éditoriaux, planification et statistiques des catalogues |
| Opérateur logistique / Livreur | Préparation, expédition et mise à jour de livraison ; acteur prévu pour une évolution future |

### Hiérarchie et matrice de création

| Compte créé | Créateur | Validation | Statut initial |
|---|---|---|---|
| Client | Client lui-même par inscription ou OAuth | Vérification email ; règles anti-fraude à valider | `PENDING_EMAIL` |
| Gestionnaire de contenu | Administrateur | Administrateur | `PENDING_ADMIN` |
| Opérateur logistique | Administrateur | Administrateur | `PENDING_ADMIN` |
| Administrateur | Hors application ou administrateur principal désigné par C.D.P | Décision humaine à formaliser | `PENDING_ADMIN` |

## 3. Cas d'utilisation clés

- **UC1 — Découvrir les collections (Client → système) :** consulter l'accueil, filtrer les catalogues, ouvrir une collection, voir ses produits et métadonnées SEO.
- **UC2 — Partager un catalogue (Client → système) :** cliquer Partager, choisir WhatsApp/Facebook/Instagram/Twitter-X ou copier le lien, enregistrer l'événement et confirmer l'action.
- **UC3 — Consulter un flipbook/PDF (Client → système) :** ouvrir le catalogue, feuilleter ou demander le PDF, enregistrer vue et téléchargement.
- **UC4 — Gérer le panier (Client → système) :** choisir une variante, ajouter ou modifier une ligne, vérifier disponibilité et total.
- **UC5 — Passer commande (Client → système) :** s'authentifier, renseigner livraison, confirmer le récapitulatif, initier le paiement, recevoir le statut.
- **UC6 — Gérer un produit (Administrateur → système) :** créer, modifier, archiver produit et variantes, contrôler prix, stock et médias.
- **UC7 — Publier un catalogue (Administrateur ou Gestionnaire de contenu → système) :** saisir titre, saison, description, tags, couverture, pages, date de publication et générer slug, OG, PDF et QR.
- **UC8 — Traiter une commande (Administrateur ou Opérateur logistique → système) :** recevoir, préparer, expédier, livrer ou signaler un incident selon les habilitations.
- **UC9 — Répondre au client (Administrateur → système) :** ouvrir une conversation, lire, répondre, gérer présence et notifications.
- **UC10 — Administrer le contenu (Gestionnaire de contenu → système) :** créer, planifier, publier et dépublier un article ou catalogue autorisé.
- **UC11 — Suivre la performance (Administrateur ou Gestionnaire de contenu → système) :** consulter vues, PDF, flipbook, partages par réseau et conversions.
- **UC12 — Demander un devis (Client → système) :** envoyer une demande structurée et poursuivre l'échange par chat ou contact.

## 4. Interfaces

**Public/client :** accueil, catalogues, catalogue individuel, catalogue produits, fiche produit, panier, checkout en trois étapes, connexion/inscription, espace client, blog, contact/devis, chat.

**Administration :** tableau de bord KPI, produits/variantes, collections/catalogues/pages, commandes, clients, conversations, contenus, statistiques, paramètres et rôles.

**Logistique future :** file des commandes assignées, détail de préparation, expédition, preuve de livraison et incidents.

## 5. RBAC, sécurité et conformité

RBAC deny-by-default. Le client ne lit et ne modifie que ses ressources. Le gestionnaire de contenu n'accède pas aux paiements ni aux données client non nécessaires. L'opérateur logistique ne voit que les commandes nécessaires à la livraison. L'administrateur dispose des opérations métier, sans contourner les journaux d'audit.

Mots de passe hachés, sessions sécurisées, MFA administrateur à décider, validation d'entrée, protection CSRF/CORS, rate limiting, secrets hors dépôt, webhooks de paiement signés et idempotents, journalisation des actions sensibles, sauvegardes chiffrées. Le responsable juridique doit valider RGPD ou régime local applicable, consentement newsletter/cookies, conservation, suppression, transfert hors Congo, CGV, prix, facturation, paiement et remboursement.

## 6. Règles de gestion

- **RG1 — Unicité d'identité :** l'email d'un utilisateur est unique, insensible à la casse.
- **RG2 — Accès par rôle :** toute action protégée exige un compte actif et le rôle autorisé ; les rôles internes sont activés par l'administrateur.
- **RG3 — Catalogue publiable :** un catalogue publié possède un titre, un slug unique, une couverture, une description et au moins une page ou un média valide.
- **RG4 — Slug stable :** le slug est lisible et unique ; une modification ne casse pas les liens existants sans redirection validée.
- **RG5 — Produit vendable :** un produit actif possède au moins une variante active avec prix non négatif ; le stock et la disponibilité suivent la variante.
- **RG6 — Panier :** une ligne de panier référence une variante et la quantité est strictement positive ; le prix affiché est recalculé côté serveur.
- **RG7 — Commande immuable :** après confirmation, les lignes conservent un instantané du produit, de la variante, du prix et de la quantité.
- **RG8 — Paiement :** une commande ne devient payée qu'après confirmation vérifiée du prestataire ; les callbacks répétés sont idempotents.
- **RG9 — Statuts de commande :** les transitions autorisées sont `RECEIVED → PREPARING → SHIPPED → DELIVERED`, avec `CANCELLED` ou `FAILED` selon validation métier.
- **RG10 — Partage traçable :** chaque partage enregistre catalogue, réseau, date et contexte minimal sans collecter de données sociales non nécessaires.
- **RG11 — Messages privés :** seuls les participants autorisés et les administrateurs habilités accèdent à une conversation ; les pièces jointes sont contrôlées.
- **RG12 — Suppression référentielle :** les données de commande et paiement sont conservées selon la politique validée ; la suppression d'un produit/catalogue utilisé est un archivage, pas une suppression destructive.

## 7. Données

Le modèle de référence comporte **15 entités** : `UTILISATEUR`, `CLIENT_PROFILE`, `COLLECTION`, `CATALOGUE`, `CATALOGUE_PAGE`, `PRODUIT`, `VARIANTE_PRODUIT`, `PANIER`, `LIGNE_PANIER`, `COMMANDE`, `LIGNE_COMMANDE`, `PAIEMENT`, `CONVERSATION`, `MESSAGE`, `PARTAGE`. Tous les livrables doivent utiliser ce compteur.

L'étude complète se trouve dans `docs/etude-merise.md` et devient la référence de la phase base de données.

## 8. Modèle économique

Vente de produits et créations sur mesure. Les frais de livraison, commissions de paiement, fiscalité, retours et éventuels acomptes sur mesure restent des décisions métier à valider avant implémentation.

## 9. Déploiement et planning

Phase 1 conception : 2 semaines. Phase 2 back-end : 4 semaines. Phase 3 front-end : 5 semaines. Phase 4 tests/recette : 2 semaines. Phase 5 production : 1 semaine. Phase 6 maintenance continue. Objectif qualité : PageSpeed ≥ 85, tests de parcours achat/partage, charge et UAT.

CI/CD avec migrations contrôlées, environnements séparés, DNS/SSL, monitoring erreurs et disponibilité, alertes paiements/webhooks, sauvegardes PostgreSQL et plan de restauration testé.

## 10. Décisions attendues avant production

Devise et taxes, zones de livraison, annulation/remboursement, validation des comptes internes, MFA, politique de conservation et suppression, consentements marketing, prestataires définitivement retenus, SLA support, contenu légal et six catalogues de lancement.

## Historique

- v1.2 — 21 août 2026 : enrichissement blueprint, règles RG1–RG12, RBAC, matrice de comptes, modèle de données et décisions à valider.
- v1.1 — juin 2026 : CDC source fourni par C.D.P.
