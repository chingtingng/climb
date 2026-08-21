"use client";

import type { ChangeEvent } from "react";
import { SpinnerIcon } from "@/components/passport/icons";
import { Field } from "@/components/ui/Field";

export function UsernameField({
  value,
  onChange,
  disabled,
  error,
  checking,
  available,
  describedById = "username-availability",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error: string | null;
  checking: boolean;
  available: boolean;
  describedById?: string;
}) {
  const statusMessage = error
    ? error
    : checking
      ? "Checking if this username is available"
      : available
        ? "Username is available"
        : undefined;

  return (
    <label className={error ? "username-field-invalid" : undefined}>
      Username
      <span className="username-field">
        <Field
          name="username"
          type="text"
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            onChange(event.target.value);
          }}
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
          disabled={disabled}
          preventIosZoom
          aria-invalid={Boolean(error)}
          aria-busy={checking || undefined}
          aria-describedby={statusMessage ? describedById : undefined}
        />
        <span className="username-field-status" aria-hidden>
          {checking ? <SpinnerIcon className="size-5 shrink-0 animate-spin" /> : null}
          {available ? <UsernameAvailableMark /> : null}
        </span>
      </span>
      {statusMessage ? (
        <span
          id={describedById}
          className={
            error
              ? "text-xs font-medium text-danger-ink"
              : "sr-only"
          }
          role={error ? "alert" : "status"}
          aria-live="polite"
        >
          {statusMessage}
        </span>
      ) : null}
    </label>
  );
}

function UsernameAvailableMark() {
  return (
    <span className="username-available-mark">
      <svg viewBox="0 0 16 16" aria-hidden className="size-3" fill="none">
        <path
          d="M3.4 8.2 6.4 11.3 12.6 4.7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
