-- =============================================================================
-- Chalk Passport — full schema
-- =============================================================================
-- Paste this entire file into Supabase → SQL Editor → Run.
--
-- BREAKING: this DROPS old stamp tables (gym_visits / visits / gym catalog)
-- and recreates them. There is no visit-data migration. Profiles and Auth
-- users are kept.
--
-- Model:
--   gyms              shared brand (name + country)
--   gym_outlets       locations of that brand
--   gym_grade_scales  one grade chart per gym (+ optional photo path)
--   visits            private stamps (gym_id + outlet_id + grade + date)
--
-- After running:
-- 1) Authentication → Providers → Email: enabled
-- 2) Turn OFF “Confirm email” (usernames map to you@chalk.local)
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tear down previous stamp tables (no visit data to keep)
-- ---------------------------------------------------------------------------
drop table if exists public.gym_visits cascade;
drop table if exists public.visits cascade;
drop table if exists public.gym_grade_scales cascade;
drop table if exists public.gym_outlets cascade;
drop table if exists public.gyms cascade;

-- ---------------------------------------------------------------------------
-- Profiles (linked to Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key,
  username text not null unique,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (
    char_length(username) between 3 and 30
    and username ~ '^[a-z0-9_]+$'
  )
);

alter table public.profiles alter column id drop default;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (
  char_length(username) between 3 and 30
  and username ~ '^[a-z0-9_]+$'
);

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
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    lower(coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

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
-- Gyms (shared catalog)
-- ---------------------------------------------------------------------------
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint gyms_name_len check (char_length(name) between 1 and 120),
  constraint gyms_country_len check (char_length(country) between 1 and 80)
);

create unique index gyms_name_country_idx
  on public.gyms (lower(name), lower(country));

-- ---------------------------------------------------------------------------
-- Outlets (one gym, several locations)
-- ---------------------------------------------------------------------------
create table public.gym_outlets (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  name text not null,
  city text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint gym_outlets_name_len check (char_length(name) between 1 and 80),
  constraint gym_outlets_city_len check (char_length(city) between 1 and 80)
);

create unique index gym_outlets_gym_name_idx
  on public.gym_outlets (gym_id, lower(name));

-- ---------------------------------------------------------------------------
-- Grade scale per gym (numbers, colours, V-scale, custom, …)
-- ---------------------------------------------------------------------------
create table public.gym_grade_scales (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null unique references public.gyms (id) on delete cascade,
  kind text not null check (kind in ('v', 'font', 'french', 'number', 'color', 'custom')),
  bands jsonb not null default '[]'::jsonb,
  chart_path text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Visits (private stamps)
-- ---------------------------------------------------------------------------
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  gym_id uuid not null references public.gyms (id) on delete restrict,
  outlet_id uuid not null references public.gym_outlets (id) on delete restrict,
  grade_system text not null check (grade_system in ('v', 'font', 'french', 'number', 'color', 'custom')),
  highest_grade text not null,
  v_equiv text,
  notes text,
  visited_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visits_grade_len check (char_length(highest_grade) between 1 and 40)
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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.gyms enable row level security;
alter table public.gym_outlets enable row level security;
alter table public.gym_grade_scales enable row level security;
alter table public.visits enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Authenticated can view gyms" on public.gyms;
drop policy if exists "Authenticated can create gyms" on public.gyms;
drop policy if exists "Creators can update gyms" on public.gyms;
drop policy if exists "Authenticated can view outlets" on public.gym_outlets;
drop policy if exists "Authenticated can create outlets" on public.gym_outlets;
drop policy if exists "Authenticated can view grade scales" on public.gym_grade_scales;
drop policy if exists "Authenticated can create grade scales" on public.gym_grade_scales;
drop policy if exists "Creators can update grade scales" on public.gym_grade_scales;
drop policy if exists "Users can view own visits" on public.visits;
drop policy if exists "Users can insert own visits" on public.visits;
drop policy if exists "Users can update own visits" on public.visits;
drop policy if exists "Users can delete own visits" on public.visits;

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
  using (true);

create policy "Authenticated can create gyms"
  on public.gyms for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Creators can update gyms"
  on public.gyms for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Authenticated can view outlets"
  on public.gym_outlets for select
  to authenticated
  using (true);

create policy "Authenticated can create outlets"
  on public.gym_outlets for insert
  to authenticated
  with check (created_by = auth.uid());

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
  with check (auth.uid() = profile_id);

create policy "Users can update own visits"
  on public.visits for update
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Users can delete own visits"
  on public.visits for delete
  to authenticated
  using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- Grants (RLS still applies)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant all on table public.profiles to service_role;
grant all on table public.gyms to service_role;
grant all on table public.gym_outlets to service_role;
grant all on table public.gym_grade_scales to service_role;
grant all on table public.visits to service_role;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.gyms to authenticated;
grant select, insert, update on table public.gym_outlets to authenticated;
grant select, insert, update on table public.gym_grade_scales to authenticated;
grant select, insert, update, delete on table public.visits to authenticated;

revoke all on table public.profiles from anon;
revoke all on table public.gyms from anon;
revoke all on table public.gym_outlets from anon;
revoke all on table public.gym_grade_scales from anon;
revoke all on table public.visits from anon;

-- ---------------------------------------------------------------------------
-- Storage: grade-chart photos
-- Public read (wall charts). Authenticated upload only under {user id}/…
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gym-grade-charts',
  'gym-grade-charts',
  true,
  8388608,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated can upload grade charts" on storage.objects;
drop policy if exists "Anyone can view grade charts" on storage.objects;

create policy "Authenticated can upload grade charts"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'gym-grade-charts'
    and name like auth.uid()::text || '/%'
  );

create policy "Anyone can view grade charts"
  on storage.objects for select
  using (bucket_id = 'gym-grade-charts');

-- ---------------------------------------------------------------------------
-- Seed known Singapore gyms (shared catalog)
-- ---------------------------------------------------------------------------
with seeded as (
  insert into public.gyms (name, country)
  values
    ('Boulder Planet', 'Singapore'),
    ('BFF Climbing', 'Singapore'),
    ('Boulder+', 'Singapore'),
    ('Lighthouse', 'Singapore'),
    ('Fit Bloc', 'Singapore'),
    ('Ground Up', 'Singapore'),
    ('Boruda', 'Singapore'),
    ('Climba', 'Singapore')
  returning id, name
)
insert into public.gym_outlets (gym_id, name, city)
select s.id, o.name, o.city
from seeded s
join (
  values
    ('Boulder Planet', 'Sembawang', 'Singapore'),
    ('Boulder Planet', 'Tai Seng', 'Singapore'),
    ('BFF Climbing', 'BFF', 'Singapore'),
    ('Boulder+', 'Boulder+', 'Singapore'),
    ('Lighthouse', 'Lighthouse', 'Singapore'),
    ('Fit Bloc', 'Fit Bloc', 'Singapore'),
    ('Ground Up', 'Ground Up', 'Singapore'),
    ('Boruda', 'Boruda', 'Singapore'),
    ('Climba', 'Climba', 'Singapore')
) as o(gym_name, name, city) on o.gym_name = s.name;

insert into public.gym_grade_scales (gym_id, kind, bands)
select g.id, s.kind, s.bands::jsonb
from public.gyms g
join (
  values
    (
      'Boulder Planet',
      'number',
      '[{"label":"4","v_equiv":"V1"},{"label":"5","v_equiv":"V2"},{"label":"6","v_equiv":"V3"},{"label":"7","v_equiv":"V4"},{"label":"8","v_equiv":"V5"},{"label":"9","v_equiv":"V6"},{"label":"10","v_equiv":"V7"},{"label":"11","v_equiv":"V8"},{"label":"12","v_equiv":"V9"}]'
    ),
    (
      'BFF Climbing',
      'number',
      '[{"label":"1","v_equiv":"V1"},{"label":"2","v_equiv":"V1"},{"label":"3","v_equiv":"V2"},{"label":"4","v_equiv":"V2"},{"label":"5","v_equiv":"V3"},{"label":"6","v_equiv":"V3"},{"label":"7","v_equiv":"V4"},{"label":"8","v_equiv":"V4"},{"label":"9","v_equiv":"V5"},{"label":"10","v_equiv":"V5"},{"label":"11","v_equiv":"V6"},{"label":"12","v_equiv":"V6"},{"label":"13","v_equiv":"V7"},{"label":"14","v_equiv":"V7"},{"label":"15","v_equiv":"V8"}]'
    ),
    (
      'Boulder+',
      'color',
      '[{"label":"White","color":"#f4f1ea","v_equiv":"V1"},{"label":"Yellow","color":"#f2c94c","v_equiv":"V2"},{"label":"Red","color":"#eb5757","v_equiv":"V3"},{"label":"Blue","color":"#2f80ed","v_equiv":"V4"},{"label":"Purple","color":"#9b51e0","v_equiv":"V5"},{"label":"Green","color":"#27ae60","v_equiv":"V6"},{"label":"Pink","color":"#e86ba8","v_equiv":"V7"},{"label":"Black","color":"#1b1b1b","v_equiv":"V8"}]'
    ),
    (
      'Lighthouse',
      'number',
      '[{"label":"1","v_equiv":"V1"},{"label":"2","v_equiv":"V2"},{"label":"3","v_equiv":"V3"},{"label":"4","v_equiv":"V4"},{"label":"5","v_equiv":"V5"},{"label":"6","v_equiv":"V6"},{"label":"7","v_equiv":"V7"},{"label":"8","v_equiv":"V8"},{"label":"9","v_equiv":"V9"}]'
    ),
    (
      'Fit Bloc',
      'number',
      '[{"label":"1","v_equiv":"V1"},{"label":"2","v_equiv":"V2"},{"label":"3","v_equiv":"V3"},{"label":"4","v_equiv":"V4"},{"label":"5","v_equiv":"V5"},{"label":"6","v_equiv":"V6"},{"label":"7","v_equiv":"V7"},{"label":"8","v_equiv":"V8"}]'
    ),
    (
      'Ground Up',
      'v',
      '[{"label":"V1","v_equiv":"V1"},{"label":"V2","v_equiv":"V2"},{"label":"V3","v_equiv":"V3"},{"label":"V4","v_equiv":"V4"},{"label":"V5","v_equiv":"V5"},{"label":"V6","v_equiv":"V6"},{"label":"V7","v_equiv":"V7"},{"label":"V8","v_equiv":"V8"}]'
    ),
    (
      'Boruda',
      'custom',
      '[{"label":"7Q","v_equiv":"V1"},{"label":"6Q","v_equiv":"V2"},{"label":"5Q","v_equiv":"V3"},{"label":"4Q","v_equiv":"V4"},{"label":"3Q","v_equiv":"V5"},{"label":"2Q","v_equiv":"V6"},{"label":"1Q","v_equiv":"V7"},{"label":"1D","v_equiv":"V8"},{"label":"2D","v_equiv":"V9"}]'
    ),
    (
      'Climba',
      'color',
      '[{"label":"Blue","color":"#2f80ed","v_equiv":"V2"},{"label":"Yellow","color":"#f2c94c","v_equiv":"V4"},{"label":"Red","color":"#eb5757","v_equiv":"V6"}]'
    )
) as s(gym_name, kind, bands) on s.gym_name = g.name;
