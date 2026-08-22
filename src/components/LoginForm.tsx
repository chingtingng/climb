"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createAccountAction,
  loginAction,
  type ActionResult,
} from "@/app/actions";
import { UsernameField } from "@/components/auth/UsernameField";
import { useUsernameCheck } from "@/components/auth/useUsernameCheck";
import { ActionButtonLabel } from "@/components/passport/ActionButtonLabel";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Stamp } from "@/components/ui/Stamp";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

type Mode = "signin" | "signup";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  confirm:
    "That verification link is invalid or expired. Sign in if you already confirmed, or create the account again.",
};

export function LoginForm({
  configured,
  authError,
  deleted,
}: {
  configured: boolean;
  authError?: string | null;
  deleted?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    authError ? AUTH_ERROR_MESSAGES[authError] ?? "Could not complete sign-in." : null,
  );
  const [verifyMessage, setVerifyMessage] = useState<string | null>(
    deleted ? "Your account and stamps have been deleted." : null,
  );
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { usernameError, usernameChecking, usernameAvailable } = useUsernameCheck(
    username,
    mode === "signup" && configured,
  );
  const busy = loading || isPending;

  function handleAction(formData: FormData) {
    if (mode === "signup" && usernameError) return;

    setError(null);
    setVerifyMessage(null);
    setLoading(true);

    startTransition(async () => {
      try {
        if (mode === "signin") {
          const result: ActionResult = await loginAction(null, formData);
          if (result?.error) {
            setError(result.error);
            setLoading(false);
          }
          return;
        }

        const result: ActionResult = await createAccountAction(null, formData);
        if (result?.error) {
          setError(result.error);
          setLoading(false);
          return;
        }
        if (result?.needsVerification) {
          setVerifyMessage(
            `Check ${email.trim() || "your inbox"} for a verification link, then sign in.`,
          );
          setPassword("");
          setMode("signin");
          setIdentifier(email.trim() || username.trim());
          setLoading(false);
        }
      } catch (error) {
        unstable_rethrow(error);
        setError(error instanceof Error ? error.message : "Could not complete sign-in.");
        setLoading(false);
      }
    });
  }

  const signupBlocked = Boolean(usernameError) || usernameChecking;

  return (
    <div className="auth-card">
      <div className="auth-card-glows" aria-hidden>
        <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-surface/50 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-sky-500/30 blur-3xl" />
      </div>
      <div className="auth-layout">
      <div className="auth-brand">
      <div aria-hidden className="auth-stamps">
        <Stamp variant="grade" size="sm" seed="login-v17" label="V17" />
        <Stamp variant="country" size="sm" country="Singapore" seed="SG" />
      </div>

      <p className="label-micro">climbing log</p>
      <h1 className="mark auth-title">Chalk Passport</h1>
      <p className="auth-subtitle">
        Stamp the places you’ve sent — by country, city, and highest grade.
      </p>
      </div>

      <div className="auth-panel">
      <form action={handleAction} className="auth-form">
        {mode === "signin" ? (
          <label>
            Username or email
            <Field
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
              disabled={!configured || busy}
              preventIosZoom
            />
          </label>
        ) : (
          <>
            <UsernameField
              value={username}
              onChange={setUsername}
              disabled={!configured || busy}
              error={usernameError}
              checking={usernameChecking}
              available={usernameAvailable}
            />

            <label>
              Email
              <Field
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
                disabled={!configured || busy}
                preventIosZoom
              />
            </label>
          </>
        )}

        <label>
          Password
          <Field
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="••••••••"
            minLength={mode === "signup" ? MIN_PASSWORD_LENGTH : undefined}
            disabled={!configured || busy}
            preventIosZoom
          />
        </label>

        {!configured && (
          <Banner>
            Connect Supabase first — add env vars and run{" "}
            <code className="rounded-xs bg-sky-100 px-1.5 py-0.5 text-sm">
              supabase/schema.sql
            </code>
            .
          </Banner>
        )}

        {verifyMessage && <Banner tone="success">{verifyMessage}</Banner>}
        {error && (
          <Banner tone="danger" role="alert">
            {error}
          </Banner>
        )}

        <Button
          type="submit"
          disabled={busy || !configured || (mode === "signup" && signupBlocked)}
          aria-busy={busy}
        >
          <ActionButtonLabel
            pending={busy}
            idle={mode === "signin" ? "Sign in" : "Sign up"}
            busy="Please wait…"
          />
        </Button>

        {mode === "signup" ? (
          <p className="auth-legal">
            By signing up, you agree to the{" "}
            <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        ) : null}
      </form>

      <Button
        type="button"
        variant="tertiary"
        disabled={busy}
        className="auth-switch"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setVerifyMessage(null);
        }}
      >
        {mode === "signin" ? (
          <>
            Don’t have an account?{" "}
            <span className="auth-switch-action">Sign up</span>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <span className="auth-switch-action">Sign in</span>
          </>
        )}
      </Button>
      </div>
      </div>
    </div>
  );
}
