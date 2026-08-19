import type { ClimbingType } from "@/lib/climbingTypes";
import { formatClimbingType } from "@/lib/climbingTypes";
import { formatPlaceKind, type PlaceKind } from "@/lib/placeKinds";
import { cx } from "./cx";

export function BoulderGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className ?? "size-3.5"} fill="none">
      <path
        d="M3.2 11.4 6.4 5.5l3 2.4 3.4-4.3 1.8 7.8H3.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RopeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className ?? "size-3.5"} fill="none">
      <circle cx="8" cy="3.4" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 5v7.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M5.5 13.2h5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LeadGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className ?? "size-3.5"} fill="none">
      <path
        d="M4 13.2 8.2 4.4l4 8.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.2" cy="3.2" r="1.15" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function GymGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className ?? "size-3.5"} fill="none">
      <rect
        x="3"
        y="3.5"
        width="10"
        height="9"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M6 7h.01M10 7h.01M8 10h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DisciplineMark({
  type,
  className,
}: {
  type: ClimbingType | string | null | undefined;
  className?: string;
}) {
  const label = formatClimbingType(type);
  if (!label) return null;
  const Glyph =
    type === "top_rope" ? RopeGlyph : type === "lead" ? LeadGlyph : BoulderGlyph;
  return (
    <span className={cx("inline-flex items-center gap-1", className)}>
      <Glyph />
      <span>{label}</span>
    </span>
  );
}

export function PlaceKindMark({
  kind,
  className,
}: {
  kind: PlaceKind | string | null | undefined;
  className?: string;
}) {
  const rock = kind === "rock";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 font-semibold",
        rock ? "text-clay-600" : "text-sky-700",
        className,
      )}
    >
      {rock ? <BoulderGlyph /> : <GymGlyph />}
      <span>{formatPlaceKind(kind)}</span>
    </span>
  );
}
