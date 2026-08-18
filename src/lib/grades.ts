import type { GradeSystem } from "./types";

export const GRADE_SYSTEMS: { value: GradeSystem; label: string }[] = [
  { value: "v", label: "V-scale" },
  { value: "font", label: "Font" },
  { value: "french", label: "French" },
];

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

export function gradesForSystem(system: GradeSystem): string[] {
  switch (system) {
    case "v":
      return V_GRADES;
    case "font":
      return FONT_GRADES;
    case "french":
      return FRENCH_GRADES;
  }
}

export function formatGrade(system: GradeSystem, grade: string): string {
  if (system === "v") return grade;
  if (system === "font") return `Font ${grade}`;
  return grade;
}
