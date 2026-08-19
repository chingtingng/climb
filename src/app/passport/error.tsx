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
    <div className="card-tint mt-6 px-5 py-10 text-center">
      <h1 className="wordmark text-2xl text-ink">Your passport couldn’t load</h1>
      <p className="mx-auto mt-2 max-w-[17rem] text-[0.88rem] leading-relaxed text-ink-soft">
        Something went wrong while opening your stamps. Please try again.
      </p>
      <button type="button" onClick={() => recover()} className="btn btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
