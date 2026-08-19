import { cx } from "./cx";

const PHASES = [
  { id: "where", label: "Where", steps: ["country", "city", "gym", "outlet"] },
  { id: "place", label: "The place", steps: ["kind", "offer", "scale"] },
  { id: "send", label: "Your send", steps: ["climb", "grade", "date", "notes"] },
] as const;

function phaseFor(step: string) {
  const index = PHASES.findIndex((phase) =>
    (phase.steps as readonly string[]).includes(step),
  );
  return index < 0 ? 2 : index;
}

export function Stepper({
  step,
  steps,
}: {
  step: string;
  steps: readonly string[];
}) {
  const currentPhase = phaseFor(step);
  const phaseSteps = (PHASES[currentPhase].steps as readonly string[]).filter(
    (item) => steps.includes(item),
  );
  const within = Math.max(0, phaseSteps.indexOf(step));
  const withinRatio =
    phaseSteps.length <= 1 ? 1 : (within + 1) / phaseSteps.length;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-center gap-3" aria-hidden>
        {PHASES.map((phase, index) => {
          const done = index < currentPhase;
          const active = index === currentPhase;
          const rotation = (index - 1) * 4;
          return (
            <div key={phase.id} className="flex flex-col items-center gap-1">
              <span
                className={cx(
                  "flex size-7 items-center justify-center rounded-full border text-micro font-bold",
                  done && "border-sky-600 bg-sky-600 text-surface",
                  active && "border-sky-600 bg-surface text-sky-700",
                  !done && !active && "border-sky-300 bg-sky-50 text-ink-faint",
                )}
                style={
                  done ? { transform: `rotate(${rotation}deg)` } : undefined
                }
              >
                {done ? "" : index + 1}
              </span>
              <span
                className={cx(
                  "text-micro font-semibold",
                  active || done ? "text-sky-700" : "text-ink-faint",
                )}
              >
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-sky-100">
        <div
          className="h-full rounded-full bg-sky-600 transition-[width] duration-200"
          style={{
            width: `${Math.round(((currentPhase + withinRatio) / PHASES.length) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
