import { forwardRef } from "react";
import { CloseIcon } from "./icons";
import { cx } from "@/components/ui/cx";

/** Same circular dismiss control as Edit stamp. */
export const SheetCloseButton = forwardRef<
  HTMLButtonElement,
  { onClick: () => void; className?: string }
>(function SheetCloseButton({ onClick, className }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-sky-50",
        className,
      )}
      aria-label="Close"
    >
      <CloseIcon className="size-4" />
    </button>
  );
});
