export const CLIMBING_TYPES = ["bouldering", "top_rope", "lead"] as const;

export type ClimbingType = (typeof CLIMBING_TYPES)[number];

export const CLIMBING_TYPE_LABELS: Record<ClimbingType, string> = {
  bouldering: "Bouldering",
  top_rope: "Top-rope",
  lead: "Lead",
};

export function isClimbingType(value: string): value is ClimbingType {
  return (CLIMBING_TYPES as readonly string[]).includes(value);
}

/** Stable order: bouldering → top-rope → lead. Dedupes invalid values. */
export function normalizeClimbingTypes(
  values: readonly string[] | null | undefined,
): ClimbingType[] {
  const have = new Set(
    (values ?? []).filter((value): value is ClimbingType => isClimbingType(value)),
  );
  return CLIMBING_TYPES.filter((type) => have.has(type));
}

export function formatClimbingType(type: string | null | undefined): string {
  if (type && isClimbingType(type)) return CLIMBING_TYPE_LABELS[type];
  return type?.trim() || "";
}

export function formatClimbingTypes(types: readonly string[] | null | undefined): string {
  return normalizeClimbingTypes(types)
    .map((type) => CLIMBING_TYPE_LABELS[type])
    .join(" · ");
}

/** Default when a gym has no types recorded yet. */
export const DEFAULT_CLIMBING_TYPES: ClimbingType[] = ["bouldering"];
