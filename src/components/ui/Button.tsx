import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "tertiary" | "destructive";

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <button
      className={cx(
        "btn",
        variant === "primary" && "btn-primary",
        variant === "secondary" && "btn-secondary",
        variant === "tertiary" && "btn-tertiary",
        variant === "destructive" && "btn-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
