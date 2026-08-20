/** Public TikTok / Instagram / YouTube links stored on visits — no Supabase file storage. */

export const MAX_MEDIA_URL_LENGTH = 1000;

export type SocialProvider = "youtube" | "tiktok" | "instagram";

export type VisitMediaLink = {
  provider: SocialProvider;
  url: string;
  embedSrc: string | null;
  portrait: boolean;
};

export const MEDIA_LINK_HELP =
  "Paste a public TikTok, Instagram Reel or post, or YouTube Shorts link. We embed a preview — the file stays on that app.";

const MEDIA_LINK_ERROR =
  "Paste a public TikTok, Instagram, or YouTube link (Reels and Shorts work too).";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const TIKTOK_ID = /^\d{5,32}$/;
const INSTAGRAM_CODE = /^[A-Za-z0-9_-]{5,64}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
]);

const TIKTOK_HOSTS = new Set(["tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]);

const INSTAGRAM_HOSTS = new Set(["instagram.com", "m.instagram.com", "instagr.am"]);

export function providerLabel(provider: SocialProvider): string {
  switch (provider) {
    case "youtube":
      return "YouTube";
    case "tiktok":
      return "TikTok";
    case "instagram":
      return "Instagram";
  }
}

export function isLegacyVisitMediaPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/(photo|video)\.[a-z0-9]+$/i.test(path.trim());
}

export function parseVisitMediaUrl(raw: string): VisitMediaLink | { error: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_MEDIA_URL_LENGTH) {
    return { error: "That link is too long. Paste the share URL from TikTok, Instagram, or YouTube." };
  }

  const parsed = parseHttpUrl(trimmed);
  if (!parsed) return { error: MEDIA_LINK_ERROR };

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: MEDIA_LINK_ERROR };
  }

  const provider = providerForHost(parsed.hostname);
  if (!provider) return { error: MEDIA_LINK_ERROR };

  parsed.protocol = "https:";
  parsed.hash = "";
  parsed.username = "";
  parsed.password = "";

  if (provider === "youtube") return parseYouTube(parsed);
  if (provider === "tiktok") return parseTikTok(parsed);
  return parseInstagram(parsed);
}

export function visitMediaLinkFromStored(
  photoPath: string | null | undefined,
  videoPath: string | null | undefined,
): VisitMediaLink | null {
  const fromVideo = videoPath ? parseVisitMediaUrl(videoPath) : null;
  if (fromVideo && !("error" in fromVideo)) return fromVideo;
  const fromPhoto = photoPath ? parseVisitMediaUrl(photoPath) : null;
  if (fromPhoto && !("error" in fromPhoto)) return fromPhoto;
  return null;
}

export async function resolveVisitMediaUrl(
  raw: string,
): Promise<VisitMediaLink | { error: string } | null> {
  const parsed = parseVisitMediaUrl(raw);
  if (parsed === null || "error" in parsed) return parsed;
  if (parsed.embedSrc) return parsed;
  if (parsed.provider !== "tiktok") return parsed;

  const viaOembed = await resolveTikTokOEmbed(parsed.url);
  if (viaOembed) return viaOembed;

  const redirected = await followAllowedRedirect(parsed.url);
  if (redirected && redirected !== parsed.url) {
    const next = parseVisitMediaUrl(redirected);
    if (next && !("error" in next) && next.embedSrc) return next;
  }

  return parsed;
}

function parseHttpUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    if (!/^\S+\.\S+/.test(raw)) return null;
    try {
      return new URL(`https://${raw}`);
    } catch {
      return null;
    }
  }
}

function providerForHost(hostname: string): SocialProvider | null {
  const host = hostname.replace(/^www\./i, "").toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) return "youtube";
  if (TIKTOK_HOSTS.has(host)) return "tiktok";
  if (INSTAGRAM_HOSTS.has(host)) return "instagram";
  return null;
}

function parseYouTube(url: URL): VisitMediaLink | { error: string } {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  let shorts = false;

  if (host === "youtu.be") {
    id = parts[0] ?? null;
  } else {
    const v = url.searchParams.get("v");
    if (v) id = v;
    if (!id && parts[0] && ["shorts", "embed", "live", "v"].includes(parts[0])) {
      id = parts[1] ?? null;
      shorts = parts[0] === "shorts";
    }
  }

  if (!id || !YOUTUBE_ID.test(id)) return { error: MEDIA_LINK_ERROR };

  const canonical = shorts
    ? `https://www.youtube.com/shorts/${id}`
    : `https://www.youtube.com/watch?v=${id}`;

  return {
    provider: "youtube",
    url: canonical,
    embedSrc: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
    portrait: shorts,
  };
}

function parseTikTok(url: URL): VisitMediaLink | { error: string } {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;

  if (parts[0]?.startsWith("@") && (parts[1] === "video" || parts[1] === "photo") && parts[2]) {
    id = parts[2];
  } else if (parts[0] === "v" && parts[1]) {
    id = parts[1].replace(/\.html$/i, "");
  } else if (parts[0] === "embed" && parts[1] === "v2" && parts[2]) {
    id = parts[2];
  } else if (parts[0] === "embed" && parts[1]) {
    id = parts[1];
  } else if (parts[0] === "player" && parts[1] === "v1" && parts[2]) {
    id = parts[2];
  }

  const shortHost = host === "vm.tiktok.com" || host === "vt.tiktok.com";
  const shortPath = parts[0] === "t";
  const cleaned = new URL(url.toString());
  cleaned.search = "";
  if (!cleaned.pathname.endsWith("/")) cleaned.pathname += "/";

  if (id && TIKTOK_ID.test(id)) {
    const handle = parts[0]?.startsWith("@") ? parts[0] : null;
    const kind = parts[1] === "photo" ? "photo" : "video";
    const canonical = handle
      ? `https://www.tiktok.com/${handle}/${kind}/${id}`
      : `https://www.tiktok.com/video/${id}`;
    return {
      provider: "tiktok",
      url: canonical,
      embedSrc: `https://www.tiktok.com/player/v1/${id}?music_info=0&description=0&autoplay=0`,
      portrait: true,
    };
  }

  if (shortHost || shortPath) {
    return {
      provider: "tiktok",
      url: cleaned.toString().replace(/\/+$/, "/"),
      embedSrc: null,
      portrait: true,
    };
  }

  return { error: MEDIA_LINK_ERROR };
}

function parseInstagram(url: URL): VisitMediaLink | { error: string } {
  const parts = url.pathname.split("/").filter(Boolean);
  const kinds: Record<string, "reel" | "p"> = {
    reel: "reel",
    reels: "reel",
    p: "p",
    tv: "p",
  };

  let kind: "reel" | "p" | null = null;
  let code: string | null = null;

  if (parts[0] && kinds[parts[0]] && parts[1]) {
    kind = kinds[parts[0]];
    code = parts[1];
  } else if (parts[1] && kinds[parts[1]] && parts[2]) {
    kind = kinds[parts[1]];
    code = parts[2];
  }

  if (!kind || !code || !INSTAGRAM_CODE.test(code)) return { error: MEDIA_LINK_ERROR };

  const pathKind = kind === "reel" ? "reel" : "p";
  const canonical = `https://www.instagram.com/${pathKind}/${code}/`;
  return {
    provider: "instagram",
    url: canonical,
    embedSrc: `${canonical}embed/`,
    portrait: true,
  };
}

type TikTokOEmbed = {
  author_url?: string;
  embed_product_id?: string;
};

async function resolveTikTokOEmbed(url: string): Promise<VisitMediaLink | null> {
  try {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TikTokOEmbed;
    const id = data.embed_product_id;
    if (!id || !TIKTOK_ID.test(id)) return null;
    const handlePath = data.author_url ? new URL(data.author_url).pathname.replace(/\/+$/, "") : "";
    const canonical = handlePath
      ? `https://www.tiktok.com${handlePath}/video/${id}`
      : `https://www.tiktok.com/video/${id}`;
    const parsed = parseVisitMediaUrl(canonical);
    return parsed && !("error" in parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function followAllowedRedirect(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 ChalkPassport" },
    });
    const location = res.headers.get("location");
    if (!location) return res.url || null;
    const next = new URL(location, url);
    if (!providerForHost(next.hostname)) return null;
    return next.toString();
  } catch {
    return null;
  }
}
