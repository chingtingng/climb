import type { ReactNode } from "react";
import { countryMeta } from "@/lib/countries";
import type { PlaceKind } from "@/lib/placeKinds";
import { cx } from "./cx";

export type StampInk = "sky" | "clay";
export type StampSize = "sm" | "md" | "lg" | "hero";
export type StampVariant = "country" | "grade" | "add" | "hero" | "mark";

export function placeInk(kind: PlaceKind | string | null | undefined): StampInk {
  return kind === "rock" ? "clay" : "sky";
}

/** Deterministic −6°…+6° from a stable seed — safe for SSR. */
export function stampRotation(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (Math.imul(hash, 31) + seed.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 13) - 6;
}

export function Stamp({
  variant = "mark",
  size = "md",
  ink = "sky",
  seed,
  country,
  label,
  sublabel,
  caption,
  className,
}: {
  variant?: StampVariant;
  size?: StampSize;
  ink?: StampInk;
  seed?: string;
  country?: string;
  label?: string;
  sublabel?: string;
  caption?: string;
  className?: string;
}) {
  const meta = country ? countryMeta(country) : null;
  const rotationSeed = seed ?? country ?? label ?? variant;
  const rotation = stampRotation(rotationSeed);
  const sizeClass =
    size === "sm"
      ? "stamp-sm"
      : size === "lg"
        ? "stamp-lg"
        : size === "hero"
          ? "stamp-hero"
          : "stamp-md";

  let core: ReactNode = <span className="stamp-plus">✦</span>;
  if (variant === "add") {
    core = <span className="stamp-plus">+</span>;
  } else if (variant === "country") {
    core = (
      <>
        <span className="stamp-code">{meta?.code ?? "—"}</span>
        {meta?.flag ? <span className="stamp-flag">{meta.flag}</span> : null}
      </>
    );
  } else if (variant === "grade") {
    core = (
      <>
        <span className="grade-text max-w-full truncate text-sm">{label}</span>
        {sublabel ? (
          <span className="max-w-full truncate text-micro font-semibold">{sublabel}</span>
        ) : null}
      </>
    );
  } else if (variant === "hero") {
    core = (
      <>
        {label ? (
          <span className="grade-text max-w-full truncate text-lg leading-none">{label}</span>
        ) : null}
        {sublabel ? (
          <span className="max-w-full truncate text-micro font-semibold">{sublabel}</span>
        ) : null}
        {caption ? (
          <span className="max-w-full truncate text-micro font-semibold tracking-wide">
            {caption}
          </span>
        ) : null}
      </>
    );
  } else if (label) {
    core = <span className="stamp-code">{label}</span>;
  }

  return (
    <div className={cx("stamp", sizeClass, className)} aria-hidden>
      <div
        className={cx(
          "stamp-face",
          ink === "clay" ? "stamp-ink-clay" : "stamp-ink-sky",
        )}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <span className="stamp-ring-inner" />
        <span className="stamp-core">{core}</span>
      </div>
    </div>
  );
}
