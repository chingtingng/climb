-- =============================================================================
-- Incremental: climbing types on gyms + visits
-- =============================================================================
-- Prefer re-running the full supabase/schema.sql if you can wipe stamp data.
-- Use this only when you want to keep existing visits.
--
-- Adds:
--   gyms.climbing_types  text[]  — what the gym offers
--   visits.climbing_type text    — discipline for that stamp
-- =============================================================================

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

alter table public.gyms
  add column if not exists climbing_types text[] not null default array['bouldering']::text[];

alter table public.gyms drop constraint if exists gyms_climbing_types_valid;
alter table public.gyms
  add constraint gyms_climbing_types_valid
  check (public.climbing_types_valid(climbing_types));

alter table public.visits
  add column if not exists climbing_type text;

update public.visits
set climbing_type = 'bouldering'
where climbing_type is null;

alter table public.visits
  alter column climbing_type set not null;

alter table public.visits drop constraint if exists visits_climbing_type_check;
alter table public.visits
  add constraint visits_climbing_type_check
  check (public.is_climbing_type(climbing_type));

-- Seed known multi-discipline gyms (safe to re-run).
update public.gyms set climbing_types = array['bouldering', 'top_rope', 'lead']::text[]
where lower(name) in (
  'climb central',
  'fit bloc',
  'kinetics climbing',
  'climbup',
  'outpost climbing',
  'safra yishun'
);

update public.gyms set climbing_types = array['top_rope', 'lead']::text[]
where lower(name) in ('upwall climbing', 'climb@t3');

update public.gyms set climbing_types = array['bouldering']::text[]
where lower(name) in (
  'boulder planet',
  'boulder movement',
  'boulder+',
  'bff climbing',
  'lighthouse',
  'climba',
  'ark bloc',
  'ground up',
  'oyeyo boulder home',
  'z-vertigo',
  'project send'
);
