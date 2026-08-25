# pei-app — Project Conventions
(Place at repo root: /workspaces/pei-app/CLAUDE.md)

## Stack
- Frontend: React, deployed to Vercel (pei-app-eight.vercel.app)
- Backend: Supabase (Edge Functions, pg_cron, Postgres) — project ID zocupidthlhxwroyxcuv
- Frontend entry: pei-frontend/src/App.jsx

## Known gotchas (add to this list whenever a bug repeats)
- `hash_key` column is `character` (fixed-length), NOT `text` — causes
  silent padding issues in rate limit lookups. Cast/trim carefully.
- `supabase.auth.getSession()` can throw and block submissions — always
  wrap in try/catch.
- Supabase's default 1,000-row query limit can silently break aggregation
  for high-volume LGUs (e.g. City of Manila needed a direct SQL insert).
- `submitted_at` must be explicitly set on insert — it does not default.
- VALID_EMOTIONS must be kept in sync with the actual emotion set (e.g.
  "calm" was missing and broke aggregation).
- Aggregation (`aggregate-emotions` Edge Function) must be triggered
  post-submission as fire-and-forget in supabase.js, in addition to the
  1:00 AM UTC daily pg_cron job.
- SVG icons (EmotionIcon.jsx) cannot render on <canvas> — share card uses
  drawn circle + initial letter instead.

## Data model notes
- 1,634 PSGC-verified LGUs imported into Supabase.
- Periods: 7D/30D/90D = simple rolling windows. All Time = everything ever
  submitted. Trends tab (moving averages, WoW) not yet built.
- PEI's 8 emotions are original to the project — not derived from Ekman,
  Plutchik, or Russell's Circumplex. Organized around Hope/Despair Ratio.
- Tinig's 10 emotions (Kilig, Gigil, Tampo, Hiya, Saya, Lungkot, Galit,
  Pagod, Pag-asa, Nangungulila) are intentionally distinct from PEI's set.

## Design system
- Fonts: DM Mono + Playfair Display
- Theming: useT() token system — never import hardcoded T tokens directly
  (this caused a theme-inheritance bug across 10 files in a past session)
- Icons: Lucide React + custom inline SVG via EmotionIcon.jsx
- Map: simplemaps.com ph.json (67 provinces), not the old CDN fetch

## Pending (sync manually with TODO.md if one exists)
- Supabase migration: add display_name, bio, pronouns, avatar_color,
  home_lgu_id to user_profiles — confirm whether this has run yet.
- Delete stale files: src/1, src/pages/personal/1,
  supabase/functions/submit-emotion/SettingsPage.jsx
- Footer update: padding fix, Documentation column, full content pages
- Trends tab build
- Mobile push notifications not firing (Service Worker implemented,
  unresolved on device)
- Profile editing in Settings

## Deliverable conventions
- Changelogs: changelog[MMDDYY][HHMM].txt, saved to /mnt/user-data/outputs/
- Always include a changelog with session deliverables
