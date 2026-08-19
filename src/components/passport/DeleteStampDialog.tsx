"use client";

import { useState } from "react";
import { deleteVisitAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
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
        className="inline-flex size-11 items-center justify-center rounded-full text-ink-soft"
        aria-label="Remove this stamp"
      >
        <TrashIcon />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
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
            className="passport-sheet-in relative w-full max-w-xs rounded-xl bg-surface p-5 text-center shadow-sheet"
          >
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-danger-fill text-danger-solid">
              <TrashIcon />
            </div>
            <h2 id="delete-title" className="mark text-2xl text-ink">
              Remove this stamp?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              This will remove this visit from your passport.
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
                  setError("Could not remove that stamp.");
                  setPending(false);
                }
              }}
            >
              <TrashIcon />
              <ActionButtonLabel
                pending={pending}
                idle="Remove stamp"
                busy="Removing…"
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
        </div>
      ) : null}
    </>
  );
}
