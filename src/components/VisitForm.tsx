"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  addVisitAction,
  deleteVisitAction,
  updateVisitAction,
  type ActionResult,
} from "@/app/actions";
import { GRADE_SYSTEMS, gradesForSystem } from "@/lib/grades";
import type { GradeSystem, GymVisit } from "@/lib/types";

const initial: ActionResult | null = null;

type Props = {
  visit?: GymVisit | null;
  onClose: () => void;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function VisitForm({ visit, onClose }: Props) {
  const isEdit = Boolean(visit);
  const action = isEdit ? updateVisitAction : addVisitAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const [system, setSystem] = useState<GradeSystem>(
    visit?.grade_system ?? "v",
  );

  const grades = useMemo(() => gradesForSystem(system), [system]);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1f3a4d]/35 p-3 backdrop-blur-[2px] sm:items-center">
      <div className="sheet-in w-full max-w-[430px] rounded-[1.75rem] bg-white p-5 shadow-[0_24px_60px_rgba(31,58,77,0.25)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="brand-mark text-2xl text-ink">
              {isEdit ? "Edit stamp" : "New stamp"}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Gym, place, and your highest send.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-sky-soft px-3 py-1.5 text-sm font-semibold text-ink-soft"
          >
            Close
          </button>
        </div>

        <form action={formAction} className="space-y-3.5">
          {visit && <input type="hidden" name="visit_id" value={visit.id} />}

          <Field label="Gym name">
            <input
              name="gym_name"
              required
              defaultValue={visit?.gym_name ?? ""}
              placeholder="Boulder World"
              className="field-input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <input
                name="city"
                required
                defaultValue={visit?.city ?? ""}
                placeholder="Singapore"
                className="field-input"
              />
            </Field>
            <Field label="Country">
              <input
                name="country"
                required
                defaultValue={visit?.country ?? ""}
                placeholder="Singapore"
                className="field-input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Grade system">
              <select
                name="grade_system"
                value={system}
                onChange={(e) => setSystem(e.target.value as GradeSystem)}
                className="field-input"
              >
                {GRADE_SYSTEMS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Highest grade">
              <select
                name="highest_grade"
                required
                defaultValue={
                  visit?.grade_system === system
                    ? visit.highest_grade
                    : grades[Math.min(3, grades.length - 1)]
                }
                className="field-input"
                key={system}
              >
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Visited on">
            <input
              type="date"
              name="visited_on"
              required
              defaultValue={visit?.visited_on ?? todayISO()}
              className="field-input"
            />
          </Field>

          <Field label="Notes (optional)">
            <textarea
              name="notes"
              rows={3}
              defaultValue={visit?.notes ?? ""}
              placeholder="Blue circuit felt soft…"
              className="field-input resize-none"
            />
          </Field>

          {state?.error && (
            <p className="rounded-xl bg-[#ffe8e8] px-3 py-2 text-sm text-[#8a2f2f]">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-baby-deep px-4 py-3.5 font-semibold text-white transition enabled:active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Stamp passport"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

export function DeleteVisitButton({ visitId }: { visitId: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Remove this gym stamp?")) return;
        setPending(true);
        await deleteVisitAction(visitId);
        setPending(false);
      }}
      className="text-sm font-semibold text-ink-soft/80 underline-offset-2 hover:text-[#8a2f2f] hover:underline"
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
