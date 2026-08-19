-- =============================================================================
-- Incremental: YDS (Yosemite Decimal System) as a grade system
-- =============================================================================
-- Prefer re-running the full supabase/schema.sql if you can wipe stamp data.
-- Use this only when you want to keep existing visits.
--
-- Allows:
--   gym_grade_scales.kind  = 'yds'
--   visits.grade_system    = 'yds'
-- =============================================================================

alter table public.gym_grade_scales drop constraint if exists gym_grade_scales_kind_check;
alter table public.gym_grade_scales
  add constraint gym_grade_scales_kind_check
  check (kind in ('v', 'font', 'french', 'yds', 'number', 'color', 'custom'));

alter table public.visits drop constraint if exists visits_grade_system_check;
alter table public.visits
  add constraint visits_grade_system_check
  check (grade_system in ('v', 'font', 'french', 'yds', 'number', 'color', 'custom'));
