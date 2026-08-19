"use client";

import { useState } from "react";
import { deleteVisitAction } from "@/app/actions";
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
        className="inline-flex size-11 items-center justify-center rounded-full text-pass-muted"
        aria-label="Remove this stamp"
      >
        <TrashIcon />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <button
            type="button"
            className="absolute inset-0 bg-[#1b3a52]/35"
            aria-label="Cancel"
            onClick={() => !pending && setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="passport-sheet-in relative w-full max-w-[20rem] rounded-[1.35rem] bg-white p-5 text-center shadow-[0_16px_40px_rgba(27,58,82,0.16)]"
          >
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-[#fdecec] text-[#b42318]">
              <TrashIcon />
            </div>
            <h2 id="delete-title" className="passport-mark text-2xl text-pass-navy">
              Remove this stamp?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-pass-muted">
              This will remove this visit from your passport.
            </p>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-[#8a2f2f]">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                setError(null);
                const result = await deleteVisitAction(visitId);
                setPending(false);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                onDeleted?.();
              }}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#c23b3b] px-4 font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Removing..." : "Remove stamp"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="passport-btn-ghost mt-1 w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
