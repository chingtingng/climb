"use client";

import { useState, type FormEvent } from "react";
import {
  createAccountAction,
  loginAction,
  type ActionResult,
} from "@/app/actions";
import { ActionButtonLabel } from "@/components/passport/ActionButtonLabel";

type Mode = "signin" | "signup";

export function LoginForm({ configured }: { configured: boolean }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("username", username);
    formData.set("password", password);

    try {
      const action = mode === "signin" ? loginAction : createAccountAction;
      const result: ActionResult = await action(null, formData);
      if (result?.error) setError(result.error);
    } finally {
      setLoading(false);
    }
  }

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
          />
        </label>

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

        {error && <p className="auth-error">{error}</p>}

        <button
          type="submit"
          className="auth-submit"
          disabled={loading || !configured}
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
        }}
      >
        {mode === "signin"
          ? "Don’t have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
