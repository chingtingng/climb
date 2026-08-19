"use client";

import { useEffect } from "react";

export default function PassportError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const recover = retry ?? reset ?? (() => window.location.reload());

  return (
    <div className="pt-8 text-center">
      <h1 className="passport-mark text-3xl text-pass-navy">
        Your passport couldn’t load.
      </h1>
      <p className="mx-auto mt-2 max-w-[16rem] text-sm text-pass-muted">
        Something went wrong while opening your stamps. Please try again.
      </p>
      <button type="button" onClick={() => recover()} className="passport-btn mt-6">
        Try again
      </button>
    </div>
  );
}
