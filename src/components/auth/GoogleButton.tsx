"use client";

import { createClient } from "@/lib/supabase/client";
import { ActionButtonLabel } from "@/components/passport/ActionButtonLabel";
import { Button } from "@/components/ui/Button";

function mapGoogleError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("unsupported provider") || lower.includes("provider is not enabled")) {
    return "Google sign-in isn’t turned on for this project yet. Use email for now.";
  }
  if (lower.includes("popup") || lower.includes("cancelled") || lower.includes("denied")) {
    return "Google sign-in was cancelled. Try again, or use email.";
  }
  return message;
}

export function GoogleButton({
  disabled,
  onError,
}: {
  disabled?: boolean;
  onError: (message: string) => void;
}) {
  async function handleClick() {
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/welcome`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) onError(mapGoogleError(error.message));
    } catch {
      onError("Could not start Google sign-in.");
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={disabled}
      onClick={() => {
        void handleClick();
      }}
      className="btn-google"
    >
      <GoogleMark />
      <ActionButtonLabel pending={false} idle="Continue with Google" busy="Continue with Google" />
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.98-4.3 2.98-7.42Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.35l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.58A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.99A6.01 6.01 0 0 1 6.1 12c0-.69.12-1.36.31-1.99V7.43H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.57l3.34-2.58Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.89c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.95 2.87 14.7 2 12 2A10 10 0 0 0 3.07 7.43l3.34 2.58C7.2 7.65 9.4 5.89 12 5.89Z"
      />
    </svg>
  );
}
