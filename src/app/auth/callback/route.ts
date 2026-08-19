import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeAuthNextPath } from "@/lib/site-url";
import { emailToUsername, normalizeUsername } from "@/lib/username";
import { ensureOwnProfile } from "@/lib/visits";

/**
 * Default Supabase ConfirmationURL / magic-link redirect (PKCE `?code=`).
 * Prefer `/auth/confirm` with token_hash in the email template when possible.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeAuthNextPath(searchParams.get("next"));
  const errorRedirect = new URL("/", request.url);
  errorRedirect.searchParams.set("authError", "confirm");

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(errorRedirect);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(errorRedirect);
  }

  const metaUsername =
    typeof data.user.user_metadata?.username === "string"
      ? data.user.user_metadata.username
      : undefined;

  try {
    const username = normalizeUsername(
      metaUsername || emailToUsername(data.user.email) || "",
    );
    await ensureOwnProfile(
      supabase,
      data.user.id,
      username,
      data.user.email ?? undefined,
    );
  } catch {
    // Trigger may have created the row already.
  }

  return NextResponse.redirect(new URL(next, request.url));
}
