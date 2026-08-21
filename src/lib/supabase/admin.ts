import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/**
 * Server-only service-role client. Used for account deletion (Auth admin API)
 * and fallbacks when RPCs / the email column are not migrated yet.
 * Never import this into client components.
 */
export function createAdminClient(): SupabaseClient | null {
  const { url } = getSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
