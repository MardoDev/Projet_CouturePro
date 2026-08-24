---
name: couture-dynamic-pro-backend-metier
description: Construit les API métier produits, catalogues et commandes C.D.P.
---

# Phase 4 — Backend métier

Créer les API REST versionnées pour collections, catalogues, pages, produits, variantes, paniers et commandes. Implémenter validation serveur, slugs stables, disponibilité, prix recalculés, snapshots et transitions RG3-RG9. Les paiements réels sont traités dans la phase spéciale avec webhooks vérifiés.

Critères : contrats OpenAPI ou équivalent, erreurs cohérentes, idempotence des opérations sensibles, tests d'intégration sur création/publication/panier/commande.

Prompt de session : « Implémente l'endpoint [nom] pour l'acteur [acteur], couvre RG[...], n'ajoute aucune règle non présente dans le CDC et teste les cas refusés. »
