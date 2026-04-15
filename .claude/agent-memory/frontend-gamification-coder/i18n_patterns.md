---
name: i18n patterns
description: How i18n works in z-poker web — TranslationKey type, useI18n hook, key naming convention
type: reference
---

Files: `apps/web/src/i18n/en.ts`, `apps/web/src/i18n/vi.ts`

Both export a `const` object typed `as const`. The `TranslationKey` type is derived from the union of keys in these objects (see `apps/web/src/i18n/translations.ts`).

Usage: `const { t, locale } = useI18n()` from `@/providers/i18n-provider`.

Key naming convention: `"namespace.subkey"` — e.g. `"leaderboard.title"`, `"session.buyIn"`, `"rank.godlike"`.

When adding new keys: add to both `en.ts` and `vi.ts` simultaneously — missing keys cause TypeScript errors since `TranslationKey` is the intersection of both.

`locale` value is `"en"` or `"vi"` — used for conditional locale-specific links (e.g. `dat09vn.com`).
