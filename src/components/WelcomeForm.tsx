"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { completeUsernameAction, type ActionResult } from "@/app/actions";
import { UsernameField } from "@/components/auth/UsernameField";
import { useUsernameCheck } from "@/components/auth/useUsernameCheck";
import { ActionButtonLabel } from "@/components/passport/ActionButtonLabel";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/EmptyState";

export function WelcomeForm({ suggested }: { suggested: string }) {
  const [username, setUsername] = useState(suggested);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { usernameError, usernameChecking, usernameAvailable } = useUsernameCheck(
    username,
    true,
  );
  const blocked = Boolean(usernameError) || usernameChecking || !username.trim();
  const busy = loading || isPending;

  function handleAction(formData: FormData) {
    if (usernameError) return;
    setError(null);
    setLoading(true);

    startTransition(async () => {
      try {
        const result: ActionResult = await completeUsernameAction(null, formData);
        if (result?.error) {
          setError(result.error);
          setLoading(false);
        }
      } catch (error) {
        unstable_rethrow(error);
        setError(error instanceof Error ? error.message : "Could not save username.");
        setLoading(false);
      }
    });
  }

  return (
    <form action={handleAction} className="auth-form">
      <UsernameField
        value={username}
        onChange={setUsername}
        disabled={busy}
        error={usernameError}
        checking={usernameChecking}
        available={usernameAvailable}
        describedById="welcome-username"
      />

      {error ? (
        <Banner tone="danger" role="alert">
          {error}
        </Banner>
      ) : null}

      <Button type="submit" disabled={busy || blocked} aria-busy={busy}>
        <ActionButtonLabel pending={busy} idle="Continue" busy="Please wait…" />
      </Button>
    </form>
  );
}
