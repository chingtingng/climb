"use client";

import { useActionState } from "react";
import { loginAction, type ActionResult } from "@/app/actions";

const initial: ActionResult | null = null;

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);

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
          defaultValue="chalkchingup"
          placeholder="chalkchingup"
          className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 text-base text-ink shadow-[0_10px_30px_rgba(107,179,217,0.12)] outline-none backdrop-blur placeholder:text-ink-soft/50 focus:border-baby-deep focus:ring-4 focus:ring-baby/35"
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
        {pending ? "Opening passport…" : "Enter passport"}
      </button>
    </form>
  );
}
