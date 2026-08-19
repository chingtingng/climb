import type { GradeBand, GradeScale, GradeSystem } from "./types";

export const GRADE_SYSTEMS: { value: GradeSystem; label: string }[] = [
  { value: "v", label: "V-scale" },
  { value: "font", label: "Font" },
  { value: "french", label: "French" },
  { value: "number", label: "Numbers" },
  { value: "color", label: "Colours" },
  { value: "custom", label: "Custom" },
];

export const STANDARD_SYSTEMS: GradeSystem[] = ["v", "font", "french"];

export const V_GRADES = [
  "VB",
  "V0",
  "V1",
  "V2",
  "V3",
  "V4",
  "V5",
  "V6",
  "V7",
  "V8",
  "V9",
  "V10",
  "V11",
  "V12",
  "V13",
  "V14",
  "V15",
  "V16",
];

export const FONT_GRADES = [
  "3",
  "4",
  "4+",
  "5",
  "5+",
  "6A",
  "6A+",
  "6B",
  "6B+",
  "6C",
  "6C+",
  "7A",
  "7A+",
  "7B",
  "7B+",
  "7C",
  "7C+",
  "8A",
  "8A+",
  "8B",
  "8B+",
  "8C",
  "8C+",
];

export const FRENCH_GRADES = [
  "4a",
  "4b",
  "4c",
  "5a",
  "5b",
  "5c",
  "6a",
  "6a+",
  "6b",
  "6b+",
  "6c",
  "6c+",
  "7a",
  "7a+",
  "7b",
  "7b+",
  "7c",
  "7c+",
  "8a",
  "8a+",
  "8b",
  "8b+",
  "8c",
  "8c+",
  "9a",
];

export const NUMBER_GRADES = Array.from({ length: 21 }, (_, i) => String(i));

export const COLOR_GRADES: { label: string; color: string }[] = [
  { label: "White", color: "#f4f1ea" },
  { label: "Yellow", color: "#f2c94c" },
  { label: "Orange", color: "#f2994a" },
  { label: "Red", color: "#eb5757" },
  { label: "Pink", color: "#e86ba8" },
  { label: "Purple", color: "#9b51e0" },
  { label: "Blue", color: "#2f80ed" },
  { label: "Green", color: "#27ae60" },
  { label: "Black", color: "#1b1b1b" },
  { label: "Grey", color: "#828282" },
  { label: "Brown", color: "#8b5e3c" },
];

export function colorHex(label: string, fallback?: string): string {
  const match = COLOR_GRADES.find(
    (item) => item.label.toLowerCase() === label.trim().toLowerCase(),
  );
  return match?.color ?? fallback ?? "#c3d7e5";
}

export function numberRange(from: number, to: number): string[] {
  const start = Math.max(0, Math.min(99, Math.trunc(from)));
  const end = Math.max(0, Math.min(99, Math.trunc(to)));
  const [lo, hi] = start <= end ? [start, end] : [end, start];
  return Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i));
}

export function bandsFromScale(scale: GradeScale | null | undefined): GradeBand[] {
  return scale?.bands ?? [];
}

export function gradesForSystem(
  system: GradeSystem,
  scale?: GradeScale | null,
): string[] {
  if (scale && scale.kind === system && scale.bands.length > 0) {
    return scale.bands.map((band) => band.label);
  }
  switch (system) {
    case "v":
      return V_GRADES;
    case "font":
      return FONT_GRADES;
    case "french":
      return FRENCH_GRADES;
    case "number":
      return NUMBER_GRADES;
    case "color":
      return COLOR_GRADES.map((item) => item.label);
    case "custom":
      return scale?.bands.map((band) => band.label) ?? [];
  }
}

export function formatGrade(system: GradeSystem, grade: string): string {
  if (system === "font") return `Font ${grade}`;
  return grade;
}

/** Prefer mapped V-grade for stamps / best-send display (e.g. house “6” → “V3”). */
export function displayGrade(
  system: GradeSystem,
  grade: string,
  vEquiv?: string | null,
): { system: GradeSystem; grade: string } {
  const v = canonicalVGrade(vEquiv);
  if (v) return { system: "v", grade: v };
  return { system, grade: formatGrade(system, grade) };
}

export function isHouseSystem(system: GradeSystem): boolean {
  return system === "number" || system === "color" || system === "custom";
}

export function isGradeSystem(value: string): value is GradeSystem {
  return GRADE_SYSTEMS.some((item) => item.value === value);
}

/** Accept only VB / V0–V16 (matches supabase/schema.sql is_v_grade). */
export function isVGrade(value: string): boolean {
  return /^(VB|V([0-9]|1[0-6]))$/.test(value.trim());
}

export function normalizeVEquiv(value: unknown): string | undefined {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed || !isVGrade(trimmed)) return undefined;
  return trimmed;
}

export function vGradeIndex(value: string | undefined | null): number {
  if (!value) return -1;
  const high = canonicalVGrade(value);
  return high ? V_GRADES.indexOf(high) : -1;
}

/** Prefer the high end of a range for stamps / best-send ranking. */
export function canonicalVGrade(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (isVGrade(trimmed)) return trimmed;
  const range = trimmed.match(
    /^(VB|V(?:[0-9]|1[0-6]))\s*[-–—]\s*(VB|V(?:[0-9]|1[0-6]))$/i,
  );
  if (range) {
    const a = normalizeVEquiv(range[1]);
    const b = normalizeVEquiv(range[2]);
    if (!a || !b) return undefined;
    return V_GRADES.indexOf(a) >= V_GRADES.indexOf(b) ? a : b;
  }
  const open = trimmed.match(/^(VB|V(?:[0-9]|1[0-6]))\+$/i);
  if (open) return normalizeVEquiv(open[1]);
  return undefined;
}

export function bandVMin(band: Pick<GradeBand, "v_equiv" | "v_max">): string | undefined {
  return normalizeVEquiv(band.v_equiv);
}

export function bandVMax(band: Pick<GradeBand, "v_equiv" | "v_max">): string | undefined {
  const max = normalizeVEquiv(band.v_max);
  const min = bandVMin(band);
  if (!max) return min;
  if (!min) return max;
  return V_GRADES.indexOf(max) >= V_GRADES.indexOf(min) ? max : min;
}

/** Single grade, a range (V3–V4), or empty. */
export function formatBandV(band: Pick<GradeBand, "v_equiv" | "v_max">): string {
  const lo = bandVMin(band);
  const hi = bandVMax(band);
  if (!lo) return "";
  if (!hi || hi === lo) return lo;
  return `${lo}–${hi}`;
}

export function normalizeBandVRange(
  v_equiv: unknown,
  v_max: unknown,
): Pick<GradeBand, "v_equiv" | "v_max"> {
  const a = normalizeVEquiv(v_equiv);
  const b = normalizeVEquiv(v_max);
  if (!a && !b) return {};
  if (!a) return { v_equiv: b };
  if (!b || b === a) return { v_equiv: a };
  if (V_GRADES.indexOf(b) < V_GRADES.indexOf(a)) {
    return { v_equiv: b, v_max: a };
  }
  return { v_equiv: a, v_max: b };
}

export function vEquivFor(
  system: GradeSystem,
  grade: string,
  scale?: GradeScale | null,
): string | undefined {
  const band = scale?.bands.find(
    (item) => item.label.toLowerCase() === grade.trim().toLowerCase(),
  );
  if (band) {
    const high = bandVMax(band);
    if (high) return high;
  }
  if (system === "v") return normalizeVEquiv(grade);
  return undefined;
}

/** Rough 0–100 rank so mixed grade systems can still pick a “best send”. */
export function gradeSortValue(
  system: GradeSystem,
  grade: string,
  vEquiv?: string | null,
): number {
  if (vEquiv) {
    const idx = vGradeIndex(vEquiv);
    if (idx >= 0) return (idx / Math.max(1, V_GRADES.length - 1)) * 100;
  }
  if (system === "number") {
    const n = Number.parseInt(grade, 10);
    if (Number.isFinite(n)) return Math.min(100, (n / 20) * 100);
  }
  const list = gradesForSystem(system);
  const idx = list.findIndex(
    (item) => item.toLowerCase() === grade.trim().toLowerCase(),
  );
  if (idx < 0) return 0;
  return (idx / Math.max(1, list.length - 1)) * 100;
}
