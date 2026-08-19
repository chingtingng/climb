"use client";

import { COLOR_GRADES, colorHex, formatBandV, GRADE_SYSTEMS, gradesForSystem } from "@/lib/grades";
import type { GradeScale, GradeSystem } from "@/lib/types";

export function GradeLabel({
  system,
  grade,
  color,
}: {
  system: GradeSystem;
  grade: string;
  color?: string;
}) {
  if (system === "color") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-full border border-black/10"
          style={{ background: colorHex(grade, color) }}
          aria-hidden
        />
        {grade}
      </span>
    );
  }
  return <>{grade}</>;
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
          <legend className="mb-1.5 text-sm font-semibold">Grade system</legend>
          <div className="grid grid-cols-3 gap-2">
            {GRADE_SYSTEMS.filter((item) => item.value !== "custom").map((item) => {
              const selected = item.value === system;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onSystem(item.value)}
                  className={`min-h-11 rounded-full border text-sm font-semibold ${
                    selected
                      ? "border-pass-primary bg-[#e7f4fb] text-pass-navy"
                      : "border-pass-line bg-white text-pass-muted"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <p className="text-sm text-pass-muted">
          {locked
            ? `This gym uses ${labelFor(scale?.kind ?? system)}.`
            : `Using ${labelFor(system)}.`}
        </p>
      )}

      {scale?.chartPath ? (
        <p className="text-xs text-pass-muted">
          Grades come from this gym’s chart. Pick the highest you sent.
        </p>
      ) : null}

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Highest grade</legend>
        {grades.length === 0 ? (
          <p className="text-sm text-pass-muted">Add this gym’s grades first.</p>
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
                    className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 text-left text-sm font-semibold ${
                      selected
                        ? "border-pass-primary ring-2 ring-pass-primary/25"
                        : "border-pass-line"
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
                        <span className="block text-[11px] font-medium text-pass-muted">{vHint}</span>
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
                  className={`flex min-h-11 flex-col items-center justify-center rounded-xl border px-1.5 text-sm font-semibold ${
                    selected
                      ? "border-pass-primary bg-[#e7f4fb] text-pass-navy"
                      : "border-pass-line bg-white text-pass-navy"
                  }`}
                >
                  <span className="max-w-full truncate">{item}</span>
                  {vHint ? (
                    <span className="text-[10px] font-medium text-pass-muted">{vHint}</span>
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
