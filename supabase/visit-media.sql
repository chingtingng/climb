-- Additive: visit photo + video (safe to re-run on an existing project).
-- Does NOT drop tables. Paste into the Supabase SQL Editor after schema.sql.

alter table public.visits
  add column if not exists photo_path text;

alter table public.visits
  add column if not exists video_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visit-media',
  'visit-media',
  false,
  41943040,
  array[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own visit media" on storage.objects;
drop policy if exists "Users can view own visit media" on storage.objects;
drop policy if exists "Users can update own visit media" on storage.objects;
drop policy if exists "Users can delete own visit media" on storage.objects;

create policy "Users can upload own visit media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'visit-media'
    and name like auth.uid()::text || '/%'
  );

create policy "Users can view own visit media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'visit-media'
    and name like auth.uid()::text || '/%'
  );

create policy "Users can update own visit media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'visit-media'
    and name like auth.uid()::text || '/%'
  )
  with check (
    bucket_id = 'visit-media'
    and name like auth.uid()::text || '/%'
  );

create policy "Users can delete own visit media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'visit-media'
    and name like auth.uid()::text || '/%'
  );
