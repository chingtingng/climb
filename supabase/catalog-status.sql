-- =============================================================================
-- Additive: Unverified until a second climber stamps
-- =============================================================================
-- Run this on a project that already has stamps. Do NOT re-run schema.sql
-- (that file still drops visit tables).
--
-- New gyms/outlets start pending and stay in search. Two distinct stampers
-- publish the row. Three eligible reports hide it (rejected). Seeded catalog
-- names start published. Table Editor: set status + moderation_locked.
-- =============================================================================

create table if not exists public.gym_catalog_seeds (
  gym_name text not null,
  country text not null,
  outlet_name text not null,
  city text not null,
  constraint gym_catalog_seeds_gym_name_len check (char_length(gym_name) between 1 and 120),
  constraint gym_catalog_seeds_country_len check (char_length(country) between 1 and 80),
  constraint gym_catalog_seeds_outlet_name_len check (char_length(outlet_name) between 1 and 80),
  constraint gym_catalog_seeds_city_len check (char_length(city) between 1 and 80)
);

create unique index if not exists gym_catalog_seeds_key_idx
  on public.gym_catalog_seeds (gym_name, country, outlet_name);

alter table public.gym_catalog_seeds enable row level security;

drop policy if exists "Authenticated can view catalog seeds" on public.gym_catalog_seeds;
create policy "Authenticated can view catalog seeds"
  on public.gym_catalog_seeds for select
  to authenticated
  using (true);

insert into public.gym_catalog_seeds (gym_name, country, outlet_name, city)
values
  ('Boulder Planet', 'Singapore', 'Sembawang', 'Singapore'),
  ('Boulder Planet', 'Singapore', 'Tai Seng', 'Singapore'),
  ('Boulder Planet', 'Indonesia', 'Central Park', 'Jakarta'),
  ('Boulder Planet', 'Thailand', 'Future Park Rangsit', 'Bangkok'),
  ('Boulder Movement', 'Singapore', 'Bugis', 'Singapore'),
  ('Boulder Movement', 'Singapore', 'Rochor', 'Singapore'),
  ('Boulder Movement', 'Singapore', 'Downtown', 'Singapore'),
  ('Boulder Movement', 'Singapore', 'Tai Seng', 'Singapore'),
  ('Boulder+', 'Singapore', 'Aperia', 'Singapore'),
  ('Boulder+', 'Singapore', 'Chevrons', 'Singapore'),
  ('BFF Climbing', 'Singapore', 'Bendemeer', 'Singapore'),
  ('BFF Climbing', 'Singapore', 'Tampines Yoha', 'Singapore'),
  ('BFF Climbing', 'Singapore', 'Tampines Hub', 'Singapore'),
  ('Climb Central', 'Singapore', 'The Kallang', 'Singapore'),
  ('Climb Central', 'Singapore', 'Funan', 'Singapore'),
  ('Climb Central', 'Singapore', 'Novena', 'Singapore'),
  ('Climb Central', 'Singapore', 'SAFRA Choa Chu Kang', 'Singapore'),
  ('Fit Bloc', 'Singapore', 'Kent Ridge', 'Singapore'),
  ('Fit Bloc', 'Singapore', 'Depot Heights', 'Singapore'),
  ('Fit Bloc', 'Singapore', 'Telok Ayer', 'Singapore'),
  ('Kinetics Climbing', 'Singapore', 'Serangoon', 'Singapore'),
  ('Lighthouse', 'Singapore', 'Pasir Panjang', 'Singapore'),
  ('Climba', 'Singapore', 'Robinson', 'Singapore'),
  ('Ark Bloc', 'Singapore', 'Punggol', 'Singapore'),
  ('Ground Up', 'Singapore', 'Tessensohn', 'Singapore'),
  ('OYEYO Boulder Home', 'Singapore', 'Mackenzie', 'Singapore'),
  ('ClimbUp', 'Singapore', 'Katong', 'Singapore'),
  ('Z-Vertigo', 'Singapore', 'Bukit Timah', 'Singapore'),
  ('Outpost Climbing', 'Singapore', 'Lavender', 'Singapore'),
  ('Upwall Climbing', 'Singapore', 'Downtown East', 'Singapore'),
  ('Climb@T3', 'Singapore', 'T3', 'Singapore'),
  ('SAFRA Yishun', 'Singapore', 'Yishun', 'Singapore'),
  ('Adventure HQ', 'Singapore', 'Khatib', 'Singapore')
on conflict (gym_name, country, outlet_name) do nothing;

alter table public.gyms
  add column if not exists status text not null default 'pending';
alter table public.gyms
  add column if not exists moderation_locked boolean not null default false;

alter table public.gym_outlets
  add column if not exists status text not null default 'pending';
alter table public.gym_outlets
  add column if not exists moderation_locked boolean not null default false;

alter table public.gyms drop constraint if exists gyms_status_check;
alter table public.gyms add constraint gyms_status_check
  check (status in ('pending', 'published', 'rejected'));

alter table public.gym_outlets drop constraint if exists gym_outlets_status_check;
alter table public.gym_outlets add constraint gym_outlets_status_check
  check (status in ('pending', 'published', 'rejected'));

drop index if exists public.gyms_name_country_idx;
create unique index if not exists gyms_name_country_live_idx
  on public.gyms (lower(name), lower(country))
  where status in ('pending', 'published');

drop index if exists public.gym_outlets_gym_name_idx;
create unique index if not exists gym_outlets_gym_name_live_idx
  on public.gym_outlets (gym_id, lower(name))
  where status in ('pending', 'published');

create or replace function public.is_catalog_seed_gym(p_name text, p_country text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.gym_catalog_seeds s
    where lower(s.gym_name) = lower(trim(coalesce(p_name, '')))
      and lower(s.country) = lower(trim(coalesce(p_country, '')))
  );
$$;

create or replace function public.is_catalog_seed_outlet(p_gym_id uuid, p_outlet_name text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.gyms g
    join public.gym_catalog_seeds s
      on lower(s.gym_name) = lower(g.name)
     and lower(s.country) = lower(g.country)
    where g.id = p_gym_id
      and lower(s.outlet_name) = lower(trim(coalesce(p_outlet_name, '')))
  );
$$;

revoke all on function public.is_catalog_seed_gym(text, text) from public;
revoke all on function public.is_catalog_seed_outlet(uuid, text) from public;
grant execute on function public.is_catalog_seed_gym(text, text) to authenticated, service_role;
grant execute on function public.is_catalog_seed_outlet(uuid, text) to authenticated, service_role;

-- Seed names + places that already have two stampers are published.
update public.gyms g
set status = 'published'
where g.status = 'pending'
  and (
    public.is_catalog_seed_gym(g.name, g.country)
    or (
      select count(distinct v.profile_id)
      from public.visits v
      where v.gym_id = g.id
    ) >= 2
  );

update public.gym_outlets o
set status = 'published'
where o.status = 'pending'
  and (
    public.is_catalog_seed_outlet(o.gym_id, o.name)
    or (
      select count(distinct v.profile_id)
      from public.visits v
      where v.outlet_id = o.id
    ) >= 2
  );

create table if not exists public.gym_reports (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint gym_reports_unique unique (gym_id, profile_id)
);

create index if not exists gym_reports_gym_id_idx on public.gym_reports (gym_id);

alter table public.gym_reports enable row level security;

create or replace function public.sync_catalog_publish_from_visit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gyms g
  set status = 'published'
  where g.id = new.gym_id
    and g.status = 'pending'
    and g.moderation_locked = false
    and (
      select count(distinct v.profile_id)
      from public.visits v
      where v.gym_id = new.gym_id
    ) >= 2;

  update public.gym_outlets o
  set status = 'published'
  where o.id = new.outlet_id
    and o.status = 'pending'
    and o.moderation_locked = false
    and (
      select count(distinct v.profile_id)
      from public.visits v
      where v.outlet_id = new.outlet_id
    ) >= 2;

  return new;
end;
$$;

revoke all on function public.sync_catalog_publish_from_visit() from public, anon, authenticated;

drop trigger if exists visits_sync_catalog_publish on public.visits;
create trigger visits_sync_catalog_publish
after insert or update of gym_id, outlet_id on public.visits
for each row
execute function public.sync_catalog_publish_from_visit();

create or replace function public.sync_catalog_reject_from_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gyms g
  set status = 'rejected'
  where g.id = new.gym_id
    and g.moderation_locked = false
    and g.status in ('pending', 'published')
    and (
      select count(*)
      from public.gym_reports r
      where r.gym_id = new.gym_id
    ) >= 3;

  return new;
end;
$$;

revoke all on function public.sync_catalog_reject_from_report() from public, anon, authenticated;

drop trigger if exists gym_reports_sync_catalog_reject on public.gym_reports;
create trigger gym_reports_sync_catalog_reject
after insert on public.gym_reports
for each row
execute function public.sync_catalog_reject_from_report();

drop policy if exists "Authenticated can view gyms" on public.gyms;
drop policy if exists "Authenticated can create gyms" on public.gyms;
drop policy if exists "Creators can update gyms" on public.gyms;
drop policy if exists "Creators can update pending gyms" on public.gyms;

create policy "Authenticated can view gyms"
  on public.gyms for select
  to authenticated
  using (
    status in ('pending', 'published')
    or exists (
      select 1
      from public.visits v
      where v.gym_id = gyms.id
        and v.profile_id = auth.uid()
    )
  );

create policy "Authenticated can create gyms"
  on public.gyms for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      (status = 'pending' and not public.is_catalog_seed_gym(name, country))
      or (status = 'published' and public.is_catalog_seed_gym(name, country))
    )
    and moderation_locked = false
  );

create policy "Creators can update pending gyms"
  on public.gyms for update
  to authenticated
  using (
    created_by = auth.uid()
    and status = 'pending'
    and moderation_locked = false
  )
  with check (
    created_by = auth.uid()
    and status = 'pending'
    and moderation_locked = false
  );

drop policy if exists "Authenticated can view outlets" on public.gym_outlets;
drop policy if exists "Authenticated can create outlets" on public.gym_outlets;
drop policy if exists "Creators can update pending outlets" on public.gym_outlets;

create policy "Authenticated can view outlets"
  on public.gym_outlets for select
  to authenticated
  using (
    status in ('pending', 'published')
    or exists (
      select 1
      from public.visits v
      where v.outlet_id = gym_outlets.id
        and v.profile_id = auth.uid()
    )
  );

create policy "Authenticated can create outlets"
  on public.gym_outlets for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      (status = 'pending' and not public.is_catalog_seed_outlet(gym_id, name))
      or (status = 'published' and public.is_catalog_seed_outlet(gym_id, name))
    )
    and moderation_locked = false
  );

create policy "Creators can update pending outlets"
  on public.gym_outlets for update
  to authenticated
  using (
    created_by = auth.uid()
    and status = 'pending'
    and moderation_locked = false
  )
  with check (
    created_by = auth.uid()
    and status = 'pending'
    and moderation_locked = false
  );

drop policy if exists "Users can insert own visits" on public.visits;

create policy "Users can insert own visits"
  on public.visits for insert
  to authenticated
  with check (
    auth.uid() = profile_id
    and exists (
      select 1
      from public.gyms g
      where g.id = gym_id
        and g.status in ('pending', 'published')
    )
    and exists (
      select 1
      from public.gym_outlets o
      where o.id = outlet_id
        and o.gym_id = gym_id
        and o.status in ('pending', 'published')
    )
  );

drop policy if exists "Users can view own reports" on public.gym_reports;
drop policy if exists "Eligible users can report gyms" on public.gym_reports;

create policy "Users can view own reports"
  on public.gym_reports for select
  to authenticated
  using (profile_id = auth.uid());

create policy "Eligible users can report gyms"
  on public.gym_reports for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.gyms g
      where g.id = gym_id
        and g.status in ('pending', 'published')
        and g.created_by is distinct from auth.uid()
    )
    and exists (
      select 1
      from public.visits v
      join public.gyms pg on pg.id = v.gym_id
      where v.profile_id = auth.uid()
        and pg.status = 'published'
    )
  );

grant select on table public.gym_catalog_seeds to authenticated, service_role;
grant all on table public.gym_catalog_seeds to service_role;

grant select, insert on table public.gym_reports to authenticated;
grant all on table public.gym_reports to service_role;

revoke all on table public.gym_catalog_seeds from anon;
revoke all on table public.gym_reports from anon;

create or replace view public.catalog_moderation
with (security_invoker = true) as
select
  g.id,
  g.name,
  g.country,
  g.status,
  g.moderation_locked,
  g.created_by,
  g.created_at,
  (
    select count(distinct v.profile_id)
    from public.visits v
    where v.gym_id = g.id
  ) as stamper_count,
  (
    select count(*)
    from public.gym_reports r
    where r.gym_id = g.id
  ) as report_count
from public.gyms g;

revoke all on table public.catalog_moderation from public, anon, authenticated;
grant select on table public.catalog_moderation to service_role;
