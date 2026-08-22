/**
 * Public production origin. Auth emails (confirm / recovery) must use this,
 * never the Vercel project alias `chalk-passport-cassiejt.vercel.app`.
 * That host is Deployment Protection (SSO) gated, so a climber who is not
 * logged into Vercel hits a Vercel login wall instead of confirming email.
 */
export const PRODUCTION_SITE_URL = "https://chalk-passport.vercel.app";

const SSO_GATED_HOSTS = new Set(["chalk-passport-cassiejt.vercel.app"]);

export function canonicalizeSiteUrl(origin: string): string {
  const trimmed = origin.trim().replace(/\/$/, "");
  if (!trimmed) return PRODUCTION_SITE_URL;

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (SSO_GATED_HOSTS.has(url.hostname.toLowerCase())) {
      return PRODUCTION_SITE_URL;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return PRODUCTION_SITE_URL;
  }
}

export function resolveSiteUrl(options: {
  configured?: string | null;
  onVercel?: boolean;
  vercelProductionHost?: string | null;
  requestOrigin?: string | null;
}): string {
  const configured = options.configured?.trim();
  if (configured) return canonicalizeSiteUrl(configured);

  // On Vercel, never use the incoming Host header. Preview / project aliases
  // are not the public app, and some of them require a Vercel login.
  if (options.onVercel) {
    const host = options.vercelProductionHost?.trim();
    if (host) {
      return canonicalizeSiteUrl(host.includes("://") ? host : `https://${host}`);
    }
    return PRODUCTION_SITE_URL;
  }

  const requestOrigin = options.requestOrigin?.trim();
  if (requestOrigin) return canonicalizeSiteUrl(requestOrigin);

  return "http://localhost:3000";
}

/** Only allow same-origin relative paths for post-auth redirects. */
export function safeAuthNextPath(raw: string | null | undefined, fallback = "/passport"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

export function authConfirmRedirectUrl(siteUrl: string, next = "/passport"): string {
  return `${canonicalizeSiteUrl(siteUrl)}/auth/confirm?next=${safeAuthNextPath(next)}`;
}
