"use client";

import { useEffect, useState } from "react";
import { checkUsernameAvailableAction } from "@/app/actions";

const CHECK_DELAY_MS = 450;

function localUsernameError(username: string, enabled: boolean): string | null {
  if (!enabled) return null;
  const trimmed = username.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.length < 3) return "Username must be at least 3 characters";
  if (trimmed.length > 30) return "Username must be 30 characters or fewer";
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    return "Username can only contain letters, numbers, and underscores";
  }
  return null;
}

export function useUsernameCheck(username: string, enabled: boolean) {
  const trimmed = username.trim().toLowerCase();
  const localError = localUsernameError(username, enabled);
  const canCheckRemote = enabled && !localError && Boolean(trimmed);
  const [remote, setRemote] = useState<{
    username: string;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!canCheckRemote) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await checkUsernameAvailableAction(trimmed);
      if (cancelled) return;
      setRemote({
        username: trimmed,
        error:
          result.available === false
            ? (result.error ?? "Username already in use.")
            : null,
      });
    }, CHECK_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed, canCheckRemote]);

  const usernameError =
    localError ?? (remote?.username === trimmed ? remote.error : null);
  const usernameChecking = canCheckRemote && remote?.username !== trimmed;

  return { usernameError, usernameChecking };
}
