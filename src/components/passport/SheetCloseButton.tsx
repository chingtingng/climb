import { forwardRef } from "react";
import { CloseIcon } from "./icons";

/** Same circular dismiss control as Edit stamp. */
export const SheetCloseButton = forwardRef<
  HTMLButtonElement,
  { onClick: () => void }
>(function SheetCloseButton({ onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-ink-soft"
      aria-label="Close"
    >
      <CloseIcon />
    </button>
  );
});
