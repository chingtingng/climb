-- Chalk Passport schema
-- Re-run this entire script in the Supabase SQL Editor.
--
-- This fixes: permission denied for table profiles
-- (tables were created with RLS + no GRANTs to API roles).
-- It also switches accounts to username + password via Supabase Auth.
--
-- After running:
-- 1) Authentication → Providers → Email: enabled
-- 2) Turn OFF “Confirm email” (usernames map to synthetic emails like you@chalk.local)

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key,
  username text not null unique,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (
    char_length(username) between 3 and 30
    and username ~ '^[a-z0-9_]+$'
  )
);

create table if not exists public.gym_visits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  gym_name text not null,
  country text not null,
  city text not null,
  grade_system text not null check (grade_system in ('v', 'font', 'french')),
  highest_grade text not null,
  notes text,
  visited_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gym_visits_gym_name_len check (char_length(gym_name) between 1 and 120),
  constraint gym_visits_country_len check (char_length(country) between 1 and 80),
  constraint gym_visits_city_len check (char_length(city) between 1 and 80),
  constraint gym_visits_grade_len check (char_length(highest_grade) between 1 and 16)
);

create index if not exists gym_visits_profile_id_idx on public.gym_visits (profile_id);
create index if not exists gym_visits_country_city_idx on public.gym_visits (country, city);
create index if not exists gym_visits_profile_gym_idx
  on public.gym_visits (profile_id, lower(gym_name), lower(city), lower(country));

-- A gym is the unique (profile, name, city, country) group of gym_visits rows.
-- Repeat visits insert another gym_visits row; they do not create a second gym.
-- Uniqueness is enforced in the app (case-insensitive name + city + country)
-- rather than a unique constraint, so a second visit is always allowed.

-- Upgrade tables created by the earlier username-only schema
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
    raise notice 'Skipping profiles_id_fkey (%). Empty public.profiles if you want it linked to auth.users.', sqlerrm;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gym_visits_set_updated_at on public.gym_visits;
create trigger gym_visits_set_updated_at
before update on public.gym_visits
for each row
execute function public.set_updated_at();

-- Create a profile row when a Supabase Auth user is created
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

alter table public.profiles enable row level security;
alter table public.gym_visits enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own visits" on public.gym_visits;
drop policy if exists "Users can insert own visits" on public.gym_visits;
drop policy if exists "Users can update own visits" on public.gym_visits;
drop policy if exists "Users can delete own visits" on public.gym_visits;

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

create policy "Users can view own visits"
  on public.gym_visits for select
  to authenticated
  using (auth.uid() = profile_id);

create policy "Users can insert own visits"
  on public.gym_visits for insert
  to authenticated
  with check (auth.uid() = profile_id);

create policy "Users can update own visits"
  on public.gym_visits for update
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Users can delete own visits"
  on public.gym_visits for delete
  to authenticated
  using (auth.uid() = profile_id);

-- API roles need table GRANTs in addition to RLS policies.
-- Missing GRANTs are what caused: permission denied for table profiles
grant usage on schema public to anon, authenticated, service_role;

grant all on table public.profiles to service_role;
grant all on table public.gym_visits to service_role;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.gym_visits to authenticated;

revoke all on table public.profiles from anon;
revoke all on table public.gym_visits from anon;

-- ---------------------------------------------------------------------------
-- Gym catalog, outlets, and house grade systems
-- Re-run this file after pulling. Existing visits stay intact.
-- ---------------------------------------------------------------------------

create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint gyms_name_len check (char_length(name) between 1 and 120),
  constraint gyms_country_len check (char_length(country) between 1 and 80)
);

create unique index if not exists gyms_name_country_idx
  on public.gyms (lower(name), lower(country));

create table if not exists public.gym_outlets (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  name text not null,
  city text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint gym_outlets_name_len check (char_length(name) between 1 and 80),
  constraint gym_outlets_city_len check (char_length(city) between 1 and 80)
);

create unique index if not exists gym_outlets_gym_name_idx
  on public.gym_outlets (gym_id, lower(name));

create table if not exists public.gym_grade_scales (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null unique references public.gyms (id) on delete cascade,
  kind text not null check (kind in ('v', 'font', 'french', 'number', 'color', 'custom')),
  bands jsonb not null default '[]'::jsonb,
  chart_path text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.gym_visits add column if not exists outlet text;
alter table public.gym_visits add column if not exists v_equiv text;
alter table public.gym_visits add column if not exists gym_id uuid references public.gyms (id) on delete set null;
alter table public.gym_visits add column if not exists outlet_id uuid references public.gym_outlets (id) on delete set null;

alter table public.gym_visits drop constraint if exists gym_visits_grade_system_check;
alter table public.gym_visits add constraint gym_visits_grade_system_check
  check (grade_system in ('v', 'font', 'french', 'number', 'color', 'custom'));

alter table public.gym_visits drop constraint if exists gym_visits_grade_len;
alter table public.gym_visits add constraint gym_visits_grade_len
  check (char_length(highest_grade) between 1 and 40);

alter table public.gyms enable row level security;
alter table public.gym_outlets enable row level security;
alter table public.gym_grade_scales enable row level security;

drop policy if exists "Authenticated can view gyms" on public.gyms;
drop policy if exists "Authenticated can create gyms" on public.gyms;
drop policy if exists "Creators can update gyms" on public.gyms;
drop policy if exists "Authenticated can view outlets" on public.gym_outlets;
drop policy if exists "Authenticated can create outlets" on public.gym_outlets;
drop policy if exists "Authenticated can view grade scales" on public.gym_grade_scales;
drop policy if exists "Authenticated can create grade scales" on public.gym_grade_scales;
drop policy if exists "Creators can update grade scales" on public.gym_grade_scales;

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

grant all on table public.gyms to service_role;
grant all on table public.gym_outlets to service_role;
grant all on table public.gym_grade_scales to service_role;

grant select, insert, update on table public.gyms to authenticated;
grant select, insert, update on table public.gym_outlets to authenticated;
grant select, insert, update on table public.gym_grade_scales to authenticated;

revoke all on table public.gyms from anon;
revoke all on table public.gym_outlets from anon;
revoke all on table public.gym_grade_scales from anon;

-- Shared grade-chart photos. Public read: these are gym wall charts, not personal logs.
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

