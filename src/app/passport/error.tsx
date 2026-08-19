"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Stamp } from "@/components/ui/Stamp";

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
    <div className="flex flex-col items-center pt-8 text-center">
      <Stamp variant="mark" size="lg" seed="error" label="!" ink="sky" />
      <h1 className="mark mt-5 text-3xl text-ink">Your passport couldn’t load.</h1>
      <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft">
        Something went wrong while opening your stamps. Please try again.
      </p>
      <Button type="button" onClick={() => recover()} className="mt-6 max-w-xs">
        Try again
      </Button>
    </div>
  );
}
