---
name: couture-dynamic-pro-base-de-donnees
description: Implémente le MLD PostgreSQL/Prisma de C.D.P.
---

# Phase 2 — Base de données

Utiliser exclusivement `docs/etude-merise.md`. Implémenter les 15 entités, enums, contraintes, indexes et FK avec ON DELETE documentés. Préserver les snapshots de commande et l'archivage RG12. Ajouter migration, seed non sensible et tests d'intégrité.

Critères : MLD et Prisma concordants, RG1/RG3-RG7/RG10-RG12 testées, migration réversible en environnement de travail, aucune suppression destructive implicite.

Prompt de session : « Implémente uniquement le schéma et les migrations des entités [liste]. Référence les RG touchées et fournis les tests de contraintes. »
