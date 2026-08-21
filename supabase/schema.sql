-- =============================================================================
-- Chalk Passport — full schema
-- =============================================================================
-- Fresh projects: paste this entire file into Supabase → SQL Editor → Run.
-- Live projects with stamps: run supabase/catalog-status.sql instead.
-- Do not re-run this file on a database that has real stamps — it DROPs
-- visit tables.
--
-- BREAKING: this DROPS old stamp tables (gym_visits / visits / gym catalog)
-- and recreates them. There is no visit-data migration. Profiles and Auth
-- users are kept.
--
-- Model:
--   gyms              shared brand (name + country + place_kind + climbing_types)
--                     status: pending | published | rejected
--   gym_outlets       locations of that brand (same status rule)
--   gym_catalog_seeds seeded names that are born published
--   gym_grade_scales  one grade chart per gym (numbers, colours, V-scale, custom)
--                     kind: v | font | french | yds | number | color | custom
--   gym_reports       eligible “this place looks wrong” flags
--   visits            private stamps (gym + outlet + climbing_type + grade + date)
--
-- Place kind: gym | rock
--   gyms.place_kind — Gym = artificial walls/holds (incl. outdoor plastic);
--                     Rock = natural stone (crags, cliffs, boulders)
--
-- Climbing types: bouldering | top_rope | lead
--   gyms.climbing_types  — what the place offers (1+); if only one, stamp UI skips the type step
--   visits.climbing_type — which discipline this stamp is for
--
-- Number / colour → V mapping lives on each band in gym_grade_scales.bands
-- and is copied onto visits.v_equiv when you stamp. Band JSON shape (ordered
-- easy → hard):
--   [
--     {"label":"4","v_equiv":"V1"},
--     {"label":"7","v_equiv":"V3","v_max":"V4"},
--     {"label":"White","color":"#f4f1ea","v_equiv":"V1"}
--   ]
--   label     required house-grade label (number, colour name, custom, …)
--   v_equiv   optional V-scale low (or only): VB | V0 … V17
--   v_max     optional V-scale high when the band is a range (e.g. V3–V4)
--   color     optional hex, for colour systems
--
-- Stamps store visits.v_equiv as the high end of the range for ranking.
--
-- After running:
-- 1) Authentication → Providers → Email: enabled
-- 2) Turn ON “Confirm email” (signup uses a real inbox for recovery)
-- 3) Authentication → URL Configuration: set Site URL, and add
--    {SITE_URL}/auth/confirm and {SITE_URL}/auth/callback to Redirect URLs
-- 4) Optional: update the Confirm signup email template to:
--    {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/passport
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tear down previous stamp tables (no visit data to keep)
-- ---------------------------------------------------------------------------
drop view if exists public.catalog_moderation;
drop table if exists public.gym_visits cascade;
drop table if exists public.gym_reports cascade;
drop table if exists public.visits cascade;
drop table if exists public.gym_grade_scales cascade;
drop table if exists public.gym_outlets cascade;
drop table if exists public.gyms cascade;
drop table if exists public.gym_catalog_seeds cascade;

-- ---------------------------------------------------------------------------
-- Profiles (linked to Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key,
  username text not null unique,
  email text,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (
    char_length(username) between 3 and 30
    and username ~ '^[a-z0-9_]+$'
  )
);

alter table public.profiles alter column id drop default;

alter table public.profiles
  add column if not exists email text;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (
  char_length(username) between 3 and 30
  and username ~ '^[a-z0-9_]+$'
);

alter table public.profiles drop constraint if exists profiles_email_format;
alter table public.profiles add constraint profiles_email_format check (
  email is null
  or (
    char_length(email) between 3 and 254
    and email = lower(email)
    and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  )
);

create unique index if not exists profiles_email_unique_idx
  on public.profiles (email)
  where email is not null;

-- Backfill emails from Auth for existing non-synthetic accounts.
update public.profiles p
set email = lower(u.email)
from auth.users u
where u.id = p.id
  and p.email is null
  and u.email is not null
  and u.email not like '%@chalk.local';

do $$
begin
  alter table public.profiles
    add constraint profiles_id_fkey
    foreign key (id) references auth.users (id) on delete cascade;
exception
  when duplicate_object then null;
  when others then
    raise notice 'Skipping profiles_id_fkey (%).', sqlerrm;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen text := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  contact text;
begin
  -- Skip until the climber picks a valid handle (incomplete signup).
  -- Do not fall back to the email local-part — many addresses contain dots.
  if chosen = ''
     or char_length(chosen) < 3
     or char_length(chosen) > 30
     or chosen !~ '^[a-z0-9_]+$' then
    return new;
  end if;

  contact := case
    when new.email is null then null
    when new.email like '%@chalk.local' then null
    else lower(new.email)
  end;

  insert into public.profiles (id, username, email)
  values (new.id, chosen, contact)
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Resolve username → auth email for password login (anon-safe; returns email only).
create or replace function public.resolve_login_email(identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := lower(trim(coalesce(identifier, '')));
  found text;
begin
  if normalized = '' then
    return null;
  end if;

  if position('@' in normalized) > 0 then
    return normalized;
  end if;

  select p.email into found
  from public.profiles p
  where p.username = normalized
    and p.email is not null;

  return found;
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated, service_role;

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles
    where username = lower(trim(coalesce(candidate, '')))
  );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated, service_role;

do $$
begin
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();
exception
  when others then
    raise notice 'Could not attach auth.users trigger (%). The app will insert profiles after signup.', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- Climbing type helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_climbing_type(value text)
returns boolean
language sql
immutable
as $$
  select value in ('bouldering', 'top_rope', 'lead');
$$;

create or replace function public.climbing_types_valid(types text[])
returns boolean
language sql
immutable
as $$
  select
    types is not null
    and cardinality(types) >= 1
    and cardinality(types) = (
      select count(distinct t)
      from unnest(types) as t
    )
    and not exists (
      select 1
      from unnest(types) as t
      where not public.is_climbing_type(t)
    );
$$;

revoke all on function public.is_climbing_type(text) from public, anon, authenticated;
revoke all on function public.climbing_types_valid(text[]) from public, anon, authenticated;
grant execute on function public.is_climbing_type(text) to authenticated, service_role;
grant execute on function public.climbing_types_valid(text[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Gyms (shared catalog — stamp picker reads these tables)
-- Add/remove gyms and outlets here or in Table Editor.
-- Closed and omitted (as of Aug 2026): Boruda, The Cliff (Snow City),
-- Project Send, Boulder World, Onsight, Origin Boulder, The Rock School,
-- Clip n Climb.
-- ---------------------------------------------------------------------------
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  place_kind text not null default 'gym',
  climbing_types text[] not null default array['bouldering']::text[],
  status text not null default 'pending',
  moderation_locked boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint gyms_name_len check (char_length(name) between 1 and 120),
  constraint gyms_country_len check (char_length(country) between 1 and 80),
  constraint gyms_place_kind_check check (place_kind in ('gym', 'rock')),
  constraint gyms_climbing_types_valid check (public.climbing_types_valid(climbing_types)),
  constraint gyms_status_check check (status in ('pending', 'published', 'rejected'))
);

create unique index gyms_name_country_live_idx
  on public.gyms (lower(name), lower(country))
  where status in ('pending', 'published');

-- ---------------------------------------------------------------------------
-- Outlets (one gym, several locations)
-- `name` is the gym's own label for that location (Bugis, Bendemeer), not the mall.
-- ---------------------------------------------------------------------------
create table public.gym_outlets (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  name text not null,
  city text not null,
  status text not null default 'pending',
  moderation_locked boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint gym_outlets_name_len check (char_length(name) between 1 and 80),
  constraint gym_outlets_city_len check (char_length(city) between 1 and 80),
  constraint gym_outlets_status_check check (status in ('pending', 'published', 'rejected'))
);

create unique index gym_outlets_gym_name_live_idx
  on public.gym_outlets (gym_id, lower(name))
  where status in ('pending', 'published');

-- Seeded names (SG gyms and known overseas outlets). Community inserts matching
-- these rows may be born published; everything else starts pending.
create table public.gym_catalog_seeds (
  gym_name text not null,
  country text not null,
  outlet_name text not null,
  city text not null,
  constraint gym_catalog_seeds_gym_name_len check (char_length(gym_name) between 1 and 120),
  constraint gym_catalog_seeds_country_len check (char_length(country) between 1 and 80),
  constraint gym_catalog_seeds_outlet_name_len check (char_length(outlet_name) between 1 and 80),
  constraint gym_catalog_seeds_city_len check (char_length(city) between 1 and 80)
);

create unique index gym_catalog_seeds_key_idx
  on public.gym_catalog_seeds (gym_name, country, outlet_name);

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

-- ---------------------------------------------------------------------------
-- Grade scale per gym (V-scale, Font, French, YDS, numbers, colours, custom)
-- bands: ordered easy→hard JSON array; each object maps label → v_equiv
-- ---------------------------------------------------------------------------
create or replace function public.is_v_grade(value text)
returns boolean
language sql
immutable
as $$
  select value is null
    or value ~ '^(VB|V([0-9]|1[0-7]))$';$$;

create or replace function public.grade_bands_valid(bands jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  el jsonb;
  v text;
begin
  if jsonb_typeof(bands) <> 'array' then
    return false;
  end if;

  for el in select value from jsonb_array_elements(bands) as t(value)
  loop
    if jsonb_typeof(el) <> 'object' then
      return false;
    end if;
    if length(trim(coalesce(el->>'label', ''))) = 0 then
      return false;
    end if;
    if length(coalesce(el->>'label', '')) > 40 then
      return false;
    end if;

    v := nullif(trim(coalesce(el->>'v_equiv', '')), '');
    if v is not null and not public.is_v_grade(v) then
      return false;
    end if;

    v := nullif(trim(coalesce(el->>'v_max', '')), '');
    if v is not null and not public.is_v_grade(v) then
      return false;
    end if;

    if el ? 'color'
      and el->>'color' is not null
      and el->>'color' !~ '^#[0-9A-Fa-f]{3,8}$'
    then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

revoke all on function public.is_v_grade(text) from public, anon, authenticated;
revoke all on function public.grade_bands_valid(jsonb) from public, anon, authenticated;
grant execute on function public.is_v_grade(text) to authenticated, service_role;
grant execute on function public.grade_bands_valid(jsonb) to authenticated, service_role;

create table public.gym_grade_scales (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null unique references public.gyms (id) on delete cascade,
  kind text not null constraint gym_grade_scales_kind_check
    check (kind in ('v', 'font', 'french', 'yds', 'number', 'color', 'custom')),
  bands jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint gym_grade_scales_bands_valid check (public.grade_bands_valid(bands))
);

-- ---------------------------------------------------------------------------
-- Visits (private stamps)
-- v_equiv: denormalised V-scale from the gym’s band map at stamp time
-- ---------------------------------------------------------------------------
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  gym_id uuid not null references public.gyms (id) on delete restrict,
  outlet_id uuid not null references public.gym_outlets (id) on delete restrict,
  climbing_type text not null,
  grade_system text not null constraint visits_grade_system_check
    check (grade_system in ('v', 'font', 'french', 'yds', 'number', 'color', 'custom')),
  highest_grade text not null,
  v_equiv text,
  notes text,
  video_path text, -- public TikTok / Instagram / YouTube URL only
  visited_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visits_climbing_type_check check (public.is_climbing_type(climbing_type)),
  constraint visits_grade_len check (char_length(highest_grade) between 1 and 40),
  constraint visits_v_equiv_format check (public.is_v_grade(v_equiv)),
  constraint visits_video_path_url check (
    video_path is null
    or (
      char_length(video_path) between 12 and 1000
      and video_path ~* '^https://'
    )
  )
);

create index visits_profile_id_idx on public.visits (profile_id);
create index visits_gym_id_idx on public.visits (gym_id);
create index visits_outlet_id_idx on public.visits (outlet_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists visits_set_updated_at on public.visits;
create trigger visits_set_updated_at
before update on public.visits
for each row
execute function public.set_updated_at();

create table public.gym_reports (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint gym_reports_unique unique (gym_id, profile_id)
);

create index gym_reports_gym_id_idx on public.gym_reports (gym_id);

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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.gyms enable row level security;
alter table public.gym_outlets enable row level security;
alter table public.gym_catalog_seeds enable row level security;
alter table public.gym_grade_scales enable row level security;
alter table public.visits enable row level security;
alter table public.gym_reports enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Authenticated can view gyms" on public.gyms;
drop policy if exists "Authenticated can create gyms" on public.gyms;
drop policy if exists "Creators can update gyms" on public.gyms;
drop policy if exists "Creators can update pending gyms" on public.gyms;
drop policy if exists "Authenticated can view outlets" on public.gym_outlets;
drop policy if exists "Authenticated can create outlets" on public.gym_outlets;
drop policy if exists "Creators can update pending outlets" on public.gym_outlets;
drop policy if exists "Authenticated can view catalog seeds" on public.gym_catalog_seeds;
drop policy if exists "Authenticated can view grade scales" on public.gym_grade_scales;
drop policy if exists "Authenticated can create grade scales" on public.gym_grade_scales;
drop policy if exists "Creators can update grade scales" on public.gym_grade_scales;
drop policy if exists "Users can view own visits" on public.visits;
drop policy if exists "Users can insert own visits" on public.visits;
drop policy if exists "Users can update own visits" on public.visits;
drop policy if exists "Users can delete own visits" on public.visits;
drop policy if exists "Users can view own reports" on public.gym_reports;
drop policy if exists "Eligible users can report gyms" on public.gym_reports;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

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

create policy "Authenticated can view catalog seeds"
  on public.gym_catalog_seeds for select
  to authenticated
  using (true);

create policy "Authenticated can view grade scales"
  on public.gym_grade_scales for select
  to authenticated
  using (true);

create policy "Authenticated can create grade scales"
  on public.gym_grade_scales for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Creators can update grade scales"
  on public.gym_grade_scales for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Users can view own visits"
  on public.visits for select
  to authenticated
  using (auth.uid() = profile_id);

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

create policy "Users can update own visits"
  on public.visits for update
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Users can delete own visits"
  on public.visits for delete
  to authenticated
  using (auth.uid() = profile_id);

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

-- ---------------------------------------------------------------------------
-- Grants (RLS still applies)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant all on table public.profiles to service_role;
grant all on table public.gyms to service_role;
grant all on table public.gym_outlets to service_role;
grant all on table public.gym_catalog_seeds to service_role;
grant all on table public.gym_grade_scales to service_role;
grant all on table public.visits to service_role;
grant all on table public.gym_reports to service_role;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.gyms to authenticated;
grant select, insert, update on table public.gym_outlets to authenticated;
grant select on table public.gym_catalog_seeds to authenticated;
grant select, insert, update on table public.gym_grade_scales to authenticated;
grant select, insert, update, delete on table public.visits to authenticated;
grant select, insert on table public.gym_reports to authenticated;

revoke all on table public.profiles from anon;
revoke all on table public.gyms from anon;
revoke all on table public.gym_outlets from anon;
revoke all on table public.gym_catalog_seeds from anon;
revoke all on table public.gym_grade_scales from anon;
revoke all on table public.visits from anon;
revoke all on table public.gym_reports from anon;

-- ---------------------------------------------------------------------------
-- No file storage. Stamp clips are public TikTok / Instagram / YouTube URLs
-- on visits.video_path. House grades are JSON on gym_grade_scales.bands.
--
-- Direct DELETE on storage.objects is blocked (Storage API only). Dropping
-- policies and making leftover buckets private stops uploads and public URLs.
-- Then delete gym-grade-charts and visit-media in Dashboard → Storage.
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated can upload grade charts" on storage.objects;
drop policy if exists "Anyone can view grade charts" on storage.objects;
drop policy if exists "Users can upload own visit media" on storage.objects;
drop policy if exists "Users can view own visit media" on storage.objects;
drop policy if exists "Users can update own visit media" on storage.objects;
drop policy if exists "Users can delete own visit media" on storage.objects;

update storage.buckets
set public = false
where id in ('gym-grade-charts', 'visit-media');

-- ---------------------------------------------------------------------------
-- Seed known gyms (shared catalog)
-- Keep in sync with src/lib/gymCatalog.ts KNOWN_GYMS.
-- Singapore list verified Aug 2026 against official hours / Maps-style listings.
-- Closed and omitted: Boruda, The Cliff (Snow City), Project Send (Esplanade,
-- last day 26 Jun 2025), Boulder World, Onsight, Origin Boulder,
-- The Rock School, Clip n Climb.
-- Kid playgrounds / gamified walls omitted: SuperPark, VertiClimb,
-- My Little Climbing Room.
-- ---------------------------------------------------------------------------
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
  ('Adventure HQ', 'Singapore', 'Khatib', 'Singapore');

with seeded as (
  insert into public.gyms (name, country, place_kind, climbing_types, status)
  values
    ('Boulder Planet', 'Singapore', 'gym', array['bouldering']::text[], 'published'),
    ('Boulder Planet', 'Indonesia', 'gym', array['bouldering']::text[], 'published'),
    ('Boulder Planet', 'Thailand', 'gym', array['bouldering']::text[], 'published'),
    ('Boulder Movement', 'Singapore', 'gym', array['bouldering']::text[], 'published'),
    ('Boulder+', 'Singapore', 'gym', array['bouldering']::text[], 'published'),
    ('BFF Climbing', 'Singapore', 'gym', array['bouldering']::text[], 'published'),
    ('Climb Central', 'Singapore', 'gym', array['bouldering', 'top_rope', 'lead']::text[], 'published'),
    ('Fit Bloc', 'Singapore', 'gym', array['bouldering', 'top_rope']::text[], 'published'),
    ('Kinetics Climbing', 'Singapore', 'gym', array['bouldering', 'top_rope']::text[], 'published'),
    ('Lighthouse', 'Singapore', 'gym', array['bouldering']::text[], 'published'),
    ('Climba', 'Singapore', 'gym', array['bouldering']::text[], 'published'),
    ('Ark Bloc', 'Singapore', 'gym', array['bouldering']::text[], 'published'),
    ('Ground Up', 'Singapore', 'gym', array['bouldering', 'top_rope', 'lead']::text[], 'published'),
    ('OYEYO Boulder Home', 'Singapore', 'gym', array['bouldering']::text[], 'published'),
    ('ClimbUp', 'Singapore', 'gym', array['bouldering', 'top_rope', 'lead']::text[], 'published'),
    ('Z-Vertigo', 'Singapore', 'gym', array['bouldering']::text[], 'published'),
    ('Outpost Climbing', 'Singapore', 'gym', array['bouldering', 'top_rope', 'lead']::text[], 'published'),
    ('Upwall Climbing', 'Singapore', 'gym', array['top_rope', 'lead']::text[], 'published'),
    ('Climb@T3', 'Singapore', 'gym', array['bouldering', 'top_rope']::text[], 'published'),
    ('SAFRA Yishun', 'Singapore', 'gym', array['bouldering', 'top_rope', 'lead']::text[], 'published'),
    ('Adventure HQ', 'Singapore', 'gym', array['bouldering', 'top_rope']::text[], 'published')
  returning id, name, country
)
insert into public.gym_outlets (gym_id, name, city, status)
select s.id, o.name, o.city, 'published'
from seeded s
join (
  values
    -- name = the gym's own outlet label; city = city (Singapore is a city-state)
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
) as o(gym_name, country, name, city)
  on o.gym_name = s.name and o.country = s.country;

-- House grades where the gym publishes a scale. v_equiv is only filled when a
-- community / gym chart is documented; otherwise the picker still has labels.
insert into public.gym_grade_scales (gym_id, kind, bands)
select g.id, s.kind, s.bands::jsonb
from public.gyms g
join (
  values
    (
      'Boulder Planet',
      'number',
      -- Official 1–12. Community: 4≈V1 … 12≈V9 (1–3 below V1).
      '[{"label":"1","v_equiv":"VB"},{"label":"2","v_equiv":"VB"},{"label":"3","v_equiv":"V0"},{"label":"4","v_equiv":"V1"},{"label":"5","v_equiv":"V2"},{"label":"6","v_equiv":"V3"},{"label":"7","v_equiv":"V4"},{"label":"8","v_equiv":"V5"},{"label":"9","v_equiv":"V6"},{"label":"10","v_equiv":"V7"},{"label":"11","v_equiv":"V8"},{"label":"12","v_equiv":"V9"}]'
    ),
    (
      'Boulder Movement',
      'custom',
      -- 1–20 then Flux 1–5. V mapping is too coarse / conflicting; labels only.
      '[{"label":"1"},{"label":"2"},{"label":"3"},{"label":"4"},{"label":"5"},{"label":"6"},{"label":"7"},{"label":"8"},{"label":"9"},{"label":"10"},{"label":"11"},{"label":"12"},{"label":"13"},{"label":"14"},{"label":"15"},{"label":"16"},{"label":"17"},{"label":"18"},{"label":"19"},{"label":"20"},{"label":"Flux 1"},{"label":"Flux 2"},{"label":"Flux 3"},{"label":"Flux 4"},{"label":"Flux 5"}]'
    ),
    (
      'BFF Climbing',
      'number',
      -- 1–15 with two house grades per V step; 15≈V8
      '[{"label":"1","v_equiv":"V1"},{"label":"2","v_equiv":"V1"},{"label":"3","v_equiv":"V2"},{"label":"4","v_equiv":"V2"},{"label":"5","v_equiv":"V3"},{"label":"6","v_equiv":"V3"},{"label":"7","v_equiv":"V4"},{"label":"8","v_equiv":"V4"},{"label":"9","v_equiv":"V5"},{"label":"10","v_equiv":"V5"},{"label":"11","v_equiv":"V6"},{"label":"12","v_equiv":"V6"},{"label":"13","v_equiv":"V7"},{"label":"14","v_equiv":"V7"},{"label":"15","v_equiv":"V8"}]'
    ),
    (
      'Boulder+',
      'color',
      -- White→Black; black≈V8
      '[{"label":"White","color":"#f4f1ea","v_equiv":"V1"},{"label":"Yellow","color":"#f2c94c","v_equiv":"V2"},{"label":"Red","color":"#eb5757","v_equiv":"V3"},{"label":"Blue","color":"#2f80ed","v_equiv":"V4"},{"label":"Purple","color":"#9b51e0","v_equiv":"V5"},{"label":"Green","color":"#27ae60","v_equiv":"V6"},{"label":"Pink","color":"#e86ba8","v_equiv":"V7"},{"label":"Black","color":"#1b1b1b","v_equiv":"V8"}]'
    ),
    (
      'Lighthouse',
      'number',
      '[{"label":"1","v_equiv":"V1"},{"label":"2","v_equiv":"V2"},{"label":"3","v_equiv":"V3"},{"label":"4","v_equiv":"V4"},{"label":"5","v_equiv":"V5"},{"label":"6","v_equiv":"V6"},{"label":"7","v_equiv":"V7"},{"label":"8","v_equiv":"V8"},{"label":"9","v_equiv":"V9"}]'
    ),
    (
      'Fit Bloc',
      'custom',
      -- Official bar icons (0 easiest → 5 hardest). No reliable V chart.
      '[{"label":"0 bar"},{"label":"1 bar"},{"label":"2 bar"},{"label":"3 bar"},{"label":"4 bar"},{"label":"5 bar"}]'
    ),
    (
      'Kinetics Climbing',
      'v',
      '[{"label":"V0","v_equiv":"V0"},{"label":"V1","v_equiv":"V1"},{"label":"V2","v_equiv":"V2"},{"label":"V3","v_equiv":"V3"},{"label":"V4","v_equiv":"V4"},{"label":"V5","v_equiv":"V5"},{"label":"V6","v_equiv":"V6"},{"label":"V7","v_equiv":"V7"},{"label":"V8","v_equiv":"V8"}]'
    ),
    (
      'Ground Up',
      'v',
      '[{"label":"V1","v_equiv":"V1"},{"label":"V2","v_equiv":"V2"},{"label":"V3","v_equiv":"V3"},{"label":"V4","v_equiv":"V4"},{"label":"V5","v_equiv":"V5"},{"label":"V6","v_equiv":"V6"},{"label":"V7","v_equiv":"V7"},{"label":"V8","v_equiv":"V8"}]'
    ),
    (
      'Climba',
      'color',
      -- Blue / Yellow / Red ladders (community ranges)
      '[{"label":"Blue","color":"#2f80ed","v_equiv":"V1","v_max":"V2"},{"label":"Yellow","color":"#f2c94c","v_equiv":"V3","v_max":"V4"},{"label":"Red","color":"#eb5757","v_equiv":"V5","v_max":"V6"}]'
    ),
    (
      'Climb@T3',
      'french',
      -- Changi lists French 4+–6c+ on the high wall
      '[{"label":"4a"},{"label":"4b"},{"label":"4c"},{"label":"5a"},{"label":"5b"},{"label":"5c"},{"label":"6a"},{"label":"6a+"},{"label":"6b"},{"label":"6b+"},{"label":"6c"},{"label":"6c+"}]'
    )
) as s(gym_name, kind, bands) on s.gym_name = g.name;

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
