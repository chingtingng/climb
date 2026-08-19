import type { ReactNode } from "react";
import { Button } from "./Button";
import { Stamp, type StampInk } from "./Stamp";

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  disabled,
  ink = "sky",
  seed = "empty",
  label = "✦",
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  ink?: StampInk;
  seed?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center px-2 pb-6 pt-4 text-center">
      <Stamp variant="mark" size="lg" ink={ink} seed={seed} label={label} />
      <h2 className="mark mt-5 text-2xl leading-tight text-ink">{title}</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">{body}</p>
      {actionLabel && onAction ? (
        <Button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className="mt-6 max-w-xs"
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function Banner({
  tone = "muted",
  children,
  role,
}: {
  tone?: "muted" | "danger" | "success";
  children: ReactNode;
  role?: "alert";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-danger-fill text-danger-ink"
      : tone === "success"
        ? "bg-success-fill text-success-ink"
        : "bg-surface text-ink-soft";
  return (
    <p role={role} className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${toneClass}`}>
      {children}
    </p>
  );
}
