"use client";

import { useActionState, useState } from "react";
import {
  createAccountAction,
  loginAction,
  type ActionResult,
} from "@/app/actions";

const initial: ActionResult | null = null;

type Mode = "create" | "signin";

export function LoginForm({ configured }: { configured: boolean }) {
  const [mode, setMode] = useState<Mode>("create");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white/70 p-1 shadow-[0_8px_24px_rgba(107,179,217,0.1)]">
        <ModeButton
          active={mode === "create"}
          onClick={() => setMode("create")}
          label="Create account"
        />
        <ModeButton
          active={mode === "signin"}
          onClick={() => setMode("signin")}
          label="Sign in"
        />
      </div>

      <AuthForm key={mode} mode={mode} configured={configured} />
    </div>
  );
}

function AuthForm({
  mode,
  configured,
}: {
  mode: Mode;
  configured: boolean;
}) {
  const action = mode === "create" ? createAccountAction : loginAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-ink">
          Username
        </span>
        <input
          name="username"
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          placeholder="pick a username"
          className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 text-base text-ink shadow-[0_10px_30px_rgba(107,179,217,0.12)] outline-none backdrop-blur placeholder:text-ink-soft/50 focus:border-baby-deep focus:ring-4 focus:ring-baby/35"
        />
        <span className="mt-2 block text-xs leading-relaxed text-ink-soft">
          {mode === "create"
            ? "Choose a username to create your passport. No password needed."
            : "Sign in with a username you’ve already created."}
        </span>
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

      {state?.error && (
        <p className="rounded-2xl bg-[#ffe8e8] px-4 py-3 text-sm text-[#8a2f2f]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !configured}
        className="w-full rounded-2xl bg-ink px-4 py-3.5 text-base font-semibold text-white transition enabled:hover:bg-[#163040] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? mode === "create"
            ? "Creating…"
            : "Signing in…"
          : mode === "create"
            ? "Create account"
            : "Sign in"}
      </button>
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-ink text-white shadow-sm"
          : "bg-transparent text-ink-soft"
      }`}
    >
      {label}
    </button>
  );
}
