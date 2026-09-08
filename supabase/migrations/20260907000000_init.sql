-- Travel Tracker — initial schema
--
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Everything is protected with Row Level Security. The rules, in short:
--   * A new Google sign-in creates a `profiles` row in `pending` status.
--   * Admins approve or reject profiles. Only approved users can use the app.
--   * A trip is visible only to its members (owner / editor / viewer) and to admins.
--   * Owners and editors can change travelers and activities; viewers only read.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_status as enum ('pending', 'approved', 'rejected');
create type public.trip_role as enum ('owner', 'editor', 'viewer');
create type public.booking_status as enum ('none', 'pending', 'confirmed');
create type public.activity_category as enum (
  'transfer', 'food', 'outdoors', 'attraction', 'shopping', 'home', 'event'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per authenticated user. Mirrors auth.users; managed by trigger.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  is_admin    boolean not null default false,
  status      public.user_status not null default 'pending',
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles (id)
);
create index profiles_status_idx on public.profiles (status);

-- Emails that become admins automatically on first sign-in.
-- Insert your own email here before signing in for the first time.
create table public.admin_allowlist (
  email text primary key
);

create table public.trips (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  place       text not null default '',
  start_date  date not null,
  end_date    date not null,
  created_by  uuid not null references public.profiles (id),
  created_at  timestamptz not null default now(),
  constraint trips_dates_check check (end_date >= start_date)
);

create table public.trip_members (
  trip_id    uuid not null references public.trips (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.trip_role not null default 'viewer',
  added_by   uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index trip_members_user_idx on public.trip_members (user_id);

-- People who travel. They do not need an account (a baby, grandma...).
create table public.travelers (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  name        text not null,
  short_name  text not null,
  color       text not null default '#0E7C86',
  user_id     uuid references public.profiles (id) on delete set null,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index travelers_trip_idx on public.travelers (trip_id);

-- Activities live on a day, at a start minute, for a duration.
-- Times are minutes from midnight in the trip's local time (no timezone math).
create table public.activities (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  title         text not null,
  place         text not null default '',
  notes         text not null default '',
  date          date not null,
  start_min     integer not null check (start_min between 0 and 1439),
  duration_min  integer not null check (duration_min between 5 and 1440),
  category      public.activity_category not null default 'transfer',
  booking       public.booking_status not null default 'none',
  traveler_ids  uuid[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index activities_trip_date_idx on public.activities (trip_id, date);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so RLS policies can call them cheaply)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select is_admin and status = 'approved' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_approved()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select status = 'approved' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_trip(p_trip_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid() and role in ('owner', 'editor')
  );
$$;

create or replace function public.is_trip_owner(p_trip_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Create a profile for every new auth user. The first user ever, and anyone in
-- admin_allowlist, becomes an approved admin. Everyone else waits for approval.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := exists (select 1 from public.admin_allowlist where lower(email) = lower(new.email))
             or not exists (select 1 from public.profiles);

  insert into public.profiles (id, email, full_name, avatar_url, is_admin, status, approved_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    v_is_admin,
    case when v_is_admin then 'approved'::public.user_status else 'pending' end,
    case when v_is_admin then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Whoever creates a trip becomes its owner.
create or replace function public.handle_new_trip()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.trip_members (trip_id, user_id, role, added_by)
  values (new.id, new.created_by, 'owner', new.created_by);
  return new;
end;
$$;

create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger activities_touch_updated_at
  before update on public.activities
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RPCs called from the app
-- ---------------------------------------------------------------------------

-- Owners invite an approved user to a trip by email. Profiles are not readable
-- across users, so the lookup happens here with elevated rights.
create or replace function public.add_trip_member_by_email(
  p_trip_id uuid,
  p_email text,
  p_role public.trip_role default 'editor'
)
returns public.trip_members
language plpgsql security definer set search_path = public
as $$
declare
  v_user public.profiles;
  v_row  public.trip_members;
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into v_user from public.profiles
  where lower(email) = lower(p_email) and status = 'approved';

  if v_user.id is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  insert into public.trip_members (trip_id, user_id, role, added_by)
  values (p_trip_id, v_user.id, p_role, auth.uid())
  on conflict (trip_id, user_id) do update set role = excluded.role
  returning * into v_row;

  return v_row;
end;
$$;

-- Admin approval / rejection.
create or replace function public.set_user_status(p_user_id uuid, p_status public.user_status)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.profiles;
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.profiles
  set status = p_status,
      approved_at = case when p_status = 'approved' then now() else null end,
      approved_by = case when p_status = 'approved' then auth.uid() else null end
  where id = p_user_id
  returning * into v_row;

  return v_row;
end;
$$;

-- Members of a trip, with the profile fields the UI needs.
create or replace function public.trip_members_with_profiles(p_trip_id uuid)
returns table (
  user_id uuid, role public.trip_role, email text, full_name text, avatar_url text
)
language sql stable security definer set search_path = public
as $$
  select m.user_id, m.role, p.email, p.full_name, p.avatar_url
  from public.trip_members m
  join public.profiles p on p.id = m.user_id
  where m.trip_id = p_trip_id and public.is_trip_member(p_trip_id)
  order by m.role, p.full_name;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.admin_allowlist enable row level security;
alter table public.trips          enable row level security;
alter table public.trip_members   enable row level security;
alter table public.travelers      enable row level security;
alter table public.activities     enable row level security;

-- profiles: you see yourself; admins see everyone. Writes go through RPCs.
create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: admin read all" on public.profiles
  for select using (public.is_admin());
create policy "profiles: admin update" on public.profiles
  for update using (public.is_admin());

-- admin_allowlist: admins only.
create policy "allowlist: admin all" on public.admin_allowlist
  for all using (public.is_admin()) with check (public.is_admin());

-- trips
create policy "trips: members read" on public.trips
  for select using (public.is_trip_member(id));
create policy "trips: approved users create" on public.trips
  for insert with check (public.is_approved() and created_by = auth.uid());
create policy "trips: owners update" on public.trips
  for update using (public.is_trip_owner(id));
create policy "trips: owners delete" on public.trips
  for delete using (public.is_trip_owner(id));

-- trip_members
create policy "members: members read" on public.trip_members
  for select using (public.is_trip_member(trip_id));
create policy "members: owners manage" on public.trip_members
  for all using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));

-- travelers
create policy "travelers: members read" on public.travelers
  for select using (public.is_trip_member(trip_id));
create policy "travelers: editors write" on public.travelers
  for all using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));

-- activities
create policy "activities: members read" on public.activities
  for select using (public.is_trip_member(trip_id));
create policy "activities: editors write" on public.activities
  for all using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));

-- ---------------------------------------------------------------------------
-- Realtime: the calendar subscribes to these tables.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.travelers;
alter publication supabase_realtime add table public.trip_members;

-- Needed so DELETE events carry the full old row (realtime filters by trip_id).
alter table public.activities replica identity full;
alter table public.travelers replica identity full;
alter table public.trip_members replica identity full;
