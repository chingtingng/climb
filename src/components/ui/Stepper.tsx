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

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="none">
      <path
        d="M3.5 8.2 6.4 11.2 12.5 4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
      <div className="grid grid-cols-3" aria-hidden>
        {PHASES.map((phase, index) => {
          const done = index < currentPhase;
          const active = index === currentPhase;
          const rotation = (index - 1) * 4;
          return (
            <div key={phase.id} className="flex min-w-0 flex-col items-center gap-1">
              <span
                className={cx(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-micro font-bold",
                  done && "border-sky-600 bg-sky-600 text-surface",
                  active && "border-sky-600 bg-surface text-sky-700",
                  !done && !active && "border-sky-300 bg-sky-50 text-ink-faint",
                )}
                style={
                  done ? { transform: `rotate(${rotation}deg)` } : undefined
                }
              >
                {done ? <CheckIcon /> : index + 1}
              </span>
              <span
                className={cx(
                  "w-full text-center text-micro font-semibold leading-tight",
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
