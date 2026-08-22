"use client";

import { useEffect, useId, useState } from "react";
import { changePasswordAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { AccountDialog } from "./AccountDialog";
import { ActionButtonLabel } from "./ActionButtonLabel";

export function ChangePasswordDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const copyId = useId();
  const currentId = useId();
  const nextId = useId();
  const confirmId = useId();

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setError(null);
    setPending(false);
  }, [open]);

  return (
    <AccountDialog
      open={open}
      pending={pending}
      onClose={onClose}
      titleId={titleId}
      descriptionId={copyId}
      title="Change password"
      description={`Use at least ${MIN_PASSWORD_LENGTH} characters, and don’t reuse a password from another site. You'll need your current password.`}
    >
      <form
        className="account-edit-form mt-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending) return;
          if (nextPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
          }
          setPending(true);
          setError(null);
          try {
            const result = await changePasswordAction(currentPassword, nextPassword);
            if (result?.error) {
              setError(result.error);
              setPending(false);
              return;
            }
            onClose();
          } catch {
            setError("Could not update password.");
            setPending(false);
          }
        }}
      >
        <label htmlFor={currentId}>
          Current password
          <Field
            id={currentId}
            name="current_password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={pending}
            preventIosZoom
          />
        </label>
        <label htmlFor={nextId}>
          New password
          <Field
            id={nextId}
            name="new_password"
            type="password"
            value={nextPassword}
            onChange={(event) => setNextPassword(event.target.value)}
            required
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={MIN_PASSWORD_LENGTH}
            disabled={pending}
            preventIosZoom
          />
        </label>
        <label htmlFor={confirmId}>
          Confirm new password
          <Field
            id={confirmId}
            name="confirm_password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={MIN_PASSWORD_LENGTH}
            disabled={pending}
            preventIosZoom
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-danger-ink">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} aria-busy={pending} className="mt-1">
          <ActionButtonLabel pending={pending} idle="Save password" busy="Saving…" />
        </Button>
        <Button type="button" variant="tertiary" disabled={pending} onClick={onClose}>
          Cancel
        </Button>
      </form>
    </AccountDialog>
  );
}
