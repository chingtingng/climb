-- Additive: visit clip URL column (safe to re-run on an existing project).
-- New stamps store a public TikTok / Instagram / YouTube URL in video_path.
-- Files are not uploaded to Supabase. photo_path is unused for new stamps.
-- Does NOT drop tables. Paste into the Supabase SQL Editor after schema.sql.

alter table public.visits
  add column if not exists photo_path text;

alter table public.visits
  add column if not exists video_path text;
