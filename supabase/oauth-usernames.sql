-- =============================================================================
-- Incremental: don't invent a username from the email local-part
-- =============================================================================
-- Safe to run on an existing project. Needed before Continue with Google:
-- Gmail addresses like jane.doe@gmail.com fail profiles_username_format
-- (dots aren't allowed), which used to abort the Auth insert.
-- Also covered by the full supabase/schema.sql profiles section.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen text := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  contact text;
begin
  -- Skip until the climber picks a valid handle (Google / incomplete signup).
  if chosen = ''
     or char_length(chosen) < 3
     or char_length(chosen) > 30
     or chosen !~ '^[a-z0-9_]+$' then
    return new;
  end if;

  contact := case
    when new.email is null then null
    when new.email like '%@chalk.local' then null
    else lower(new.email)
  end;

  insert into public.profiles (id, username, email)
  values (new.id, chosen, contact)
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
