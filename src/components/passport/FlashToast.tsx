"use client";

import { useEffect, useState } from "react";

type Props = {
  message: string | null;
  /** How long the toast stays visible. */
  durationMs?: number;
};

/**
 * Viewport-fixed alert so mobile users see failures even when the sheet
 * content is scrolled away from the inline error.
 */
export function FlashToast({ message, durationMs = 5000 }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!message) {
      setActive(null);
      setLeaving(false);
      return;
    }

    setActive(message);
    setLeaving(false);

    const hideAt = window.setTimeout(() => setLeaving(true), durationMs);
    const clearAt = window.setTimeout(() => {
      setActive(null);
      setLeaving(false);
    }, durationMs + 220);

    return () => {
      window.clearTimeout(hideAt);
      window.clearTimeout(clearAt);
    };
  }, [message, durationMs]);

  if (!active) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] flex justify-center px-3 desktop:left-[var(--rail-width)] ${
        leaving ? "toast-out" : "toast-in"
      }`}
    >
      <p className="pointer-events-auto max-w-[min(24rem,calc(100vw-1.5rem))] rounded-lg bg-danger-ink px-4 py-3 text-sm font-medium leading-snug text-surface shadow-lifted">
        {active}
      </p>
    </div>
  );
}
