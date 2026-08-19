-- =============================================================================
-- Incremental: email on profiles + login helpers
-- =============================================================================
-- Safe to run on an existing project without resetting gym/visit tables.
-- Also covered by the full supabase/schema.sql profiles section.
-- =============================================================================

alter table public.profiles
  add column if not exists email text;

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    lower(coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    )),
    case
      when new.email is null then null
      when new.email like '%@chalk.local' then null
      else lower(new.email)
    end
  )
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

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

-- Backfill emails from Auth for existing non-synthetic accounts.
update public.profiles p
set email = lower(u.email)
from auth.users u
where u.id = p.id
  and p.email is null
  and u.email is not null
  and u.email not like '%@chalk.local';
