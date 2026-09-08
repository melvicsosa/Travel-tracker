@AGENTS.md

# Travel Tracker — working notes for Claude Code

Family trip planner: trips → travelers → activities on a day/time grid that you
drag around. Next.js (App Router) + Supabase (Google auth, Postgres, Realtime).
Read `docs/PLAN.md` for the roadmap and `supabase/migrations/` for the schema.

## Conventions (non-negotiable)

- **Code, comments, commit messages, docs: English.** UI copy: Spanish, and it
  lives ONLY in `src/lib/i18n/es.ts`. Never hardcode user-facing strings in
  components; add a key to the dictionary and use `t.section.key`.
- **Mobile first.** Every screen must work on a 375px-wide phone with touch:
  44px+ tap targets, bottom sheets instead of modals (`.sheet` already does
  this), no horizontal page scroll, `100dvh` not `100vh`, safe-area padding.
  Test with the iPhone preset in DevTools before calling something done.
- **Design tokens only.** Colors come from CSS variables in
  `src/app/globals.css` (`--ink`, `--surface`, `--teal`, `--c-<category>`…).
  Light and dark are both first-class; never hardcode a hex in a component.
- **Typography:** Red Hat Display (headings), Red Hat Text (body), Red Hat
  Mono (times). No serif faces.
- **Security is in the database.** Every table has RLS. Never bypass it with
  the service role key in app code. New tables need policies in a new
  migration file under `supabase/migrations/` (timestamped name).
- **No secrets in the repo.** Only `NEXT_PUBLIC_*` values are used; they go in
  `.env.local` (git-ignored). `.env.example` documents them.
- **Times are minutes from midnight** (`start_min`, `duration_min`) in the
  trip's local time. No timezone conversion of stored data; dates are
  `YYYY-MM-DD` strings handled by `src/lib/time.ts` (`fromYMD`/`toYMD` avoid
  UTC shifts). `trips.timezone` (IANA, default America/New_York) is used only
  to compute "now" for the red current-time line and the initial scroll
  (`nowInZone()`), editable in the trip settings sheet.
- **Brand assets** live in `public/brand/` (light/dark wordmarks, swapped by
  CSS in `.logo`) and `public/icons/`; `src/app/icon.png` is the favicon.
- **Class names vs Tailwind**: component classes live in `@layer components`
  so utilities win; never name a component class like a Tailwind utility
  (`block`, `grid`, `hidden`, `container`…) — `.actblock`/`.timegrid` exist
  for that reason.

## Where things are

| Area | Path |
| --- | --- |
| Route protection (session cookie refresh + redirect to /login) | `src/proxy.ts` (Next 16 name for middleware) |
| Approval gate (pending / rejected → `/pending`) | `src/lib/auth.ts` → `requireApproved()`, `requireAdmin()` |
| Supabase clients | `src/lib/supabase/{client,server,proxy}.ts` |
| Row types | `src/lib/database.types.ts` (hand-written; regenerate with the CLI later) |
| Client-side writes | `src/lib/trip/repo.ts` |
| Trip screen | `src/components/trip/TripPlanner.tsx` (state + realtime) |
| Time grid + drag/resize | `src/components/trip/CalendarGrid.tsx`, `ActivityBlock.tsx` |
| Overlap layout | `src/lib/trip/layout.ts` |
| Dictionary | `src/lib/i18n/es.ts` |

## Commands

```bash
npm run dev      # http://localhost:3000
npm run lint
npx tsc --noEmit
npm run build
```

## Data flow in the trip screen

1. `app/(app)/trips/[tripId]/page.tsx` (server) loads trip, travelers,
   activities and members with the user's session (RLS filters them).
2. `TripPlanner` keeps them in `useState`, applies optimistic updates on every
   edit, and subscribes to `postgres_changes` for the trip so other members'
   edits arrive live.
3. Drag/resize happens in `CalendarGrid` with Pointer Events (mouse, touch,
   pen). The block moves with `transform` during the drag; on release
   `onMove` snaps to 15 minutes and writes one `update`.

## Roles

- `profiles.status`: `pending` → `approved` / `rejected`. Set by admins via
  `set_user_status()` RPC. The first user to sign in, and anyone in
  `admin_allowlist`, is auto-approved as admin.
- `trip_members.role`: `owner` (invite/remove members, delete trip),
  `editor` (edit activities/travelers), `viewer` (read only). Admins can do
  everything on every trip.

## When adding a feature

1. Schema change? New migration + RLS policy + update `database.types.ts`.
2. Strings? Add to `es.ts` first.
3. Component? Reuse `.btn`, `.chip`, `.field`, `Sheet`, `Avatar`.
4. Run `npm run lint && npx tsc --noEmit` before committing.
