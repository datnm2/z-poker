@AGENTS.md

# Product overview

**Z-Poker** = office cash-game poker tracker với ELO ranking, isolated theo email domain (multi-tenant theo công ty).

## Game flow
1. Creator tạo `Session` với buy-in (default 1000 chips) + ngày
2. Add players (mình hoặc người khác trong domain) → mỗi `SessionPlayer` snapshot `eloBefore`
3. Players nhập `chipsEnd` (chip cuối) qua UI
4. Creator **lock** session → trigger ELO recalc + update player ranks
5. Session immutable, kết quả lên leaderboard

Real-time qua **SSE** (`/sessions/stream` domain-wide, `/:id/stream` per session).
Events: `session.created`, `session.player_joined`, `session.chips_updated`, `session.locked`.

## ELO system (`apps/api/src/elo/elo.math.ts`)
- **Formula**: `change = round(K × (N/2) × (actual − expected))`
  - `expected = 1 / (1 + 10^((avgElo − playerElo) / 400))` — 400 = ELO scaling chuẩn của Arpad Elo
  - `actual = 0.5 + 0.5 × (chipsEnd − buyIn) / (buyIn × (N − 1))` — linear theo chip
- **K=70** (giảm từ 100 để bớt swing; chess dùng 10–40 nhưng casual game cần feedback rõ)
- **Zero-sum**: `sum(chipsEnd) == buyIn × N` enforced at lock
- **Starting ELO**: 1200

## Rank tiers (`apps/web/src/lib/ranks.ts`, names ở `apps/web/src/i18n/vi.ts`)
| Tier | ELO | Divisions |
|---|---|---|
| 👑 Thần Bài - Vua Trò Chơi | 1600+ | — |
| 🦈 Kẻ Săn Mồi | 1450–1600 | ★, ★★, ★★★ |
| 💰 Lão Luyện | 1300–1450 | ★, ★★, ★★★ |
| 🎯 Tay Mới | 1150–1300 | ★, ★★, ★★★ |
| 🃏 Tay Non Và Xanh | 1000–1150 | ★, ★★, ★★★ |
| 🐟 Cá Con - Chip Feeder | <1000 | — |

Mid tiers chia 50-elo divisions; rank tính theo domain (count players higher elo + 1).

## Multi-tenancy
- Email domain (`@acme.com`) = tenant key
- Extracted in `apps/api/src/auth/clerk.guard.ts` → `AuthedUser.domain`
- Tất cả query filter theo domain → công ty A không thấy công ty B

## i18n
Bilingual: `apps/web/src/i18n/en.ts` + `vi.ts` (default Vietnamese).

## Key files
- API: `sessions/`, `players/`, `elo/elo.math.ts`, `elo/elo.service.ts`, `auth/clerk.guard.ts`
- Web: `app/page.tsx` (leaderboard), `app/session/[id]/page.tsx` (session detail), `app/profile/page.tsx`, `lib/ranks.ts`

## Homepage (`apps/web/src/app/page.tsx`)
Single route `/` renders 2 states based on `useAuth().isLoggedIn`:
- **Logged-out** → `LandingPage`: hero + Google sign-in (`signInWithGoogle`), WHY cards, mock leaderboard preview, rank ladder, HOW steps, "for fun only" disclaimer, JSON-LD `WebApplication` schema for SEO.
- **Logged-in** → `LeaderboardContent`: domain HQ hero (player count + total sessions link → `/sessions`), active sessions list, create-session form (buy-in input, default 100; "physical" mode only, "online" disabled), player rankings with tier badges + division stars + ELO-to-next progress bar, rank legend.

Data flow:
- Parallel fetch: `/players`, `/sessions?active=true`, `/sessions/stats` via `api` client
- SSE subscription to `/sessions/stream` with handlers for `session.created`, `session.player_joined`, `session.locked` (locked event patches ELO locally from `results` payload instead of refetching)
- `onResync` → full `fetchData()` refetch

Mobile-first: `max-w-lg`, `BottomNav`, `min-h-11`/`min-h-[52px]` tap targets, `active:scale-[0.97]` feedback. All strings via `t()` from i18n provider.

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
