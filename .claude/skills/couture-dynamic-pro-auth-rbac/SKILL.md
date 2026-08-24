---
name: couture-dynamic-pro-auth-rbac
description: Implémente identité, sessions et RBAC C.D.P.
---

# Phase 3 — Authentification et RBAC

Couvrir les 4 acteurs : ADMIN, CLIENT, CONTENT_MANAGER, LOGISTICS. Inscription client, OAuth si validé, vérification email, activation des comptes internes par administrateur, sessions sécurisées, reset contrôlé et éventuellement MFA comme décision à valider. Appliquer RG1 et RG2 avec deny-by-default.

Critères : chaque endpoint sensible possède des tests autorisé/refusé, un client ne lit que ses données, le contenu n'accède pas aux paiements, la logistique ne voit que son périmètre, audit des actions sensibles.

Prompt de session : « Implémente la capacité d'auth/RBAC suivante, sans modifier le métier. Ajoute tests de matrice des rôles et liste les décisions sécurité restantes. »
