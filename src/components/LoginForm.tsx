"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  checkUsernameAvailableAction,
  createAccountAction,
  loginAction,
  type ActionResult,
} from "@/app/actions";
import { ActionButtonLabel } from "@/components/passport/ActionButtonLabel";

type Mode = "signin" | "signup";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  confirm:
    "That verification link is invalid or expired. Sign in if you already confirmed, or create the account again.",
};

const USERNAME_CHECK_DELAY_MS = 450;

export function LoginForm({
  configured,
  authError,
}: {
  configured: boolean;
  authError?: string | null;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    authError ? AUTH_ERROR_MESSAGES[authError] ?? "Could not complete sign-in." : null,
  );
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== "signup" || !configured) {
      setUsernameError(null);
      setUsernameChecking(false);
      return;
    }

    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setUsernameError(null);
      setUsernameChecking(false);
      return;
    }

    // Match Instagram-style: only hit the server once the value looks like a real username.
    if (trimmed.length < 3) {
      setUsernameChecking(false);
      setUsernameError("Username must be at least 3 characters");
      return;
    }
    if (trimmed.length > 30) {
      setUsernameChecking(false);
      setUsernameError("Username must be 30 characters or fewer");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setUsernameChecking(false);
      setUsernameError("Username can only contain letters, numbers, and underscores");
      return;
    }

    let cancelled = false;
    setUsernameChecking(true);
    setUsernameError(null);

    const timer = window.setTimeout(async () => {
      const result = await checkUsernameAvailableAction(trimmed);
      if (cancelled) return;

      setUsernameChecking(false);
      // Only treat a confirmed conflict as "in use". Setup/network failures fail open.
      if (result.available === false) {
        setUsernameError(result.error ?? "Username already in use.");
      } else {
        setUsernameError(null);
      }
    }, USERNAME_CHECK_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [username, mode, configured]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setVerifyMessage(null);

    if (mode === "signup" && usernameError) {
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.set("password", password);

    try {
      if (mode === "signin") {
        formData.set("identifier", identifier);
        const result: ActionResult = await loginAction(null, formData);
        if (result?.error) setError(result.error);
        return;
      }

      formData.set("username", username);
      formData.set("email", email);
      const result: ActionResult = await createAccountAction(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.needsVerification) {
        setVerifyMessage(
          `Check ${email.trim() || "your inbox"} for a verification link, then sign in.`,
        );
        setPassword("");
        setMode("signin");
        setIdentifier(email.trim() || username.trim());
      }
    } finally {
      setLoading(false);
    }
  }

  const signupBlocked = Boolean(usernameError) || usernameChecking;

  return (
    <div className="auth-card">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/50 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-[#9fd0ea]/35 blur-3xl"
      />

      <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-ink-soft">
        climbing log
      </p>
      <h1 className="brand-mark text-[2.6rem] leading-[0.92] text-ink">
        Chalk Passport
      </h1>
      <p className="auth-subtitle">
        Stamp the gyms you’ve sent — by country, city, and highest grade.
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        {mode === "signin" ? (
          <label>
            Username or email
            <input
              name="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="yourname or you@email.com"
              disabled={!configured || loading}
            />
          </label>
        ) : (
          <>
            <label>
              Username
              <input
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                disabled={!configured || loading}
                aria-invalid={Boolean(usernameError)}
                aria-describedby={usernameError ? "username-availability" : undefined}
              />
              {usernameError && (
                <span id="username-availability" className="auth-field-error" role="alert">
                  {usernameError}
                </span>
              )}
            </label>

            <label>
              Email
              <input
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="you@email.com"
                disabled={!configured || loading}
              />
            </label>
          </>
        )}

        <label>
          Password
          <input
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="••••••••"
            minLength={6}
            disabled={!configured || loading}
          />
        </label>

        {!configured && (
          <p className="rounded-2xl bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink-soft">
            Connect Supabase first — add env vars and run{" "}
            <code className="rounded bg-sky px-1.5 py-0.5 text-[0.8rem]">
              supabase/schema.sql
            </code>
            .
          </p>
        )}

        {verifyMessage && <p className="auth-success">{verifyMessage}</p>}
        {error && <p className="auth-error">{error}</p>}

        <button
          type="submit"
          className="auth-submit"
          disabled={loading || !configured || (mode === "signup" && signupBlocked)}
          aria-busy={loading}
        >
          <ActionButtonLabel
            pending={loading}
            idle={mode === "signin" ? "Sign in" : "Create account"}
            busy="Please wait…"
          />
        </button>
      </form>

      <button
        type="button"
        className="auth-toggle"
        disabled={loading}
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setVerifyMessage(null);
          setUsernameError(null);
        }}
      >
        {mode === "signin"
          ? "Don’t have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
