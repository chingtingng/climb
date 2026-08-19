import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeAuthNextPath } from "@/lib/site-url";
import { emailToUsername, normalizeUsername } from "@/lib/username";
import { ensureOwnProfile } from "@/lib/visits";

/**
 * SSR email confirmation via token_hash (recommended email template):
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/passport
 *
 * Also accepts the default ConfirmationURL PKCE redirect: ?code=…
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = safeAuthNextPath(searchParams.get("next"));
  const errorRedirect = new URL("/", request.url);
  errorRedirect.searchParams.set("authError", "confirm");

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(errorRedirect);
  }

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error || !data.user) {
      return NextResponse.redirect(errorRedirect);
    }

    await syncProfileAfterAuth(supabase, data.user);
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return NextResponse.redirect(errorRedirect);
    }

    await syncProfileAfterAuth(supabase, data.user);
    return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(errorRedirect);
}

async function syncProfileAfterAuth(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
) {
  const metaUsername =
    typeof user.user_metadata?.username === "string"
      ? user.user_metadata.username
      : undefined;

  let username: string | undefined;
  try {
    username = normalizeUsername(metaUsername || emailToUsername(user.email ?? undefined) || "");
  } catch {
    return;
  }

  try {
    await ensureOwnProfile(supabase, user.id, username, user.email ?? undefined);
  } catch {
    // Profile may already exist from the auth trigger; passport load can retry.
  }
}
