import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { emailToUsername } from "@/lib/username";

export type SessionUser = {
  id: string;
  username: string;
  email?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const metaUsername =
    typeof data.user.user_metadata?.username === "string"
      ? data.user.user_metadata.username
      : undefined;

  // Prefer metadata; fall back to legacy @chalk.local mapping only.
  let username = metaUsername || emailToUsername(data.user.email);

  if (!username) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", data.user.id)
      .maybeSingle();
    username = profile?.username ?? undefined;
  }

  if (!username) return null;

  return {
    id: data.user.id,
    username,
    email: data.user.email,
  };
}
