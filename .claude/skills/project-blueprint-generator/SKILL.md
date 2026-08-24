---
name: project-blueprint-generator
description: Génère l'arsenal complet de documentation et de pilotage d'un nouveau projet logiciel, de n'importe quel domaine, selon la méthode éprouvée sur Irina-Pharma. Produit le cahier des charges, le CLAUDE.md de contexte, le pack de skills de vibe-coding par phases, le guide de pilotage et les procédures de promptage — tout paramétré par le domaine, la stack et les acteurs du projet. Déclenche-toi quand l'utilisateur veut "démarrer un nouveau projet", "générer les livrables d'un projet", "créer un cahier des charges et les skills", "appliquer la méthode Irina-Pharma à un autre projet", ou "monter un pack de vibe-coding". Fonctionne dans Claude Code comme dans Claude.ai. Appelle les skills spec-to-merise (modèle de données) et vibe-coding-pack-builder (skills de phases) pour les étapes spécialisées.
---

# Générateur de blueprint projet

Ce skill transforme une idée de projet en un arsenal de pilotage complet,
prêt à conduire un agent de développement du premier commit au déploiement.
Il généralise la méthode construite sur Irina-Pharma à **n'importe quel
projet logiciel, quel que soit le domaine** (santé, finance, logistique,
éducation, e-commerce, SaaS interne…).

## Principe directeur

Un projet ne se code pas à partir d'une conversation ; il se code à partir
d'une **référence stable**. La méthode produit cette référence en couches :

1. **La loi** — le cahier des charges. Source d'arbitrage, jamais donnée en
   bloc à l'agent.
2. **Le contexte permanent** — un `CLAUDE.md` chargé à chaque session.
3. **Les recettes** — des skills par phase, chargés à la demande.
4. **La discipline** — règle d'or, checklist, déblocage.
5. **Le pilote humain** — un guide de vibe-coding.

Le rôle de ce skill est de générer ces cinq couches, cohérentes entre elles,
paramétrées par le projet.

## Étape 0 — Recueillir le profil du projet

Ne rien générer avant d'avoir ces éléments. Les demander à l'utilisateur
(via ask_user_input dans Claude.ai, ou en question directe dans Claude Code)
s'ils ne sont pas fournis :

```
PROFIL PROJET (à remplir)
- Nom du projet :
- Domaine / secteur :
- Porteur / organisation / localisation :
- Problème résolu, en une phrase :
- Acteurs (rôles utilisateurs) et ce que chacun fait :
- Fonctionnalités majeures (5 à 15) :
- Stack imposée ou préférée (sinon, proposer un défaut argumenté) :
- Charte : couleurs (hex), typographie :
- Contraintes réglementaires / de conformité éventuelles :
- Contraintes de déploiement (cloud, on-premise, mobile, PWA…) :
- Jalons / durée cible :
```

Si l'utilisateur ne sait pas répondre à un point, proposer une valeur par
défaut raisonnable et la marquer comme **hypothèse à valider** — ne jamais
inventer silencieusement un fait structurant.

## Étape 1 — Cahier des charges

Produire un CDC structuré. Sections types (adapter au domaine, ne pas forcer
des sections vides) :

1. Présentation, objectifs, contexte
2. Périmètre fonctionnel (les fonctionnalités majeures détaillées)
3. Acteurs et hiérarchie des rôles + **matrice de création des comptes**
   (qui crée / qui valide qui)
4. Cas d'usage (un par fonctionnalité clé, format acteur → étapes)
5. Interfaces / écrans par acteur
6. Sécurité, RBAC, conformité (le cœur si le domaine est réglementé)
7. Règles de gestion numérotées **RG1, RG2, …** — c'est l'épine dorsale :
   chaque contrainte métier devient une règle citable et testable
8. Étude de base de données (déléguée au skill `spec-to-merise`)
9. Modèle économique si pertinent
10. Déploiement, monitoring, conclusion

Règle de numérotation des RG : ne jamais créer un numéro pour une règle qui
n'en est qu'une **précision** d'une règle existante. Les vrais ajouts
prennent le numéro suivant ; les précisions se documentent sous leur règle
d'origine. Cela préserve la traçabilité au fil des versions.

## Étape 2 — Modèle de données

Appeler le skill **`spec-to-merise`** : il transforme les acteurs, entités
et cas d'usage du CDC en étude Merise (MCD/MLD/MOT, schéma relationnel,
règles ON DELETE). C'est ce document qui sera embarqué dans le skill de la
phase base de données.

## Étape 3 — Pack de skills de vibe-coding

Appeler le skill **`vibe-coding-pack-builder`** : il génère les skills par
phase (fondations → base de données → auth/RBAC → backend métier → frontend
public → dashboards → fonctionnalités spéciales → tests → déploiement), plus
l'orchestrateur, le contexte-projet, l'audit fonctionnel et les procédures
de promptage — le tout paramétré par le profil du projet.

## Étape 4 — CLAUDE.md de contexte permanent

Générer un `CLAUDE.md` racine contenant : la règle d'or (rôle, stack,
charte, interdits), la liste des acteurs, le modèle de données en résumé,
les règles non négociables, la table des phases, et les renvois vers les
documents de référence. C'est le fichier chargé à chaque session.

## Étape 5 — Guide de pilotage humain

Générer un `GUIDE-VIBE-CODING.md` destiné à l'humain qui pilote :
installation, boucle « un prompt = une session = un commit », protocole
wireframe (spec avant code), portes de qualité par phase, et le tableau de
bord des décisions métier en attente.

## Étape 6 — Livraison et cohérence

- Dans **Claude.ai** : produire les fichiers dans /mnt/user-data/outputs,
  zipper le pack de skills, présenter le tout.
- Dans **Claude Code** : écrire directement dans l'arborescence du dépôt
  (`CLAUDE.md` à la racine, skills dans `.claude/skills/`, docs dans
  `docs/`).
- Vérification finale obligatoire : le nombre d'acteurs, d'entités et de
  règles doit être **identique** dans le CDC, la Merise, le CLAUDE.md et les
  skills. Une incohérence de compteur entre livrables est le défaut le plus
  courant — la traquer avant de livrer.

## Garde-fous

- **Ne jamais inventer un fait structurant du domaine.** Si le projet est
  médical, financier ou juridique et qu'une règle métier précise manque,
  la demander plutôt que de la supposer.
- **Signaler les questions de conformité** (paiement, données personnelles,
  santé) comme des décisions humaines, pas techniques.
- **Distinguer décision technique et décision métier** dans tout ce qui est
  produit ; la seconde revient toujours à l'utilisateur.
- Réutiliser Irina-Pharma comme **exemple de référence** de ce qu'un pack
  complet contient, jamais comme contenu à copier tel quel dans un autre
  domaine.
