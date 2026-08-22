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
    <svg viewBox="0 0 16 16" aria-hidden className="size-3" fill="none">
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
  const stepNumber = Math.max(1, steps.indexOf(step) + 1);

  return (
    <div className="mb-1">
      <p className="sr-only">
        {PHASES[currentPhase].label} phase, step {stepNumber} of {steps.length}
      </p>
      <div className="relative" aria-hidden>
        <div className="pointer-events-none absolute top-3 right-[16.666%] left-[16.666%] h-px bg-sky-200">
          <div
            className="h-full bg-sky-600 transition-[width] duration-200"
            style={{
              width: `${Math.round((currentPhase / (PHASES.length - 1)) * 100)}%`,
            }}
          />
        </div>
        <div className="relative grid grid-cols-3">
          {PHASES.map((phase, index) => {
            const done = index < currentPhase;
            const active = index === currentPhase;
            return (
              <div key={phase.id} className="flex min-w-0 flex-col items-center gap-1.5">
                <span
                  className={cx(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-micro font-bold",
                    done && "border-sky-600 bg-sky-600 text-surface",
                    active && "border-sky-600 bg-surface text-sky-700",
                    !done && !active && "border-sky-200 bg-surface text-ink-faint",
                  )}
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
      </div>
    </div>
  );
}
