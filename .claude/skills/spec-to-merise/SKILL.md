---
name: spec-to-merise
description: Transforme la spécification fonctionnelle d'un projet (acteurs, entités, cas d'usage, règles de gestion) en une étude de base de données Merise complète — MCD, MLD, schéma relationnel avec clés étrangères et règles ON DELETE, MOT des processus, dictionnaire de données. Fonctionne pour n'importe quel domaine logiciel. Déclenche-toi quand l'utilisateur veut "modéliser la base de données", "produire l'étude Merise", "concevoir le schéma relationnel", "passer du cahier des charges au modèle de données", ou quand le skill project-blueprint-generator délègue l'étape modèle de données. Produit un document réutilisable, embarquable dans un skill de phase base de données.
---

# Spécification → étude Merise

Ce skill produit le document de modélisation de données d'un projet, à partir
de sa spécification fonctionnelle. Il est indépendant du domaine : la méthode
est la même pour une pharmacie, une banque ou un ERP.

## Entrées attendues

- La liste des **acteurs** (rôles utilisateurs) et leur hiérarchie.
- Les **entités métier** évoquées dans les fonctionnalités (ce que le système
  manipule : commandes, dossiers, produits, transactions…).
- Les **cas d'usage** clés (qui fait quoi, dans quel ordre).
- Les **règles de gestion** numérotées (RG…), surtout celles qui portent des
  contraintes de données (unicité, cardinalité, cascade, minimisation).

Si l'une manque, la reconstituer depuis le CDC ou la demander — ne pas
deviner une cardinalité ou une clé étrangère structurante.

## Production

### 1. MCD — Modèle Conceptuel de Données

- Généralisation/spécialisation des acteurs : un supertype commun
  (UTILISATEUR) et des sous-types par rôle, quand les rôles partagent
  identité et authentification. C'est un patron robuste et réutilisable.
- Entités principales hors acteurs, avec leurs attributs conceptuels.
- Associations et cardinalités (0,N / 1,N / 1,1), chacune justifiée par un
  cas d'usage ou une règle de gestion.

### 2. MLD — Schéma relationnel

- Une relation par entité et par association porteuse de données.
- Notation explicite : `TABLE (id, attribut, …, #clé_étrangère)`.
- Chaque clé étrangère précise sa table cible, sa nullabilité et son
  comportement **ON DELETE** (CASCADE / SET NULL / RESTRICT), justifié :
  une donnée dont la disparition doit entraîner celle des filles →
  CASCADE ; une référence optionnelle → SET NULL ; une référence dont la
  suppression doit être empêchée tant qu'elle est utilisée → RESTRICT.
- Contraintes d'unicité et CHECK issues des règles de gestion.

### 3. Matrice des relations entre tables

Un tableau récapitulatif : pour chaque clé étrangère, la table source, la
table cible, la nullabilité, la règle ON DELETE et la règle de gestion
associée. C'est l'outil de revue qui révèle les incohérences.

### 4. MOT — Modèle Organisationnel des Traitements

Un processus par flux métier majeur (création de compte, transaction,
livraison…), décrit en étapes acteur → action → règle appliquée. Le MOT
relie le modèle de données aux cas d'usage.

### 5. Dictionnaire de données

Chaque attribut : nom, type, contrainte, description. Sert de contrat pour
l'implémentation des entités.

## Patrons réutilisables (indépendants du domaine)

- **Acteur polymorphe** (une entité liée à plusieurs types de bénéficiaires :
  colonne discriminante `type_xxx` + FK nullables + CHECK d'exclusivité).
  Utile pour évaluations, paiements, retraits liés à des acteurs variés.
- **Entité de jonction** pour les associations N,N porteuses de données
  (dates, statuts) plutôt qu'une simple table de liaison.
- **Statuts par énumération** explicites (EN_ATTENTE / VALIDE / …) plutôt que
  des booléens qui se multiplient.
- **Journalisation** (AUDIT_LOG) des actions sensibles, reliée à l'acteur.
- **Paramètres configurables** (une table clé/valeur avec bornes) plutôt que
  des constantes en dur, dès qu'une valeur métier peut changer.

## Sortie

- Un document Markdown structuré (les sections ci-dessus), convertible en
  docx/PDF.
- Ce document est destiné à être **embarqué dans le skill de la phase base de
  données** (references/etude-merise.md) pour que l'agent de dev l'ait sous
  la main pendant l'implémentation.

## Cohérence

Le nombre d'entités du MLD doit correspondre à ce qu'annoncent le CDC et le
CLAUDE.md. À chaque évolution, mettre à jour le schéma **et** les compteurs
partout, et conserver un bloc d'historique des versions en tête (ce qui a
changé, quand, pourquoi) plutôt que d'écraser silencieusement.
