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
docker compose up -d      # PostgreSQL + Redis (nécessaires dès la Phase 2)

npm run dev:api           # http://localhost:4000
npm run dev:web           # http://localhost:3000
```

## Portes qualité

```bash
npm run lint
npm run typecheck
npm run build
npm run test
```

Ne pas ouvrir une phase avant que la porte de la phase précédente soit verte
(voir l'orchestrateur dans `.claude/skills/couture-dynamic-pro-orchestrateur/`).
