-- =============================================================================
-- Incremental: place kind on gyms (Gym vs Rock)
-- =============================================================================
-- Prefer re-running the full supabase/schema.sql if you can wipe stamp data.
-- Use this only when you want to keep existing visits.
--
-- Adds:
--   gyms.place_kind  text  — 'gym' (artificial) | 'rock' (natural stone)
--
-- Existing rows default to 'gym'.
-- =============================================================================

alter table public.gyms
  add column if not exists place_kind text not null default 'gym';

alter table public.gyms drop constraint if exists gyms_place_kind_check;
alter table public.gyms
  add constraint gyms_place_kind_check
  check (place_kind in ('gym', 'rock'));

-- Known catalog rows are artificial gyms.
update public.gyms
set place_kind = 'gym'
where place_kind is distinct from 'gym'
  and place_kind is distinct from 'rock';
