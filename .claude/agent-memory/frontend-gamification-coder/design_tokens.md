---
name: Design tokens
description: CSS custom properties and Tailwind semantic token names — use these instead of raw Tailwind colors for consistency
type: reference
---

Defined in `apps/web/src/app/globals.css` via `@theme inline`:

| Token | Value | Tailwind class |
|---|---|---|
| `--background` | `#0f172a` | `bg-background` / `text-background` |
| `--foreground` | `#e2e8f0` | `text-foreground` |
| `--accent` | `#f59e0b` (amber-500) | `text-accent`, `bg-accent`, `border-accent` |
| `--card` | `#1e293b` | `bg-card` |
| `--card-border` | `#334155` | `border-card-border` |
| `--muted` | `#94a3b8` | `text-muted` |

`themeColor` in layout.tsx viewport config is `#0f172a` — matches `--background`.

Body has a subtle radial gold gradient overlay (fixed attachment) for casino depth effect.
