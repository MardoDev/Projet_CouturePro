---
name: couture-dynamic-pro-orchestrateur
description: Orchestre les phases de construction de Couture Dynamic Pro.
---

# Orchestrateur C.D.P

Références obligatoires : `CLAUDE.md`, `docs/CDC-CoutureDynamicPro-v1.2.md`, `docs/etude-merise.md`.

Avant chaque tâche, identifier la phase, les acteurs concernés, les entités parmi les 15 et les RG parmi RG1-RG12. Ne jamais ouvrir une phase si sa porte qualité précédente n'est pas verte.

Ordre : fondations → base-donnees → auth-rbac → backend-metier → frontend-public → dashboards → fonctionnalites-speciales → tests → deploiement.

Format de sortie d'une session : fichiers modifiés, RG couvertes, tests exécutés, décisions métier bloquantes, prochaine petite tâche. Arrêter sur toute ambiguïté de paiement, livraison, suppression ou conformité.
