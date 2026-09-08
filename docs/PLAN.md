# Travel Tracker — plan

The prototype (a single-file Claude artifact) proved the interaction: a time
grid where activities are dragged between days and hours. This document is
the plan for turning it into a real, shareable app. Phases are ordered so that
each one leaves the app usable.

## Architecture

```
Browser (Next.js client components)
  │  supabase-js + realtime websocket (anon key, user JWT)
  ▼
Supabase
  ├─ Auth (Google OAuth) ──► auth.users ──trigger──► public.profiles (pending)
  ├─ Postgres + RLS  (trips, trip_members, travelers, activities)
  └─ Realtime        (postgres_changes per trip)

Next.js server (Server Components / Actions / proxy)
  ├─ proxy.ts: refresh session cookie, redirect signed-out users to /login
  ├─ lib/auth.ts: requireApproved() / requireAdmin() gates
  └─ pages read with the user's session, so RLS does the filtering
```

Decisions:

- **Supabase RLS is the security model.** The app never uses the service
  role. Policies live next to the schema and are the source of truth for
  "who can see/edit what".
- **Approval flow in the database.** `profiles.status` + `set_user_status()`
  RPC. The admin UI is a thin page over it.
- **Optimistic UI + realtime.** Local state updates immediately; the
  database row comes back over realtime and replaces it. Last write wins.
- **Minutes from midnight, local dates as strings.** No timezone logic; a
  trip happens in one place.
- **One dictionary file for copy.** Spanish now, more later.

## Phase 0 — Scaffold (done)

- Next.js 16 + Tailwind v4 + TypeScript, `src/` layout.
- Supabase schema, RLS, triggers, RPCs, realtime publication.
- Google sign-in, session proxy, `/pending`, `/admin/users`.
- Trips list + create; trip planner with Day / Period / Agenda views,
  drag & resize, activity sheet, travelers, reservations, members.
- Sample trip seed.

## Phase 1 — Make it run end to end

1. Create the Supabase project, run the migration, enable Google.
2. `npm run dev`, sign in, confirm the admin lands on `/trips`.
3. Sign in with a second Google account → `/pending` → approve from
   `/admin/users` → invite to the trip → confirm realtime edits.
4. Run `seed_sample_trip` and walk the Tampa itinerary on a phone.
5. Fix whatever the walk-through reveals. Deploy to Vercel.

## Phase 2 — Mobile polish

- Period view on phones: pinch/zoom is out; instead offer a "3 days"
  window with horizontal paging.
- Long-press to start a drag on touch (so vertical scrolling is not fought
  by drag). Today: touching a block starts a drag immediately.
- Haptic tick on snap (`navigator.vibrate`) where supported.
- Offline: queue writes in memory and flush on reconnect; show the
  `common.offline` notice.
- PWA icons (`public/icons/icon-192.png`, `icon-512.png`) and a splash.

## Phase 3 — Trip features

- Trip settings sheet: rename, change dates, delete (owner).
- Duplicate an activity; move a whole day.
- Reservation details: confirmation number, phone, link; "book by" date and
  a reminder list.
- Notes per day.
- Share a read-only public link (signed token, no login) for grandparents.
- Export: agenda as PDF / add to Google Calendar (ICS).

## Phase 4 — Reuse by others

- `docs/SETUP.md` with screenshots of the Supabase and Google Cloud steps.
- English dictionary + language switch (cookie).
- GitHub Actions: lint + typecheck + build on PR.
- One-click "Deploy to Vercel" button with env prompts.
- Generate `database.types.ts` with the Supabase CLI and type the clients.

## Open questions

- Should travelers link to accounts (`travelers.user_id`)? The column exists;
  the UI doesn't use it yet.
- Multi-timezone trips (flights across zones): out of scope until asked.
