import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { emailToUsername, normalizeUsername } from "@/lib/username";
import { ensureOwnProfile } from "@/lib/visits";

export type SessionUser = {
  id: string;
  /** Null until the climber picks a handle (Google / incomplete signup). */
  username: string | null;
  email?: string | null;
};

type AuthUserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

/** Username from Auth metadata or legacy `@chalk.local` email. */
export function usernameFromAuthUser(user: AuthUserLike): string | undefined {
  const meta = user.user_metadata?.username;
  if (typeof meta === "string") {
    try {
      return normalizeUsername(meta);
    } catch {
      // Invalid leftover metadata — fall through to profile / legacy email.
    }
  }
  return emailToUsername(user.email ?? undefined);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  let username = usernameFromAuthUser(data.user) ?? null;

  if (!username) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", data.user.id)
      .maybeSingle();
    username = profile?.username ?? null;
  }

  return {
    id: data.user.id,
    username,
    email: data.user.email,
  };
}

/** Create/update the profile when Auth already has a valid username. */
export async function syncProfileAfterAuth(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  },
): Promise<string | null> {
  const username = usernameFromAuthUser(user);
  if (!username) return null;

  try {
    await ensureOwnProfile(supabase, user.id, username, user.email ?? undefined);
  } catch {
    // Trigger may have created the row already.
  }

  return username;
}
