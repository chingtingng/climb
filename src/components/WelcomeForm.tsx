"use client";

import { useState, type FormEvent } from "react";
import { completeUsernameAction, type ActionResult } from "@/app/actions";
import { useUsernameCheck } from "@/components/auth/useUsernameCheck";
import { ActionButtonLabel } from "@/components/passport/ActionButtonLabel";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";

export function WelcomeForm({ suggested }: { suggested: string }) {
  const [username, setUsername] = useState(suggested);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { usernameError, usernameChecking } = useUsernameCheck(username, true);
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
      <label>
        Username
        <Field
          name="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="yourname"
          minLength={3}
          maxLength={30}
          pattern="[A-Za-z0-9_]+"
          title="Letters, numbers, and underscores only"
          disabled={loading}
          preventIosZoom
          aria-invalid={Boolean(usernameError)}
          aria-describedby={usernameError ? "welcome-username" : undefined}
        />
        {usernameError ? (
          <span id="welcome-username" className="text-xs font-medium text-danger-ink" role="alert">
            {usernameError}
          </span>
        ) : (
          <span className="text-xs font-medium text-ink-soft">
            This is how you appear in your passport. You can use letters, numbers, and
            underscores.
          </span>
        )}
      </label>

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
