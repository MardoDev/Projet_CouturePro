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

## Portes qualité

```bash
npm run lint
npm run typecheck
npm run build
npm run test               # apps/api nécessite une base migrée, voir ci-dessus
```

Ne pas ouvrir une phase avant que la porte de la phase précédente soit verte
(voir l'orchestrateur dans `.claude/skills/couture-dynamic-pro-orchestrateur/`).
