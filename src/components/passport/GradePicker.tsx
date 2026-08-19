"use client";

import {
  colorHex,
  formatBandV,
  GRADE_SYSTEMS,
  gradesForSystem,
} from "@/lib/grades";
import type { GradeScale, GradeSystem } from "@/lib/types";
import { Chip } from "@/components/ui/Chip";
import { ChoiceTile } from "@/components/ui/ChoiceTile";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { cx } from "@/components/ui/cx";

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
  return (
    <GradeBadge system={system} grade={grade} vEquiv={vEquiv} color={color} className="bg-transparent px-0 py-0 text-ink" />
  );
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
            {GRADE_SYSTEMS.filter((item) => item.value !== "custom").map((item) => (
              <Chip
                key={item.value}
                selected={item.value === system}
                onClick={() => onSystem(item.value)}
                className="w-full justify-center"
              >
                {item.label}
              </Chip>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="text-sm text-ink-soft">
          {locked
            ? `This place uses ${labelFor(scale?.kind ?? system)}.`
            : `Using ${labelFor(system)}.`}
        </p>
      )}

      {scale?.chartPath ? (
        <p className="text-xs text-ink-soft">
          Grades come from this place’s chart. Pick the highest you sent.
        </p>
      ) : null}

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Highest grade</legend>
        {grades.length === 0 ? (
          <p className="text-sm text-ink-soft">Add this place’s grades first.</p>
        ) : (
          <div
            className={cx(
              "grid gap-2",
              isColor
                ? "grid-cols-2 min-[380px]:grid-cols-3"
                : locked && grades.some((g) => g.length > 4)
                  ? "grid-cols-2 min-[380px]:grid-cols-3"
                  : "grid-cols-4 min-[380px]:grid-cols-5",
            )}
          >
            {grades.map((item) => {
              const selected = item === grade;
              const band = scale?.bands.find((b) => b.label === item);
              const vHint = band ? formatBandV(band) : "";
              if (isColor) {
                const hex = colorHex(item, band?.color);
                return (
                  <ChoiceTile
                    key={item}
                    selected={selected}
                    onClick={() => onGrade(item)}
                    className="flex min-h-12 items-center gap-2 px-3 text-sm font-semibold"
                  >
                    <span
                      className="size-6 shrink-0 rounded-full border border-ink/15"
                      style={{ background: hex }}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="grade-text block truncate">{item}</span>
                      {vHint ? (
                        <span className="block text-micro font-medium text-ink-soft">{vHint}</span>
                      ) : null}
                    </span>
                  </ChoiceTile>
                );
              }
              return (
                <ChoiceTile
                  key={item}
                  selected={selected}
                  onClick={() => onGrade(item)}
                  className="flex min-h-11 flex-col items-center justify-center px-1.5 text-sm font-semibold"
                >
                  <span className="grade-text max-w-full truncate">{item}</span>
                  {vHint ? (
                    <span className="text-micro font-medium text-ink-soft">{vHint}</span>
                  ) : null}
                </ChoiceTile>
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

export { COLOR_GRADES } from "@/lib/grades";
