import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export function ChoiceTile({
  selected,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        "rounded-md px-4 py-3.5 text-left transition",
        selected
          ? "border border-sky-600 bg-sky-100 text-ink"
          : "border border-sky-300 bg-surface text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
