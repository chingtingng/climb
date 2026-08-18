import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { emailToUsername } from "@/lib/username";

export type SessionUser = {
  id: string;
  username: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const username =
    (typeof data.user.user_metadata?.username === "string"
      ? data.user.user_metadata.username
      : undefined) ||
    emailToUsername(data.user.email);

  if (!username) return null;

  return { id: data.user.id, username };
}
