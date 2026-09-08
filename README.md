# Travel Tracker

A small, fast trip planner for families and groups. Create a trip, add the
people who travel, and lay activities out on a calendar you can drag around —
by day, by hour range, on your phone.

Built with **Next.js 16 (App Router)**, **Supabase** (Google sign-in, Postgres
with Row Level Security, Realtime) and **Tailwind CSS v4**. The UI is currently
in Spanish; all copy lives in one dictionary file, so adding a language is a
single file.

> Code and comments are in English on purpose so the project is easy to reuse.

## Features

- Google sign-in. New users wait in a **pending** state until an admin
  approves them (`/admin/users`).
- Per-trip membership: owners invite approved users by email as editors or
  viewers. People see only the trips they belong to.
- Travelers who don't need an account (kids, grandparents) with color avatars;
  filter the itinerary by person.
- Three views: **Day** (big time grid), **Period** (every day of the trip side
  by side), **Agenda** (list).
- Drag an activity to another time or day, drag its bottom edge to change
  duration, or edit it in a bottom sheet. Snaps to 15 minutes. Keyboard arrows
  work too.
- Reservation tracking (to book / confirmed) with a side list of what's
  pending.
- Live updates between members via Supabase Realtime.
- Light and dark themes; installable as a PWA.

## Getting started

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/migrations/20260907000000_init.sql`.
3. (Recommended) Make yourself admin before the first sign-in:
   ```sql
   insert into public.admin_allowlist (email) values ('you@gmail.com');
   ```
   If you skip this, the **first** user to sign in becomes admin.
4. **Authentication → Providers → Google**: enable it and paste the OAuth
   client ID/secret from Google Cloud Console
   (*APIs & Services → Credentials → OAuth client ID → Web application*).
   Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
5. **Authentication → URL Configuration**: set *Site URL* to your app URL and
   add `http://localhost:3000/**` and your production URL to *Redirect URLs*.

### 2. App

```bash
git clone https://github.com/melvicsosa/Travel-tracker.git
cd Travel-tracker
npm install
cp .env.example .env.local   # fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open http://localhost:3000, sign in with Google. The first account (or the
allow-listed one) lands on `/trips` as admin; everyone else lands on
`/pending` until approved.

### 3. Sample data (optional)

`supabase/seed/sample_trip_tampa.sql` creates a function that seeds an
11-day family trip with 50 activities. Run the file, then:

```sql
select public.seed_sample_trip('<your-user-uuid>');
```

### 4. Deploy

Deploy to Vercel (or anywhere that runs Next.js). Set the two
`NEXT_PUBLIC_*` variables, then add the production URL to Supabase's
*Redirect URLs*.

## Project layout

```
src/
  app/
    login/            Google sign-in
    auth/callback     OAuth code exchange
    pending/          waiting-for-approval screen
    (app)/            approved-users area
      trips/          list + create
      trips/[tripId]  the planner
      admin/users     approve / reject users
  components/trip/    calendar grid, blocks, sheets, side panel
  lib/                supabase clients, i18n, time helpers, repo
  proxy.ts            session refresh + auth redirects
supabase/
  migrations/         schema, RLS, triggers, RPCs
  seed/               optional sample trip
docs/PLAN.md          roadmap
```

## Contributing

Issues and PRs are welcome. Please keep code and comments in English, put UI
text in `src/lib/i18n/es.ts`, and check the phone layout before opening a PR.
See `CLAUDE.md` for the conventions in more detail.

## License

MIT
