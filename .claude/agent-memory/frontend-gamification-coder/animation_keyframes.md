---
name: Animation keyframes
description: All custom @keyframes in globals.css and their utility class names — use these before adding new animations
type: reference
---

All defined in `apps/web/src/app/globals.css`:

| Class | Keyframe | Use case |
|---|---|---|
| `.animate-elo-up` | `elo-up` 0.5s spring | Elo number increasing (green tint, scale bounce) |
| `.animate-elo-down` | `elo-down` 0.5s spring | Elo number decreasing (red tint, scale bounce) |
| `.animate-slide-in` | `slide-in` 0.4s ease | List items entering from left — used on leaderboard rows |
| `.animate-pop-in` | `pop-in` 0.45s spring | Badge/chip pop reveal (scale 0.5 -> 1.2 -> 1) |
| `.animate-pulse-glow` | `pulse-glow` 2s infinite | Amber glow ring on #1 leaderboard card |

Staggered delays on leaderboard rows: `style={{ animationDelay: \`${i * 40}ms\` }}` on each `.animate-slide-in` element.

Tailwind `animate-ping` used for the live-session green pulse dot indicator.
