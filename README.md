# Couture Dynamic Pro

Plateforme e-commerce C.D.P — voir [`CLAUDE.md`](./CLAUDE.md) (contexte permanent),
[`GUIDE-VIBE-CODING.md`](./GUIDE-VIBE-CODING.md) (pilotage humain) et
[`docs/CDC-CoutureDynamicPro-v1.2.md`](./docs/CDC-CoutureDynamicPro-v1.2.md) (cahier des charges).

## Structure

- `apps/web/` — Next.js 14 + TypeScript + Tailwind (frontend public + dashboards)
- `apps/api/` — Node.js + Express (backend métier)
- `docs/` — CDC et étude Merise
- `.claude/skills/` — pack de vibe-coding par phase (0 à 9)

## Démarrage local

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
docker compose up -d      # PostgreSQL (port 5434) + Redis (port 6380) — voir docker-compose.yml
npm run db:migrate --workspace=couture-dynamic-pro-api   # applique le schéma Prisma
npm run db:seed --workspace=couture-dynamic-pro-api      # données de dev non sensibles

npm run dev:api           # http://localhost:4000
npm run dev:web           # http://localhost:3000
```

PostgreSQL et Redis tournent sur des ports non standard (5434, 6380) pour ne
pas entrer en conflit avec d'autres services déjà présents sur la machine —
voir les commentaires dans `docker-compose.yml` et `apps/api/.env.example`.

## Base de données (Phase 2)

- Schéma : [`apps/api/prisma/schema.prisma`](./apps/api/prisma/schema.prisma), dérivé
  1:1 de [`docs/etude-merise.md`](./docs/etude-merise.md) (15 entités, FK, ON DELETE).
- Contraintes CHECK (montants/quantités non négatifs, email en minuscules)
  ajoutées à la main dans la migration générée — non exprimables nativement
  dans `schema.prisma` à cette version de Prisma.
- `npm run db:studio --workspace=couture-dynamic-pro-api` pour explorer les données.
- Les tests d'intégrité (`apps/api/test/db-integrity.test.js`) nécessitent une
  base migrée et accessible (`DATABASE_URL`) — c'est aussi le cas en CI, qui
  démarre un service PostgreSQL dédié.

## Auth / RBAC (Phase 3)

- Sessions par cookie httpOnly + JWT (`apps/api/src/auth/`), RBAC deny-by-default
  (`apps/api/src/middleware/auth.js`) : `authenticate`, `requireRole`, `optionalAuthenticate`.
- Aucun prestataire d'envoi d'email n'étant défini dans la stack (CLAUDE.md), les
  liens de vérification/reset sont renvoyés directement dans la réponse API en
  environnement non-production (`devEmailVerificationToken`, `devPasswordResetToken`,
  `devPasswordSetupToken`) — à remplacer par un vrai envoi avant la mise en production.
- MFA explicitement non implémenté (décision en attente, voir `GUIDE-VIBE-CODING.md`).

## Backend métier (Phase 4)

- API versionnée sous `/api/v1/` (collections, catalogues, pages, produits,
  variantes, panier, commandes) — contrat : [`apps/api/docs/openapi.yaml`](./apps/api/docs/openapi.yaml).
- Paiements réels non implémentés ici : le checkout crée la commande (snapshot RG7,
  stock décrémenté atomiquement) sans toucher à `PAIEMENT`, réservé à la Phase 7
  (webhooks CinetPay/Stripe vérifiés, RG8).
- `POST /api/v1/commandes` est idempotente via l'en-tête `Idempotency-Key`
  (Redis, `apps/api/src/middleware/idempotency.js`).
- RG12 pour `CATALOGUE`/`PRODUIT` : le MLD choisit CASCADE/SET NULL (pas RESTRICT)
  pour ce qui en dépend — rien n'empêche leur suppression physique côté DB. La
  politique « archiver, jamais supprimer » est un garde-fou applicatif qui reste
  à câbler dans les dashboards (Phase 6) : ne jamais exposer de DELETE dessus.

## Frontend public (Phase 5 — tranche 1)

- Pages de découverte : accueil, `/catalogues` (liste + détail avec flipbook
  placeholder + partage), `/produits` (liste + détail + ajout au panier),
  `/contact` (devis par email tant que le chat, Phase 7, n'existe pas).
- SSR : chaque page fetch l'API directement (`apps/web/src/lib/api.ts`,
  `cache: "no-store"`), `generateMetadata` pour SEO/OG, `loading.tsx`/
  `error.tsx`/`not-found.tsx` pour les états d'interface.
- **Limite connue** : `notFound()` dans `/catalogues/[slug]` et
  `/produits/[slug]` affiche la bonne page "introuvable" mais renvoie un
  statut HTTP 200 au lieu de 404 (testé en production `next start`, pas un
  problème de `next dev`). Comportement documenté de Next.js 14 App Router
  quand `notFound()` coexiste avec `generateMetadata` sur une route
  dynamique — mauvais pour l'indexation SEO d'une page qui n'existe pas, à
  corriger avant la Phase 8 (ou en amont si un correctif Next.js sort).
- **Reste à faire (tranche 2)** : panier (page dédiée), checkout 3 étapes,
  connexion/inscription/compte client, chat placeholder déjà posé (bouton
  flottant) mais sans page compte pour s'y connecter. L'ajout au panier
  échoue proprement en 401 tant que `/connexion` n'existe pas.
- Tests dédiés (RTL/jsdom) non mis en place dans cette tranche — la
  correction TypeScript (`npm run typecheck`) et le build (`next build`)
  restent le filet de sécurité actuel ; un vrai test-runner composant est
  Phase 8.

## Portes qualité

```bash
npm run lint
npm run typecheck
npm run build
npm run test               # apps/api nécessite une base migrée + Redis, voir ci-dessus
```

`apps/api` utilise `node --test --test-force-exit` : sur cette machine, des
connexions HTTP/DB laissées ouvertes par les tests d'intégration pouvaient
empêcher le processus de se terminer sans ce flag — comportement d'environnement,
pas un bug applicatif (chaque test individuel passe correctement).

Ne pas ouvrir une phase avant que la porte de la phase précédente soit verte
(voir l'orchestrateur dans `.claude/skills/couture-dynamic-pro-orchestrateur/`).

## Sécurité — dépendances

`npm audit` signale 5 vulnérabilités « high », toutes dans la même chaîne
(`next` → `glob`/`postcss`). Les avis GHSA ne les considèrent corrigées qu'à
partir de Next.js 16.3 — aucun correctif n'existe dans la ligne 14.x. `next`
est mis à jour au patch le plus récent de la ligne 14 (`14.2.35`, CLAUDE.md
fixe la stack sur Next 14) ; passer en 16 est un saut de deux versions majeures
qui sort du cadre d'une session de maintenance courante et doit être une
décision explicite avant que les Phases 5+ construisent sur les sous-systèmes
concernés (Image Optimization, Middleware, Server Actions — aucun n'est encore
utilisé ici, donc l'exposition réelle actuelle est nulle).
