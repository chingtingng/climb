/**
 * Accept common paste mistakes (trailing /rest/v1, quotes, whitespace)
 * and rebuild a clean project URL: https://<ref>.supabase.co
 */
function normalizeSupabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^["']|["']$/g, "");
  const match = cleaned.match(/([a-z0-9-]+)\.supabase\.co/i);
  if (!match) return null;
  return `https://${match[1].toLowerCase()}.supabase.co`;
}

function normalizeKey(raw: string | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");
  return key || null;
}

export function getSupabaseEnv(): { url: string | null; key: string | null } {
  return {
    url: normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    key: normalizeKey(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseEnv();
  return Boolean(url && key);
}

export function requireSupabaseEnv(): { url: string; key: string } {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return { url, key };
}
