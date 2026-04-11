# Z-Poker

Office poker ELO tracker. Monorepo with a Next.js web app and a NestJS API.

## Structure

```
apps/
  api/     NestJS + TypeORM + PostgreSQL
  web/     Next.js + Tailwind CSS + Clerk auth
```

## Prerequisites

- Node.js 20+
- Yarn v1
- Docker (for local Postgres)

## Setup

```bash
yarn install
```

### API (`apps/api`)

Copy and fill in env vars:

```bash
cp apps/api/env.example apps/api/.env
```

Required vars:

| Key | Description |
|-----|-------------|
| `DATABASE_URL` | Postgres connection string |
| `CLERK_SECRET_KEY` | From Clerk dashboard |
| `CLERK_PUBLISHABLE_KEY` | From Clerk dashboard |
| `WEB_ORIGIN` | Allowed CORS origin (e.g. `http://localhost:3030`) |
| `PORT` | API port (default `3031`) |

Run migrations then start:

```bash
yarn workspace api migration:run
yarn dev:api
```

### Web (`apps/web`)

Copy and fill in env vars:

```bash
cp apps/web/env.local.example apps/web/.env.local
```

Required vars:

| Key | Description |
|-----|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | From Clerk dashboard |
| `CLERK_SECRET_KEY` | From Clerk dashboard |
| `NEXT_PUBLIC_API_URL` | API base URL (e.g. `http://localhost:3031`) |

Start:

```bash
yarn dev:web
```

## Dev scripts (root)

| Script | Description |
|--------|-------------|
| `yarn dev:api` | Start API in watch mode |
| `yarn dev:web` | Start web in dev mode |
| `yarn build:api` | Build API |
| `yarn build:web` | Build web |

## Deployment

- **Web** → Vercel. Root directory: `apps/web`. Build command: `cd ../.. && yarn workspace web build`.
- **API** → Render. Uses `render.yaml` at repo root.
