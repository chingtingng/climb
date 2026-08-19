import { colorHex, displayGrade } from "@/lib/grades";
import type { GradeSystem } from "@/lib/types";
import { cx } from "./cx";

/** Prefix only when the grade string is not self-identifying. Font is already "Font 6A". */
function systemTag(system: GradeSystem): string | null {
  return system === "french" ? "French" : null;
}

export function GradeBadge({
  system,
  grade,
  vEquiv,
  color,
  className,
}: {
  system: GradeSystem;
  grade: string;
  vEquiv?: string | null;
  color?: string;
  className?: string;
}) {
  const shown = displayGrade(system, grade, vEquiv);
  const tag = systemTag(shown.system);
  const isColor = shown.system === "color";

  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-sky-700",
        className,
      )}
    >
      {isColor ? (
        <span
          className="size-2.5 shrink-0 rounded-full border border-ink/15"
          style={{ background: colorHex(grade, color) }}
          aria-hidden
        />
      ) : null}
      {tag ? (
        <span className="text-micro font-semibold text-ink-soft">{tag}</span>
      ) : null}
      <span className="grade-text truncate text-sm">{shown.grade}</span>
    </span>
  );
}
