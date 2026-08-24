---
name: vibe-coding-pack-builder
description: Construit un pack complet de skills de vibe-coding par phases pour piloter un agent de développement (type Claude Code) du premier commit au déploiement, pour n'importe quel projet logiciel. Génère les skills de fondations, base de données, authentification/RBAC, backend métier, frontend, dashboards, fonctionnalités spéciales, tests, déploiement, plus l'orchestrateur, le contexte-projet, l'audit fonctionnel et les procédures de promptage — chacun paramétré par le profil du projet et contenant des prompts prêts à copier. Déclenche-toi quand l'utilisateur veut "générer les skills de développement", "créer le pack de vibe-coding", "produire les prompts par phase", ou quand project-blueprint-generator délègue l'étape des skills. Fonctionne dans Claude Code et Claude.ai.
---

# Constructeur de pack de vibe-coding

Ce skill génère le pack de skills qui pilote la construction d'un projet,
phase par phase, prompt par prompt. Il est agnostique du domaine : la
structure des phases est universelle pour une application web/mobile
moderne ; seul le contenu se paramètre.

## Structure du pack produit

Un dossier par skill, chacun avec un `SKILL.md` (front-matter + corps) :

```
<projet>-contexte-projet/          ← référence permanente (stack, charte, acteurs, règles)
<projet>-orchestrateur/            ← feuille de route, ordre des phases, portes de qualité
<projet>-procedures-promptage/     ← règle d'or, checklist, recadrage, déblocage
<projet>-phase0-fondations/        ← monorepo, outillage, CI de base, SPEC-UI wireframe
<projet>-phase1-base-de-donnees/   ← entités, migrations, seeds, ERD (+ references/etude-merise.md)
<projet>-phase2-auth-securite/     ← login, 2FA, RBAC, matrice de création, chiffrement
<projet>-phase3-backend-metier/    ← un prompt par module fonctionnel
<projet>-phase4-frontend-public/   ← layout, pages publiques, PWA
<projet>-phase5-dashboards/        ← un dashboard par rôle (references/ par rôle)
<projet>-phase6-fonctionnalites-speciales/ ← IA, notifications, intégrations…
<projet>-phase7-tests-qualite/     ← Jest/Cypress/k6, un test de rejet par règle RGxx
<projet>-phase8-deploiement-monitoring/    ← CI/CD, Docker prod, monitoring, sauvegardes
<projet>-audit-fonctionnel/        ← vérifier que chaque UC du CDC est couvert
```

Adapter : retirer une phase sans objet (pas de dashboards → fusionner),
ajouter une phase propre au domaine si nécessaire. Ne pas produire de skill
vide pour respecter un gabarit.

## Règles de rédaction d'un SKILL.md

### Le front-matter décide de l'activation

Claude Code et Claude.ai chargent un skill par correspondance entre la
requête et sa **description**. La description doit donc être riche en
déclencheurs concrets : verbes d'action, noms des livrables, situations.
Une bonne description dit *quand* se déclencher, pas seulement *quoi* le
skill contient.

### Préfixer tous les noms par le projet

`<projet>-phase1-...` et non `phase1-...`. Un nom générique **remplacerait
silencieusement** un skill intégré de l'agent. Le préfixe protège.

### Le corps contient des prompts prêts à copier

Chaque phase expose ses prompts sous forme de blocs ``` copiables, numérotés
`Prompt X.Y`. Un prompt = une intention = une session de travail = un commit.
Chaque prompt rappelle les règles de gestion (RGxx) qu'il doit respecter et
demande un test qui prouve le **rejet** du cas interdit.

### Embarquer les références lourdes

Le schéma de données, les chartes détaillées, les specs par rôle vont dans
`references/*.md` du skill concerné, pas dans le corps du SKILL.md (qui doit
rester scannable). L'agent les charge à l'ouverture du skill.

## Les invariants à injecter dans chaque pack

Quel que soit le domaine, ces principes se retrouvent dans le
contexte-projet et les procédures :

- **Un prompt = une session = un commit.** Sessions courtes, contexte propre.
- **Vérifier ce qui doit échouer**, pas seulement ce qui doit marcher : après
  tout prompt touchant un rôle, un test de rejet (403) sur l'API.
- **Ne jamais réécrire un fichier entier** : diff visible avant application.
- **Les portes de qualité ne se franchissent pas en rouge** : build vert,
  tests au vert, aucun rôle hors périmètre, avant de passer à la phase
  suivante.
- **Journal de bord** : une entrée par session.
- **Décision technique ≠ décision métier** : la seconde revient à l'humain.

## Procédure de génération

1. Recevoir le profil projet (du skill project-blueprint-generator ou de
   l'utilisateur) et l'étude Merise (du skill spec-to-merise).
2. Générer `contexte-projet` d'abord : il porte les faits que tous les
   autres référencent.
3. Générer l'`orchestrateur` : ordre des phases, durées, portes de sortie.
4. Générer les skills de phase, en peuplant les prompts à partir des
   fonctionnalités du CDC et des entités de la Merise.
5. Générer `procedures-promptage` et `audit-fonctionnel`.
6. Valider chaque front-matter (name + description présents, YAML correct) —
   un front-matter cassé désactive le skill.
7. Vérifier la cohérence des compteurs (acteurs, entités, règles) entre tous
   les skills et le CDC/CLAUDE.md.

## Livraison

- **Claude.ai** : zipper le dossier de skills, présenter le zip.
  Avertir du piège du double dossier au dézippage (`skills/skills/`) : le
  contenu doit atterrir dans `.claude/skills/<projet>-.../SKILL.md`.
- **Claude Code** : écrire directement dans `.claude/skills/` du dépôt.

## Maintenance et versions

À chaque évolution du CDC, réaligner les skills **sans casser l'existant** :
éditions ciblées, blocs d'historique conservés, compteurs mis à jour partout,
zip régénéré. Distinguer un résidu de portée actuelle (à corriger) d'une
mention historique légitime (à garder). C'est exactement la discipline
appliquée sur Irina-Pharma au fil des versions v10 → v18.
