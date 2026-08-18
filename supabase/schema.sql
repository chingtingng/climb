-- Chalk Passport schema
-- Run this in the Supabase SQL Editor after creating your project.
--
-- Security checkbox recommendations when creating the project:
-- 1) Enable Data API          → ON  (needed for the JS client / PostgREST)
-- 2) Automatically expose new tables → OFF (control privileges yourself)
-- 3) Enable automatic RLS     → ON  (new public tables get RLS by default)
--
-- This script also enables RLS and does NOT grant anon/authenticated access.
-- All reads/writes go through Next.js server actions using the service role key.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (
    char_length(username) between 2 and 32
    and username ~ '^[a-z0-9._]+$'
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

alter table public.profiles enable row level security;
alter table public.gym_visits enable row level security;

-- Intentionally no policies for anon/authenticated.
-- Access is via the service role from Next.js server actions only.

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.gym_visits from anon, authenticated;
