# Guide de pilotage humain — Couture Dynamic Pro

## Démarrage

1. Valider `docs/CDC-CoutureDynamicPro-v1.2.md`, les 15 entités et les décisions ouvertes.
2. Installer Node.js, PostgreSQL/Prisma, Redis et les comptes Cloudinary, CinetPay, Stripe, Vercel et Railway.
3. Copier les variables d'environnement depuis un fichier exemple ; aucun secret dans Git.
4. Faire valider les wireframes Figma avant le code.

## Boucle de travail

Un prompt = une session = une intention = un commit. Le prompt cite la phase, les fichiers autorisés, les RG concernées, les critères d'acceptation et la commande de test. À la fin : diff relu, tests passés, décision métier notée.

## Portes qualité

- Fondations : build, lint, types et environnements reproductibles.
- Données : migration propre, contraintes, indexes, seed et revue ON DELETE.
- Auth/RBAC : tests positifs et négatifs pour les 4 acteurs.
- Métier : transitions commande, snapshots, prix serveur, webhooks idempotents.
- Front : responsive mobile-first, SEO/OG, accessibilité et états d'erreur.
- Spécialités : PDF, flipbook, QR, partage, paiements et chat observables.
- Tests : parcours achat et partage, sécurité, charge et PageSpeed cible ≥ 85.
- Production : rollback, sauvegardes, alertes et restauration testée.

## Tableau des décisions en attente

| Sujet | Décideur | Bloque | Statut |
|---|---|---|---|
| Devise | C.D.P | — | ✅ Résolu 26/08/2026 : XAF |
| Taxes et facturation | C.D.P / conseil | Commandes et paiements | Ouvert |
| Zones, tarifs et preuve de livraison | C.D.P | Checkout/logistique | Ouvert |
| Annulations, retours, remboursements | C.D.P / juridique | Paiements | Ouvert |
| Conservation, consentement et suppression | C.D.P / juridique | RGPD, analytics, chat | Ouvert |
| MFA et validation comptes internes | C.D.P | Auth/RBAC | Activation comptes internes déjà implémentée (Phase 3) ; MFA lui-même encore ouvert |
| Prestataires et comptes production | C.D.P | Déploiement | Ouvert |
| Contenu légal et 6 catalogues de lancement | C.D.P | Mise en production | Ouvert |

## Protocole de déblocage

Si une règle n'est pas claire, arrêter l'implémentation concernée, isoler la question, proposer au maximum deux options et demander une décision. Ne pas transformer une hypothèse en règle silencieuse.
