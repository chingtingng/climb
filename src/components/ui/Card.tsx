import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <div
      className={cx("rounded-lg bg-surface p-3 shadow-soft", className)}
      {...props}
    >
      {children}
    </div>
  );
}
