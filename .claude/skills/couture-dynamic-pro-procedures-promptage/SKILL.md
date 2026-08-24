---
name: couture-dynamic-pro-procedures-promptage
description: Fournit les procédures de prompts et de sessions C.D.P.
---

# Procédures de promptage

## Prompt de construction

Contexte : phase et références. Objectif : une capacité. Acteur : rôle. Entités : liste. Règles : RG. Contraintes : fichiers autorisés et interdits. Acceptation : comportement observable. Validation : commandes. Questions : décisions métier bloquantes.

## Prompt de correction

Décrire reproduction, attendu, observé, logs/test, surface autorisée et non-régression. Corriger la cause racine dans la même tranche et relancer le test ciblé.

## Prompt de revue

Chercher d'abord bugs, régressions, fuites de données, permissions, idempotence, contraintes DB et absence de tests. Référencer fichier et comportement, puis proposer le plus petit correctif.

## Fin de session

Rapporter diff, RG couvertes, tests, limites, décisions à valider et prochain prompt. Ne pas commencer une deuxième fonctionnalité dans la même session.
