import type { ClimbingType } from "./climbingTypes";
import type { GradeBand, GradeScale, GradeSystem } from "./types";

export const GRADE_SYSTEMS: { value: GradeSystem; label: string }[] = [
  { value: "v", label: "V-scale" },
  { value: "font", label: "Font" },
  { value: "french", label: "French" },
  { value: "yds", label: "YDS" },
  { value: "number", label: "Numbers" },
  { value: "color", label: "Colours" },
  { value: "custom", label: "Custom" },
];

export function gradeSystemLabel(system: GradeSystem): string {
  return GRADE_SYSTEMS.find((item) => item.value === system)?.label ?? system;
}

export const STANDARD_SYSTEMS: GradeSystem[] = ["v", "font", "french", "yds"];

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
  "V17",
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
  "9A",
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
  "9a+",
  "9b",
  "9b+",
  "9c",
];

/** Yosemite Decimal System — 5.4 through 5.15d. */
export const YDS_GRADES = [
  "5.4",
  "5.5",
  "5.6",
  "5.7",
  "5.8",
  "5.9",
  "5.10a",
  "5.10b",
  "5.10c",
  "5.10d",
  "5.11a",
  "5.11b",
  "5.11c",
  "5.11d",
  "5.12a",
  "5.12b",
  "5.12c",
  "5.12d",
  "5.13a",
  "5.13b",
  "5.13c",
  "5.13d",
  "5.14a",
  "5.14b",
  "5.14c",
  "5.14d",
  "5.15a",
  "5.15b",
  "5.15c",
  "5.15d",
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

/**
 * Gym-poster conversions with V as the spine (how this passport compares sends).
 * Font is bouldering. YDS and French are sport/trad — a feel comparison, not 1:1.
 */
export type GradeComparisonRow = {
  v: string;
  font: string;
  yds: string;
  french: string;
};

export const GRADE_COMPARISON: GradeComparisonRow[] = [
  { v: "VB", font: "3–4", yds: "5.8–5.9", french: "5a–5c" },
  { v: "V0", font: "4+", yds: "5.10a–b", french: "6a–6a+" },
  { v: "V1", font: "5–5+", yds: "5.10c–d", french: "6b–6b+" },
  { v: "V2", font: "6A", yds: "5.11a–b", french: "6c–6c+" },
  { v: "V3", font: "6A+", yds: "5.11c–d", french: "7a–7a+" },
  { v: "V4", font: "6B–6B+", yds: "5.12a", french: "7b" },
  { v: "V5", font: "6C–6C+", yds: "5.12b–c", french: "7b+–7c" },
  { v: "V6", font: "7A", yds: "5.12d", french: "7c+" },
  { v: "V7", font: "7A+", yds: "5.13a", french: "8a" },
  { v: "V8", font: "7B–7B+", yds: "5.13b", french: "8a+" },
  { v: "V9", font: "7C", yds: "5.13c", french: "8b" },
  { v: "V10", font: "7C+", yds: "5.13d", french: "8b+" },
  { v: "V11", font: "8A", yds: "5.14a", french: "8c" },
  { v: "V12", font: "8A+", yds: "5.14b", french: "8c+" },
  { v: "V13", font: "8B", yds: "5.14c", french: "9a" },
  { v: "V14", font: "8B+", yds: "5.14d", french: "9a+" },
  { v: "V15", font: "8C", yds: "5.15a", french: "9b" },
  { v: "V16", font: "8C+", yds: "5.15b–c", french: "9b+" },
  { v: "V17", font: "9A", yds: "5.15d", french: "9c" },
];

/** 1:1-ish sport/trad conversion. More agreed-upon than boulder ↔ route. */
export const SPORT_GRADE_COMPARISON: { yds: string; french: string }[] = [
  { yds: "5.4", french: "4a" },
  { yds: "5.5", french: "4b" },
  { yds: "5.6", french: "4c" },
  { yds: "5.7", french: "5a" },
  { yds: "5.8", french: "5b" },
  { yds: "5.9", french: "5c" },
  { yds: "5.10a", french: "6a" },
  { yds: "5.10b", french: "6a+" },
  { yds: "5.10c", french: "6b" },
  { yds: "5.10d", french: "6b+" },
  { yds: "5.11a", french: "6c" },
  { yds: "5.11b", french: "6c+" },
  { yds: "5.11c", french: "7a" },
  { yds: "5.11d", french: "7a+" },
  { yds: "5.12a", french: "7b" },
  { yds: "5.12b", french: "7b+" },
  { yds: "5.12c", french: "7c" },
  { yds: "5.12d", french: "7c+" },
  { yds: "5.13a", french: "8a" },
  { yds: "5.13b", french: "8a+" },
  { yds: "5.13c", french: "8b" },
  { yds: "5.13d", french: "8b+" },
  { yds: "5.14a", french: "8c" },
  { yds: "5.14b", french: "8c+" },
  { yds: "5.14c", french: "9a" },
  { yds: "5.14d", french: "9a+" },
  { yds: "5.15a", french: "9b" },
  { yds: "5.15b", french: "9b+" },
  { yds: "5.15c", french: "9c" },
  { yds: "5.15d", french: "9c" },
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
    case "yds":
      return YDS_GRADES;
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

/** Show the gym’s own grade (e.g. house “6”, “Yellow”). V-equiv is only a fallback. */
export function displayGrade(
  system: GradeSystem,
  grade: string,
  vEquiv?: string | null,
): { system: GradeSystem; grade: string } {
  const label = grade.trim();
  if (label) return { system, grade: formatGrade(system, label) };
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

/** Accept only VB / V0–V17 (matches supabase/schema.sql is_v_grade). */
export function isVGrade(value: string): boolean {
  return /^(VB|V([0-9]|1[0-7]))$/.test(value.trim());
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
    /^(VB|V(?:[0-9]|1[0-7]))\s*[-–—]\s*(VB|V(?:[0-9]|1[0-7]))$/i,
  );
  if (range) {
    const a = normalizeVEquiv(range[1]);
    const b = normalizeVEquiv(range[2]);
    if (!a || !b) return undefined;
    return V_GRADES.indexOf(a) >= V_GRADES.indexOf(b) ? a : b;
  }
  const open = trimmed.match(/^(VB|V(?:[0-9]|1[0-7]))\+$/i);
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

/** True when a gym chart can be lined up against V rows. */
export function hasVMapping(scale: GradeScale | null | undefined): boolean {
  if (!scale?.bands.length) return false;
  if (scale.kind === "v" || scale.kind === "font" || scale.kind === "french" || scale.kind === "yds") {
    return true;
  }
  return scale.bands.some((band) => bandVMin(band) || bandVMax(band));
}

/** House (or standard) grades at this V — a colour/number may span a V range. */
export function bandsForVGrade(scale: GradeScale, v: string): GradeBand[] {
  return scale.bands.filter((band) => bandCoversVGrade(scale.kind, band, v));
}

function bandCoversVGrade(kind: GradeSystem, band: GradeBand, v: string): boolean {
  const idx = vGradeIndex(v);
  if (idx < 0) return false;
  const lo = vGradeIndex(bandVMin(band));
  if (lo >= 0) {
    const hi = vGradeIndex(bandVMax(band));
    const end = hi >= 0 ? hi : lo;
    return idx >= Math.min(lo, end) && idx <= Math.max(lo, end);
  }
  if (kind === "v") return vGradeIndex(band.label) === idx;
  if (kind === "font" || kind === "french" || kind === "yds") {
    return vGradesForStandardGrade(kind, band.label).includes(v);
  }
  return false;
}

function vGradesForStandardGrade(
  system: "font" | "french" | "yds",
  grade: string,
): string[] {
  const list = gradesForSystem(system);
  return GRADE_COMPARISON.filter((row) =>
    cellCoversGrade(row[system], grade, list),
  ).map((row) => row.v);
}

function cellCoversGrade(cell: string, grade: string, list: string[]): boolean {
  const target = grade.trim();
  const value = cell.trim();
  if (!target || !value) return false;
  if (value.toLowerCase() === target.toLowerCase()) return true;
  const parts = value.split(/[–-]/).map((part) => part.trim());
  if (parts.length !== 2) return false;
  const start = parts[0];
  const end = expandRangeEnd(start, parts[1]);
  const i0 = list.findIndex((item) => item.toLowerCase() === start.toLowerCase());
  const i1 = list.findIndex((item) => item.toLowerCase() === end.toLowerCase());
  const ig = list.findIndex((item) => item.toLowerCase() === target.toLowerCase());
  if (i0 < 0 || i1 < 0 || ig < 0) return false;
  return ig >= Math.min(i0, i1) && ig <= Math.max(i0, i1);
}

/** "5.10a–b" → 5.10b; "6B–6B+" stays as written. */
function expandRangeEnd(start: string, end: string): string {
  if (start.startsWith("5.") && /^[a-d]$/i.test(end)) {
    return start.replace(/[a-d]$/i, "") + end.toLowerCase();
  }
  return end;
}

export function vEquivFor(
  system: GradeSystem,
  grade: string,
  scale?: GradeScale | null,
): string | undefined {
  const band = bandForGrade(scale, grade);
  if (band) {
    const high = bandVMax(band);
    if (high) return high;
  }
  if (system === "v") return normalizeVEquiv(grade);
  if (system === "font" || system === "french" || system === "yds") {
    return highestVForStandard(system, grade);
  }
  return undefined;
}

/** Rough 0–100 rank so mixed grade systems can still pick a “best send”. */
export function gradeSortValue(
  system: GradeSystem,
  grade: string,
  vEquiv?: string | null,
): number {
  const v =
    canonicalVGrade(vEquiv) ??
    (system === "v" ? canonicalVGrade(grade) : undefined) ??
    (system === "font" || system === "french" || system === "yds"
      ? highestVForStandard(system, grade)
      : undefined);
  if (v) {
    const idx = vGradeIndex(v);
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

type SendRankInput = {
  grade_system: GradeSystem;
  highest_grade: string;
  v_equiv?: string | null;
  visited_on?: string;
  created_at?: string;
};

/** Best send first: higher V-spine rank, then more recent stamp. */
export function compareSendRank(a: SendRankInput, b: SendRankInput): number {
  const byGrade =
    gradeSortValue(b.grade_system, b.highest_grade, b.v_equiv) -
    gradeSortValue(a.grade_system, a.highest_grade, a.v_equiv);
  if (byGrade !== 0) return byGrade;
  const aDay = a.visited_on ?? "";
  const bDay = b.visited_on ?? "";
  if (aDay !== bDay) return bDay.localeCompare(aDay);
  return (b.created_at ?? "").localeCompare(a.created_at ?? "");
}

/**
 * Short passport-stat grade: V for bouldering, French for top-rope / lead.
 * House colours and custom labels are converted; unmapped sends return null.
 */
export function compactBestSend(
  visit: {
    climbing_type: ClimbingType;
    grade_system: GradeSystem;
    highest_grade: string;
    v_equiv?: string | null;
  },
  scale?: GradeScale | null,
): string | null {
  const grade = visit.highest_grade.trim();
  const band = bandForGrade(scale, grade);
  const storedV = (band ? bandVMax(band) : undefined) ?? canonicalVGrade(visit.v_equiv);
  if (visit.climbing_type === "bouldering") {
    return boulderCompactV(visit.grade_system, grade, storedV) ?? null;
  }
  return ropeCompactFrench(visit.grade_system, grade, band, storedV) ?? null;
}

function bandForGrade(
  scale: GradeScale | null | undefined,
  grade: string,
): GradeBand | undefined {
  if (!scale?.bands.length) return undefined;
  const target = grade.trim().toLowerCase();
  if (!target) return undefined;
  return scale.bands.find((band) => band.label.toLowerCase() === target);
}

function highestVForStandard(
  system: "font" | "french" | "yds",
  grade: string,
): string | undefined {
  const vs = vGradesForStandardGrade(system, grade);
  if (vs.length === 0) return undefined;
  return vs.reduce((best, v) => (vGradeIndex(v) > vGradeIndex(best) ? v : best));
}

function frenchFromV(v: string | null | undefined): string | undefined {
  const key = canonicalVGrade(v);
  if (!key) return undefined;
  const row = GRADE_COMPARISON.find((item) => item.v === key);
  return row ? highEndInList(row.french, FRENCH_GRADES) : undefined;
}

function ydsToFrench(grade: string): string | undefined {
  const target = grade.trim().toLowerCase();
  const exact = SPORT_GRADE_COMPARISON.find((row) => row.yds.toLowerCase() === target);
  if (exact) return exact.french;
  return frenchFromV(highestVForStandard("yds", grade));
}

function listMatch(grade: string, list: string[]): string | undefined {
  const target = grade.trim().toLowerCase();
  if (!target) return undefined;
  return list.find((item) => item.toLowerCase() === target);
}

function highEndInList(cell: string, list: string[]): string | undefined {
  const value = cell.trim();
  if (!value) return undefined;
  const exact = listMatch(value, list);
  if (exact) return exact;
  const parts = value.split(/[–-]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return undefined;
  const start = parts[0];
  const end = expandRangeEnd(start, parts[parts.length - 1]);
  const i0 = list.findIndex((item) => item.toLowerCase() === start.toLowerCase());
  const i1 = list.findIndex((item) => item.toLowerCase() === end.toLowerCase());
  if (i0 < 0 && i1 < 0) return undefined;
  if (i0 < 0) return list[i1];
  if (i1 < 0) return list[i0];
  return list[Math.max(i0, i1)];
}

function boulderCompactV(
  system: GradeSystem,
  grade: string,
  storedV: string | undefined,
): string | undefined {
  switch (system) {
    case "v":
      return canonicalVGrade(grade) ?? storedV;
    case "font":
      return highestVForStandard("font", grade) ?? storedV;
    case "french":
      return highestVForStandard("french", grade) ?? storedV;
    case "yds":
      return highestVForStandard("yds", grade) ?? storedV;
    default:
      return storedV;
  }
}

function ropeCompactFrench(
  system: GradeSystem,
  grade: string,
  band: GradeBand | undefined,
  storedV: string | undefined,
): string | undefined {
  const fromHint = highEndInList(band?.hint ?? "", FRENCH_GRADES);
  switch (system) {
    case "french":
      return listMatch(grade, FRENCH_GRADES) ?? fromHint ?? frenchFromV(storedV);
    case "yds":
      return ydsToFrench(grade) ?? fromHint ?? frenchFromV(storedV);
    case "v":
      return frenchFromV(grade) ?? frenchFromV(storedV);
    case "font":
      return frenchFromV(highestVForStandard("font", grade) ?? storedV);
    default:
      return fromHint ?? frenchFromV(storedV);
  }
}
