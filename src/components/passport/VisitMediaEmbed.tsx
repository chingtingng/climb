"use client";

import { useEffect, useState } from "react";
import { cx } from "@/components/ui/cx";
import { providerLabel, type VisitMediaLink } from "@/lib/visitMedia";

/** Instagram’s embed widget needs a few hundred pixels of height before it reports its size. */
const INSTAGRAM_FALLBACK_HEIGHT = 620;

/** Visual size vs layout size. Instagram’s widget won’t render below ~326px, so we scale it. */
const EMBED_SCALE = 0.75;
const EMBED_INNER = `${100 / EMBED_SCALE}%`;

export function VisitMediaEmbed({
  link,
  className,
}: {
  link: VisitMediaLink;
  className?: string;
}) {
  const label = providerLabel(link.provider);
  const instagram = link.provider === "instagram";
  const [instagramHeight, setInstagramHeight] = useState(INSTAGRAM_FALLBACK_HEIGHT);

  useEffect(() => {
    if (!instagram) return;
    setInstagramHeight(INSTAGRAM_FALLBACK_HEIGHT);

    function onMessage(event: MessageEvent) {
      if (event.origin !== "https://www.instagram.com") return;
      const height = readInstagramEmbedHeight(event.data);
      if (height) setInstagramHeight(height);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [instagram, link.embedSrc]);

  return (
    <div className={cx("mt-2.5 space-y-1.5", className)}>
      {link.embedSrc ? (
        <div
          className={cx(
            "relative mx-auto w-3/4 max-w-[18rem] overflow-hidden rounded-md",
            instagram
              ? "bg-sky-50"
              : link.portrait
                ? "aspect-[9/16] bg-ink"
                : "aspect-video bg-ink",
          )}
          style={instagram ? { height: instagramHeight * EMBED_SCALE } : undefined}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: EMBED_INNER,
              height: instagram ? instagramHeight : EMBED_INNER,
              transform: `scale(${EMBED_SCALE})`,
            }}
          >
            <iframe
              src={link.embedSrc}
              title={`${label} preview`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
              className="h-full w-full border-0"
            />
          </div>
        </div>
      ) : (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-md border border-sky-300 bg-sky-50 px-3 py-3"
        >
          <p className="text-sm font-semibold">{label} clip</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Preview isn’t available for this share link yet. Open it on {label} to watch.
          </p>
        </a>
      )}
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs font-semibold text-sky-600"
      >
        Watch on {label}
      </a>
    </div>
  );
}

function readInstagramEmbedHeight(data: unknown): number | null {
  let parsed: unknown = data;
  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data);
    } catch {
      const match = /^MEASURE:(\d+(?:\.\d+)?)/.exec(data);
      return match ? Math.ceil(Number(match[1])) : null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as { type?: unknown; details?: unknown; height?: unknown };
  if (obj.type === "MEASURE" && obj.details && typeof obj.details === "object") {
    const height = (obj.details as { height?: unknown }).height;
    if (typeof height === "number" && height > 0) return Math.ceil(height);
  }
  if (typeof obj.height === "number" && obj.height > 0) return Math.ceil(obj.height);
  return null;
}
