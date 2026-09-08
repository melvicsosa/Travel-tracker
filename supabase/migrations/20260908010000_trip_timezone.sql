-- Each trip has a time zone; the "now" line and auto-scroll use it.
alter table public.trips
  add column if not exists timezone text not null default 'America/New_York';
