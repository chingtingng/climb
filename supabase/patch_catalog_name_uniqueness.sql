-- Additive patch for an existing Chalk Passport database.
-- Do NOT paste schema.sql into prod after go-live (it drops stamp tables).
-- Run this in SQL Editor on the live project, then keep schema.sql in sync for new projects.

create or replace function public.normalize_catalog_label(value text)
returns text
language sql
immutable
parallel safe
as $$
  select btrim(regexp_replace(coalesce(value, ''), '\s+', ' ', 'g'));
$$;

revoke all on function public.normalize_catalog_label(text) from public, anon;
grant execute on function public.normalize_catalog_label(text) to authenticated, service_role;

create or replace function public.sync_gym_label_normalize()
returns trigger
language plpgsql
as $$
begin
  new.name := public.normalize_catalog_label(new.name);
  new.country := public.normalize_catalog_label(new.country);
  return new;
end;
$$;

create or replace function public.sync_outlet_label_normalize()
returns trigger
language plpgsql
as $$
begin
  new.name := public.normalize_catalog_label(new.name);
  new.city := public.normalize_catalog_label(new.city);
  return new;
end;
$$;

revoke all on function public.sync_gym_label_normalize() from public, anon, authenticated;
revoke all on function public.sync_outlet_label_normalize() from public, anon, authenticated;

update public.gyms
set
  name = public.normalize_catalog_label(name),
  country = public.normalize_catalog_label(country);

update public.gym_outlets
set
  name = public.normalize_catalog_label(name),
  city = public.normalize_catalog_label(city);

drop index if exists public.gyms_name_country_live_idx;
drop index if exists public.gyms_name_country_idx;
create unique index gyms_name_country_idx
  on public.gyms (lower(name), lower(country));

drop index if exists public.gym_outlets_gym_name_live_idx;
drop index if exists public.gym_outlets_gym_name_idx;
create unique index gym_outlets_gym_name_idx
  on public.gym_outlets (gym_id, lower(name));

drop trigger if exists gyms_normalize_labels on public.gyms;
create trigger gyms_normalize_labels
before insert or update of name, country on public.gyms
for each row
execute function public.sync_gym_label_normalize();

drop trigger if exists gym_outlets_normalize_labels on public.gym_outlets;
create trigger gym_outlets_normalize_labels
before insert or update of name, city on public.gym_outlets
for each row
execute function public.sync_outlet_label_normalize();

create or replace function public.is_catalog_seed_gym(p_name text, p_country text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.gym_catalog_seeds s
    where lower(public.normalize_catalog_label(s.gym_name))
        = lower(public.normalize_catalog_label(p_name))
      and lower(public.normalize_catalog_label(s.country))
        = lower(public.normalize_catalog_label(p_country))
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
      on lower(public.normalize_catalog_label(s.gym_name))
       = lower(public.normalize_catalog_label(g.name))
     and lower(public.normalize_catalog_label(s.country))
       = lower(public.normalize_catalog_label(g.country))
    where g.id = p_gym_id
      and lower(public.normalize_catalog_label(s.outlet_name))
        = lower(public.normalize_catalog_label(p_outlet_name))
  );
$$;

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
  ) as report_count,
  (
    select count(*)
    from public.gym_reports r
    where r.gym_id = g.id
      and r.reason = 'closed_or_missing'
  ) as closed_report_count,
  (
    select count(*)
    from public.gym_reports r
    where r.gym_id = g.id
      and r.reason = 'duplicate'
  ) as duplicate_report_count
from public.gyms g;

revoke all on table public.catalog_moderation from public, anon, authenticated;
grant select on table public.catalog_moderation to service_role;
