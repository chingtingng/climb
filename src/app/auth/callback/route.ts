import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeAuthNextPath } from "@/lib/site-url";
import { syncProfileAfterAuth } from "@/lib/auth";

/**
 * Default Supabase ConfirmationURL / magic-link / OAuth redirect (PKCE `?code=`).
 * Prefer `/auth/confirm` with token_hash in the email template when possible.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeAuthNextPath(searchParams.get("next"));
  const errorRedirect = new URL("/", request.url);

  if (searchParams.get("error")) {
    errorRedirect.searchParams.set("authError", "oauth");
    return NextResponse.redirect(errorRedirect);
  }

  errorRedirect.searchParams.set("authError", "confirm");

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(errorRedirect);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(errorRedirect);
  }

  const username = await syncProfileAfterAuth(supabase, data.user);
  const destination = username ? next : "/welcome";

  return NextResponse.redirect(new URL(destination, request.url));
}
