import type { GradeSystem } from "./types";

export const PLACE_KINDS = ["gym", "rock"] as const;

export type PlaceKind = (typeof PLACE_KINDS)[number];

export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
  gym: "Gym",
  rock: "Rock",
};

export const PLACE_KIND_HELP: Record<PlaceKind, string> = {
  gym: "Artificial walls and holds — including outdoor gym walls.",
  rock: "Natural stone — crags, cliffs, and boulder fields.",
};

export function isPlaceKind(value: string): value is PlaceKind {
  return (PLACE_KINDS as readonly string[]).includes(value);
}

export function normalizePlaceKind(
  value: string | null | undefined,
): PlaceKind {
  return value && isPlaceKind(value) ? value : "gym";
}

export function formatPlaceKind(value: string | null | undefined): string {
  return PLACE_KIND_LABELS[normalizePlaceKind(value)];
}

/** Default grade system when first setting up a new place’s chart. */
export function defaultGradeSystemForPlaceKind(kind: PlaceKind): GradeSystem {
  return kind === "rock" ? "french" : "number";
}
