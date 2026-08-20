import { cx } from "@/components/ui/cx";
import { providerLabel, type VisitMediaLink } from "@/lib/visitMedia";

export function VisitMediaEmbed({
  link,
  className,
}: {
  link: VisitMediaLink;
  className?: string;
}) {
  const label = providerLabel(link.provider);
  return (
    <div className={cx("mt-2.5 space-y-1.5", className)}>
      {link.embedSrc ? (
        <div
          className={cx(
            "relative overflow-hidden rounded-md bg-ink",
            link.portrait
              ? "mx-auto aspect-[9/16] w-full max-w-52 max-h-80"
              : "aspect-video w-full max-h-56",
          )}
        >
          <iframe
            src={link.embedSrc}
            title={`${label} preview`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            className="absolute inset-0 h-full w-full border-0"
          />
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
