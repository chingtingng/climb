"use client";

import { useState } from "react";
import { deleteVisitAction } from "@/app/actions";
import { ActionButtonLabel } from "./ActionButtonLabel";
import { TrashIcon } from "./icons";

export function DeleteStampDialog({
  visitId,
  onDeleted,
}: {
  visitId: string;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-faint transition hover:bg-[#fdecea] hover:text-[#b4342c]"
        aria-label="Remove this stamp"
      >
        <TrashIcon />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <button
            type="button"
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            aria-label="Cancel"
            onClick={() => !pending && setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="card passport-sheet-in relative w-full max-w-[20rem] p-5 text-center"
          >
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-[#fdecea] text-[#b4342c]">
              <TrashIcon />
            </div>
            <h2 id="delete-title" className="wordmark text-[1.55rem] text-ink">
              Remove this stamp?
            </h2>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-soft">
              This will remove this visit from your passport.
            </p>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-[#b4342c]">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              disabled={pending}
              aria-busy={pending}
              onClick={async () => {
                if (pending) return;
                setPending(true);
                setError(null);
                try {
                  const result = await deleteVisitAction(visitId);
                  if (result.error) {
                    setError(result.error);
                    setPending(false);
                    return;
                  }
                  setOpen(false);
                  onDeleted?.();
                } catch {
                  setError("Could not remove that stamp.");
                  setPending(false);
                }
              }}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#b4342c] px-4 font-semibold text-white shadow-[0_10px_22px_-10px_rgba(180,52,44,0.7)] transition hover:bg-[#98291f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ActionButtonLabel
                pending={pending}
                idle="Remove stamp"
                busy="Removing…"
              />
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="btn-ghost mt-1 w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
