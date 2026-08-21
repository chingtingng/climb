"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { changeUsernameAction } from "@/app/actions";
import { UsernameField } from "@/components/auth/UsernameField";
import { useUsernameCheck } from "@/components/auth/useUsernameCheck";
import { Button } from "@/components/ui/Button";
import { AccountDialog } from "./AccountDialog";
import { ActionButtonLabel } from "./ActionButtonLabel";

export function ChangeUsernameDialog({
  username,
  open,
  onClose,
}: {
  username: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(username);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const copyId = useId();
  const unchanged = value.trim().toLowerCase() === username;
  const { usernameError, usernameChecking, usernameAvailable } = useUsernameCheck(
    value,
    open && !unchanged,
  );

  useEffect(() => {
    if (!open) return;
    setValue(username);
    setError(null);
    setPending(false);
  }, [open, username]);

  return (
    <AccountDialog
      open={open}
      pending={pending}
      onClose={onClose}
      titleId={titleId}
      descriptionId={copyId}
      title="Change username"
      description="This is how you appear in the app. Letters, numbers, and underscores."
    >
      <form
        className="account-edit-form mt-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending || unchanged || usernameError || usernameChecking) return;
          setPending(true);
          setError(null);
          try {
            const result = await changeUsernameAction(value);
            if (result?.error) {
              setError(result.error);
              setPending(false);
              return;
            }
            router.refresh();
            onClose();
          } catch {
            setError("Could not save username.");
            setPending(false);
          }
        }}
      >
        <UsernameField
          value={value}
          onChange={setValue}
          disabled={pending}
          error={usernameError}
          checking={usernameChecking}
          available={usernameAvailable}
          describedById="manage-username-availability"
        />
        {error ? (
          <p role="alert" className="text-sm text-danger-ink">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={pending || unchanged || Boolean(usernameError) || usernameChecking}
          aria-busy={pending}
          className="mt-1"
        >
          <ActionButtonLabel pending={pending} idle="Save username" busy="Saving…" />
        </Button>
        <Button type="button" variant="tertiary" disabled={pending} onClick={onClose}>
          Cancel
        </Button>
      </form>
    </AccountDialog>
  );
}
