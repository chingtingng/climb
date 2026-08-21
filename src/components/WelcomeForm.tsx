"use client";

import { useState, type FormEvent } from "react";
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
  const { usernameError, usernameChecking, usernameAvailable } = useUsernameCheck(
    username,
    true,
  );
  const blocked = Boolean(usernameError) || usernameChecking || !username.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (usernameError) return;
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("username", username);

    try {
      const result: ActionResult = await completeUsernameAction(null, formData);
      if (result?.error) setError(result.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <UsernameField
        value={username}
        onChange={setUsername}
        disabled={loading}
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

      <Button type="submit" disabled={loading || blocked} aria-busy={loading}>
        <ActionButtonLabel pending={loading} idle="Continue" busy="Please wait…" />
      </Button>
    </form>
  );
}
