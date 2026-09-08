-- Invitations by email for people who have not signed in yet.
--
-- Before this migration an owner could only add users who already had an
-- approved profile. Now:
--   * If the email belongs to an approved user → added as member right away.
--   * If it belongs to a pending user and the inviter is an admin → approved
--     and added.
--   * Otherwise → stored in trip_invites; when that person signs in with
--     Google, the trigger turns the invite into a membership (and approves
--     the profile if an admin sent the invite).

create table if not exists public.trip_invites (
  trip_id    uuid not null references public.trips (id) on delete cascade,
  email      text not null,
  role       public.trip_role not null default 'editor',
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (trip_id, email)
);
create index if not exists trip_invites_email_idx on public.trip_invites (lower(email));

alter table public.trip_invites enable row level security;
drop policy if exists "invites: members read" on public.trip_invites;
create policy "invites: members read" on public.trip_invites
  for select using (public.is_trip_member(trip_id));
drop policy if exists "invites: owners manage" on public.trip_invites;
create policy "invites: owners manage" on public.trip_invites
  for all using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));

alter table public.trip_invites replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_invites'
  ) then
    alter publication supabase_realtime add table public.trip_invites;
  end if;
end $$;

-- Replaces the previous version: never fails for unknown emails.
-- Returns 'added' or 'invited'. The return type changed, so drop first.
drop function if exists public.add_trip_member_by_email(uuid, text, public.trip_role);
create or replace function public.add_trip_member_by_email(
  p_trip_id uuid,
  p_email text,
  p_role public.trip_role default 'editor'
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_user  public.profiles;
  v_email text := lower(trim(p_email));
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  select * into v_user from public.profiles where lower(email) = v_email;

  if v_user.id is not null then
    -- Admins vouch for whoever they invite.
    if v_user.status <> 'approved' and public.is_admin() then
      update public.profiles
      set status = 'approved', approved_at = now(), approved_by = auth.uid()
      where id = v_user.id;
      v_user.status := 'approved';
    end if;

    if v_user.status = 'approved' then
      insert into public.trip_members (trip_id, user_id, role, added_by)
      values (p_trip_id, v_user.id, p_role, auth.uid())
      on conflict (trip_id, user_id) do update set role = excluded.role;
      delete from public.trip_invites where trip_id = p_trip_id and lower(email) = v_email;
      return 'added';
    end if;
  end if;

  insert into public.trip_invites (trip_id, email, role, invited_by)
  values (p_trip_id, v_email, p_role, auth.uid())
  on conflict (trip_id, email) do update set role = excluded.role, invited_by = excluded.invited_by;
  return 'invited';
end;
$$;

-- New sign-ins: create the profile, then honour any pending invites.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_is_admin   boolean;
  v_invited_by_admin boolean;
begin
  v_is_admin := exists (select 1 from public.admin_allowlist where lower(email) = lower(new.email))
             or not exists (select 1 from public.profiles);

  v_invited_by_admin := exists (
    select 1 from public.trip_invites i
    join public.profiles p on p.id = i.invited_by
    where lower(i.email) = lower(new.email) and p.is_admin
  );

  insert into public.profiles (id, email, full_name, avatar_url, is_admin, status, approved_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    v_is_admin,
    case when v_is_admin or v_invited_by_admin then 'approved'::public.user_status else 'pending' end,
    case when v_is_admin or v_invited_by_admin then now() end
  );

  insert into public.trip_members (trip_id, user_id, role, added_by)
  select i.trip_id, new.id, i.role, i.invited_by
  from public.trip_invites i
  where lower(i.email) = lower(new.email)
  on conflict (trip_id, user_id) do nothing;

  delete from public.trip_invites where lower(email) = lower(new.email);
  return new;
end;
$$;
