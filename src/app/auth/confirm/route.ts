import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeAuthNextPath } from "@/lib/site-url";
import { syncProfileAfterAuth } from "@/lib/auth";

/**
 * SSR email confirmation via token_hash (recommended email template).
 * {{ .SiteURL }} is the dashboard Site URL — set it to
 * https://chalk-passport.vercel.app (not the *-cassiejt.vercel.app alias):
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/passport
 *
 * Also accepts the default ConfirmationURL PKCE redirect: ?code=…
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = safeAuthNextPath(searchParams.get("next"));
  const errorRedirect = new URL("/", request.url);

  if (searchParams.get("error")) {
    errorRedirect.searchParams.set("authError", "confirm");
    return NextResponse.redirect(errorRedirect);
  }

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

    const username = await syncProfileAfterAuth(supabase, data.user);
    return NextResponse.redirect(new URL(username ? next : "/welcome", request.url));
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return NextResponse.redirect(errorRedirect);
    }

    const username = await syncProfileAfterAuth(supabase, data.user);
    return NextResponse.redirect(new URL(username ? next : "/welcome", request.url));
  }

  return NextResponse.redirect(errorRedirect);
}
