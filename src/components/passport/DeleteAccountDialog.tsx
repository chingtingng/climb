"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { deleteAccountAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ActionButtonLabel } from "./ActionButtonLabel";
import { TrashIcon } from "./icons";

export function DeleteAccountDialog({
  username,
  open,
  onClose,
}: {
  username: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const copyId = useId();
  const fieldId = useId();
  const matches = confirmation.trim().toLowerCase() === username.toLowerCase();

  useEffect(() => {
    if (!open) {
      setConfirmation("");
      setError(null);
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (!pending) onClose();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, pending, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <button
        type="button"
        className="absolute inset-0 bg-ink/35"
        aria-label="Cancel"
        onClick={() => !pending && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={copyId}
        className="passport-sheet-in relative w-full max-w-xs rounded-xl bg-surface p-5 text-center shadow-sheet"
      >
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-danger-fill text-danger-solid">
          <TrashIcon />
        </div>
        <h2 id={titleId} className="mark text-2xl text-ink">
          Delete your account?
        </h2>
        <p id={copyId} className="mt-2 text-sm leading-relaxed text-ink-soft">
          This removes your login and stamps. This cannot be undone.
        </p>
        <label
          htmlFor={fieldId}
          className="mt-4 block text-left text-xs font-semibold text-ink"
        >
          Type {username} to confirm
        </label>
        <Field
          id={fieldId}
          name="confirm_username"
          type="text"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={username}
          disabled={pending}
          preventIosZoom
          className="mt-1.5 text-left"
        />
        {error ? (
          <p role="alert" className="mt-3 text-sm text-danger-ink">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          variant="destructive"
          disabled={pending || !matches}
          aria-busy={pending}
          className="mt-4"
          onClick={async () => {
            if (pending || !matches) return;
            setPending(true);
            setError(null);
            try {
              const result = await deleteAccountAction(confirmation);
              if (result?.error) {
                setError(result.error);
                setPending(false);
                return;
              }
              router.replace("/?deleted=1");
              router.refresh();
            } catch {
              setError("Could not delete the account.");
              setPending(false);
            }
          }}
        >
          <TrashIcon />
          <ActionButtonLabel
            pending={pending}
            idle="Delete account"
            busy="Deleting…"
          />
        </Button>
        <Button
          type="button"
          variant="tertiary"
          disabled={pending}
          onClick={onClose}
          className="mt-1 w-full"
        >
          Cancel
        </Button>
      </div>
    </div>,
    document.body,
  );
}
