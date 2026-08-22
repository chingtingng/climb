import { headers } from "next/headers";
import { resolveSiteUrl } from "@/lib/site-url-core";

export {
  PRODUCTION_SITE_URL,
  authConfirmRedirectUrl,
  canonicalizeSiteUrl,
  resolveSiteUrl,
  safeAuthNextPath,
} from "@/lib/site-url-core";

/** Public app origin for auth email redirects (confirm / recovery). */
export async function getSiteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";

  return resolveSiteUrl({
    configured: process.env.NEXT_PUBLIC_SITE_URL,
    onVercel: Boolean(process.env.VERCEL),
    vercelProductionHost: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    requestOrigin: host ? `${proto}://${host}` : null,
  });
}
