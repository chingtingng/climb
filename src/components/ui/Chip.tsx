import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

export function Chip({
  selected,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold",
        selected
          ? "bg-sky-100 text-sky-700"
          : "border border-sky-300 bg-surface text-ink",
        className,
      )}
      {...props}
    />
  );
}
