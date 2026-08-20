"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/ui/Field";
import { resolveVisitMediaAction } from "@/app/actions";
import {
  MEDIA_LINK_HELP,
  parseVisitMediaUrl,
  providerLabel,
  type VisitMediaLink,
} from "@/lib/visitMedia";
import { VisitMediaEmbed } from "./VisitMediaEmbed";

type Props = {
  url: string;
  onUrl: (url: string) => void;
  busy?: boolean;
};

export function VisitMediaFields({ url, onUrl, busy }: Props) {
  const value = url.trim();
  const parsed = parseVisitMediaUrl(value);
  const parsedLink = parsed && !("error" in parsed) ? parsed : null;
  const parsedError = parsed && "error" in parsed ? parsed.error : null;
  const needsResolve = Boolean(
    parsedLink && parsedLink.provider === "tiktok" && !parsedLink.embedSrc,
  );

  const [resolved, setResolved] = useState<{ value: string; link: VisitMediaLink } | null>(
    null,
  );

  useEffect(() => {
    if (!needsResolve) return;
    const current = value;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void resolveVisitMediaAction(current).then((result) => {
        if (cancelled || !result.ok) return;
        setResolved({ value: current, link: result.link });
      });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [needsResolve, value]);

  const link =
    parsedLink?.embedSrc
      ? parsedLink
      : resolved?.value === value
        ? resolved.link
        : parsedLink;
  const resolving = needsResolve && resolved?.value !== value;
  const error = parsedError && looksLikeClipUrl(value) ? parsedError : null;

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">
          Clip or post <span className="font-medium text-ink-soft">(optional)</span>
        </span>
        <p className="mb-2 text-xs leading-relaxed text-ink-soft">{MEDIA_LINK_HELP}</p>
        <Field
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://www.tiktok.com/@you/video/…"
          value={url}
          disabled={busy}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onUrl(e.target.value)}
        />
      </label>

      {value ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onUrl("")}
          className="text-xs font-semibold text-sky-600"
        >
          Remove link
        </button>
      ) : null}

      {resolving ? (
        <p className="text-xs text-ink-soft">
          Finding that {link ? providerLabel(link.provider) : "clip"}…
        </p>
      ) : null}

      {link ? <VisitMediaEmbed link={link} /> : null}

      {error ? (
        <p role="alert" className="text-xs font-medium text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function looksLikeClipUrl(value: string): boolean {
  return /(?:tiktok|instagram|instagr\.am|youtu\.?be)/i.test(value) && /\/\S+/.test(value);
}
