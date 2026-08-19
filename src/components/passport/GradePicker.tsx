"use client";

import {
  COLOR_GRADES,
  colorHex,
  displayGrade,
  formatBandV,
  GRADE_SYSTEMS,
  gradesForSystem,
} from "@/lib/grades";
import type { GradeScale, GradeSystem } from "@/lib/types";

export function GradeLabel({
  system,
  grade,
  vEquiv,
  color,
}: {
  system: GradeSystem;
  grade: string;
  vEquiv?: string | null;
  color?: string;
}) {
  const shown = displayGrade(system, grade, vEquiv);
  if (shown.system === "color" || (system === "color" && !vEquiv)) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-full border border-black/10"
          style={{ background: colorHex(grade, color) }}
          aria-hidden
        />
        {shown.grade}
      </span>
    );
  }
  return <>{shown.grade}</>;
}

export function GradePicker({
  system,
  grade,
  scale,
  allowSystemChange,
  onSystem,
  onGrade,
}: {
  system: GradeSystem;
  grade: string;
  scale?: GradeScale | null;
  allowSystemChange: boolean;
  onSystem: (system: GradeSystem) => void;
  onGrade: (grade: string) => void;
}) {
  const locked = Boolean(scale && scale.bands.length > 0);
  const grades = gradesForSystem(system, scale);
  const isColor = system === "color";

  return (
    <div className="space-y-3">
      {allowSystemChange && !locked ? (
        <fieldset>
          <legend className="field-label">Grade system</legend>
          <div className="grid grid-cols-3 gap-2">
            {GRADE_SYSTEMS.filter((item) => item.value !== "custom").map((item) => {
              const selected = item.value === system;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onSystem(item.value)}
                  className={`chip justify-center ${selected ? "chip-selected" : ""}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <p className="text-[0.82rem] text-ink-soft">
          {locked
            ? `This place uses ${labelFor(scale?.kind ?? system)}.`
            : `Using ${labelFor(system)}.`}
        </p>
      )}

      {scale?.chartPath ? (
        <p className="text-[0.75rem] text-ink-faint">
          Grades come from this place’s chart. Pick the highest you sent.
        </p>
      ) : null}

      <fieldset>
        <legend className="field-label">Highest grade</legend>
        {grades.length === 0 ? (
          <p className="text-[0.82rem] text-ink-soft">Add this place’s grades first.</p>
        ) : (
          <div
            className={`grid gap-2 ${
              isColor
                ? "grid-cols-2 min-[380px]:grid-cols-3"
                : locked && grades.some((g) => g.length > 4)
                  ? "grid-cols-2 min-[380px]:grid-cols-3"
                  : "grid-cols-4 min-[380px]:grid-cols-5"
            }`}
          >
            {grades.map((item) => {
              const selected = item === grade;
              const band = scale?.bands.find((b) => b.label === item);
              const vHint = band ? formatBandV(band) : "";
              if (isColor) {
                const hex = colorHex(item, band?.color);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onGrade(item)}
                    className={`flex min-h-12 items-center gap-2 rounded-2xl border bg-white px-3 text-left text-sm font-semibold transition ${
                      selected
                        ? "border-sky-500 ring-2 ring-sky-300/50"
                        : "border-line hover:border-sky-300"
                    }`}
                  >
                    <span
                      className="size-6 shrink-0 rounded-full border border-black/10"
                      style={{ background: hex }}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block truncate">{item}</span>
                      {vHint ? (
                        <span className="block text-[11px] font-medium text-ink-faint">{vHint}</span>
                      ) : null}
                    </span>
                  </button>
                );
              }
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onGrade(item)}
                  className={`flex min-h-11 flex-col items-center justify-center rounded-xl border px-1.5 text-sm font-semibold transition ${
                    selected
                      ? "border-transparent bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-[0_8px_18px_-9px_rgba(42,113,163,0.7)]"
                      : "border-line bg-white text-ink hover:border-sky-300"
                  }`}
                >
                  <span className="max-w-full truncate">{item}</span>
                  {vHint ? (
                    <span
                      className={`text-[10px] font-medium ${
                        selected ? "text-white/80" : "text-ink-faint"
                      }`}
                    >
                      {vHint}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>
    </div>
  );
}

function labelFor(system: GradeSystem): string {
  return GRADE_SYSTEMS.find((item) => item.value === system)?.label ?? system;
}

export { COLOR_GRADES };
