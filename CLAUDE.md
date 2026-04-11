@AGENTS.md

# Monorepo layout

```
apps/api/   NestJS API (port 3031 by default)
apps/web/   Next.js web app (port 3030 by default)
```

- Package manager: **Yarn v1 workspaces**
- Run workspace commands from repo root: `yarn workspace api <cmd>` or `yarn workspace web <cmd>`
- Root convenience scripts: `yarn dev:api`, `yarn dev:web`, `yarn build:api`, `yarn build:web`

# Environment files

- API: `apps/api/.env` (see `apps/api/env.example`)
- Web: `apps/web/.env.local` (see `apps/web/env.local.example`)

# Database

Postgres runs in Docker locally. Connect via `DATABASE_URL` in `apps/api/.env`.
Run migrations: `yarn workspace api migration:run`

# Auth

Clerk is used for auth in both apps.
- Web uses `@clerk/nextjs` — `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`
- API uses `@clerk/backend` to verify tokens — `CLERK_SECRET_KEY`

# Deployment

- Web → Vercel (`apps/web/vercel.json` handles build config)
- API → Render (`render.yaml` at repo root)
