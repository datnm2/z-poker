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

Tuned cho pool nhỏ (~20 người, văn phòng) chơi 30 phút/ngày. Mục tiêu: cân bằng skill (ăn ELO cao hơn khi thắng cá lớn) và volume (chơi đều thì leo dần lên), tránh "kẹt 1200 mãi".

- **Core formula**: `raw = round(kFactor × (N/2) × (actual − expected))`
  - `expected = 1 / (1 + 10^((avgElo − playerElo) / ELO_SCALE))`, **`ELO_SCALE = 700`** (nới từ Arpad chuẩn 400 để curve phẳng hơn → high-ELO không bị nghẹt khi thắng nhỏ)
  - `actual = 0.5 + 0.5 × (chipsEnd − buyIn) / (buyIn × (N − 1))` — linear theo chip
  - **Asymmetric K**: winner dùng `K=70`, loser dùng `K_LOSS=50` (loss bớt đau ~30% để top player có EV dương khi winrate cao)
- **Winner rewards** (cộng dồn sau công thức):
  - `WINNER_RAW_FLOOR = 2`: clamp raw nếu < 2 → win nhỏ vẫn ăn ít nhất +2
  - `WINNER_FLAT_BONUS = 3`: cộng thêm cho mọi chip-winner (lạm phát nhẹ + reward volume)
  - → Tối thiểu mỗi win = **+5 ELO**
- **Streak bonus** (signed, theo `streakAfter` sau game):
  - Win streak: `streak × 2`, vô hạn (3→+6, 4→+8, 5→+10, …) — reward hot run
  - Loss streak: step 1, cap tại `LOSS_STREAK_BONUS_CAP = 5` (3→−3, 4→−4, 5→−5, 6→−5, …) — phạt thua liên tiếp nhưng không bị xoáy
- **Jackpot Mechanism (Nổ Hũ)**:
  - **Tích lũy**: Bắt đầu ngay từ trận thua đầu tiên. Tỷ lệ trích điểm Elo bị trừ vào hũ cá nhân tăng dần theo công thức: 20% × Số trận thua liên tiếp.
  - **Giảm lỗ**: Áp dụng ngay từ trận thua đầu tiên. Cứ mỗi trận thua liên tiếp, người chơi được giảm 10% hình phạt Elo (giảm tối đa 50%).
  - **Nổ Hũ (Payout)**: Hũ sẽ nổ khi người chơi có chuỗi thua >= 3 đạt được Thứ hạng: Top 3 trong phiên, Thành tích: Số chip cuối trận >= 1.5× Buy-in.
  - **Reset**: Khi nổ hũ thành công, người chơi nhận lại toàn bộ điểm trong hũ. Sau đó, hũ cá nhân và chuỗi thắng/thua lập tức được reset về 0.
- **Zero-sum chips**: `sum(chipsEnd) == buyIn × N` enforced at lock (chỉ chip, không phải ELO)
- **Starting ELO**: 1200

### Ví dụ cụ thể (bàn 6 người, buyIn 100, mọi người ELO 1200)

Trận winner ăn full pot 600 chips, 5 losers 0 chip:

- Winner: actual=1.0, expected=0.5, raw = 70×3×0.5 = **+105**, +bonus 3 → **+108**
- Mỗi loser: actual=0.4, raw = 50×3×(0.4−0.5) = **−15**
- Drift cả bàn: 108 − 15×5 = **+33** (lạm phát có chủ ý)

Trận chia chips realistic (180/150/120/80/40/30):

- Winner +80 chip: actual=0.58, raw=70×3×0.08 = **+17**, +bonus → **+20**
- Winner +50 chip: actual=0.55, raw=70×3×0.05 = **+10.5**, +bonus → **+14**
- Winner +20 chip: actual=0.52, raw=70×3×0.02 = **+4.2**, +bonus → **+7**
- Loser −20 chip: actual=0.48, raw=50×3×−0.02 = **−3**
- Loser −60 chip: actual=0.44, raw=50×3×−0.06 = **−9**
- Loser −70 chip: raw = **−10**
- Drift: 20+14+7 − 3−9−10 = **+19**

Trận top player ELO 1500 vs bàn avg 1200 (chênh +300), thắng nửa pot (chips 200):

- expected = 1/(1+10^(−300/700)) = 0.728, actual = 0.6
- raw = 70×3×(0.6−0.728) = **−27** → clamp về `WINNER_RAW_FLOOR=2` → +bonus → **+5**
- Vẫn ăn ELO mặc dù raw âm (volume reward).

Trận underdog ELO 1000 vs bàn avg 1300 (chênh −300), thắng full pot:

- expected = 0.272, actual = 1.0
- raw = 70×3×0.728 = **+153**, +bonus → **+156** (upset payday)

### Dự kiến đường rank của top player

Pool 20 người, ~100 games/5 tháng, top player chơi ~50 trận với winrate ~75%:

- 1200→1245: ~10 games (EV ~+2/game) — lên Lão Luyện ★
- 1245→1335: ~25 games (EV ~+1.5/game) — leo Lão Luyện → chạm Kẻ Săn Mồi
- 1335→1425: ~50 games (EV ~+0.5/game) — phanh tự nhiên rõ rệt
- → ~35 games đạt Kẻ Săn Mồi ★, ~60 games đạt Kẻ Săn Mồi ★★★
- → Thần Bài (1425) khả thi sau 7–8 tháng chơi đều + streak win dài

### Tuning constants

Tất cả ở đầu `apps/api/src/elo/elo.math.ts`. Khi pool inflate quá nhanh hoặc quá chậm, chỉnh theo thứ tự ưu tiên:

1. `WINNER_FLAT_BONUS` — tác động trực tiếp tới drift/trận
2. `K_LOSS` — tăng → loss đau hơn, top player tụt nhanh
3. `ELO_SCALE` — tăng → curve phẳng hơn, mọi ELO ăn/thua gần nhau
4. `WINNER_RAW_FLOOR` — chỉ ảnh hưởng top player thắng nhỏ

**Workflow bắt buộc khi đổi bất kỳ constant nào trong `elo.math.ts`:**

1. Snapshot trước: `yarn workspace api elo:matrix > /tmp/elo-before.txt`
2. Sửa constants trong `elo.math.ts`
3. Snapshot sau: `yarn workspace api elo:matrix > /tmp/elo-after.txt`
4. So sánh: `diff /tmp/elo-before.txt /tmp/elo-after.txt` — kiểm tra impact lên cả 3 bàn (N=6/8/10) trước khi commit
5. Chạy `yarn workspace api jest elo.math.spec` để đảm bảo tests vẫn pass

Custom params: `SIZES=4,6,9 BUY_IN=200 yarn workspace api elo:matrix` hoặc `GAPS=-100,0,100 CHIPS=-50,0,50 yarn workspace api elo:matrix`.

## Rank tiers (`apps/web/src/lib/ranks.ts`, names ở `apps/web/src/i18n/vi.ts`)

| Tier                       | ELO       | Divisions  |
| -------------------------- | --------- | ---------- |
| 👑 Thần Bài - Vua Trò Chơi | 1425+     | —          |
| 🦈 Kẻ Săn Mồi              | 1335–1425 | ★, ★★, ★★★ |
| 💰 Lão Luyện               | 1245–1335 | ★, ★★, ★★★ |
| 🎯 Tay Mới                 | 1150–1245 | ★, ★★, ★★★ |
| 🃏 Tay Non Và Xanh         | 1126–1150 | ★, ★★, ★★★ |
| 🐟 Cá Con - Chip Feeder    | <1126     | —          |

Mid tiers chia 30-elo divisions (riêng Tay Non Và Xanh chia 8-elo/division để người tụt khỏi Tay Mới phân hóa nhanh xuống Cá Con); rank tính theo domain (count players higher elo + 1).

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
