"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { deleteVisitAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { ActionButtonLabel } from "./ActionButtonLabel";
import { TrashIcon } from "./icons";

export function DeleteStampDialog({
  visitId,
  disabled,
  onDeleted,
}: {
  visitId: string;
  disabled?: boolean;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (!pending) {
        setOpen(false);
        setError(null);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, pending]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex size-11 items-center justify-center rounded-full bg-danger-fill text-danger-solid disabled:opacity-50"
        aria-label="Delete this stamp"
      >
        <TrashIcon />
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
              <button
                type="button"
                className="absolute inset-0 bg-ink/35"
                aria-label="Cancel"
                onClick={() => !pending && setOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-title"
                aria-describedby="delete-copy"
                className="passport-sheet-in relative w-full max-w-xs rounded-xl bg-surface p-5 text-center shadow-sheet"
              >
                <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-danger-fill text-danger-solid">
                  <TrashIcon />
                </div>
                <h2 id="delete-title" className="mark text-2xl text-ink">
                  Delete this stamp?
                </h2>
                <p id="delete-copy" className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Are you sure you want to delete this visit from your passport?
                  This cannot be undone.
                </p>
                {error ? (
                  <p role="alert" className="mt-3 text-sm text-danger-ink">
                    {error}
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  aria-busy={pending}
                  className="mt-4"
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
                      setError("Could not delete that stamp.");
                      setPending(false);
                    }
                  }}
                >
                  <TrashIcon />
                  <ActionButtonLabel
                    pending={pending}
                    idle="Delete stamp"
                    busy="Deleting…"
                  />
                </Button>
                <Button
                  type="button"
                  variant="tertiary"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                  className="mt-1 w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
