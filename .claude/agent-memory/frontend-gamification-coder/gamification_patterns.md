---
name: Gamification patterns
description: Rank badge system, medal overlays, tier pill styling, and pulse-glow on #1 — established patterns for the leaderboard
type: project
---

**Rank badges (top 3)** — defined inline in `page.tsx` as `RANK_BADGES`:
- 1ST: `ring-amber-400`, `bg-amber-400/20`, `text-amber-400`
- 2ND: `ring-slate-400`, `bg-slate-400/20`, `text-slate-300`
- 3RD: `ring-amber-700`, `bg-amber-700/20`, `text-amber-600`

Each uses `ring-2` on the avatar circle. When player has `avatarUrl`, a small medal overlay badge is rendered at `-bottom-1 -right-1` showing the rank initial ("1", "2", "3") with `ring-1 ring-background` to pop against the card.

**Tier pills** — rendered on every player row using `tier.bgClass` and `tier.colorClass` from `getEloTier(elo)` in `apps/web/src/lib/ranks.ts`. Pill is `rounded-full px-2 py-0.5 text-[10px] font-semibold`.

**#1 card treatment**: `border-accent/40 bg-gradient-to-r from-accent/10 to-card animate-pulse-glow`. Elo shown in `text-accent font-mono text-xl`.

**Rank legend bar** shown at bottom of player list using `ELO_TIERS` array — all tiers as colored pills with their minElo threshold. Uses `guide.elo.tiers.title` i18n key for the label.

**Active sessions** — green pulsing dot (`animate-ping`) + `text-green-400` heading. Cards use `border-green-500/30 bg-green-500/5` with chevron SVG. Touch target min-h-[52px].

**Touch targets**: all interactive elements use `min-h-11` (44px) or `min-h-[52px]` / `min-h-[60px]`. Active states use `active:scale-[0.97]` or `active:scale-[0.98]` — no hover-only states.
