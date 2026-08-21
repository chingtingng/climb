import { forwardRef } from "react";
import { CloseIcon } from "./icons";

/**
 * Sheet dismiss control. The sky fill sits on a square span, not the
 * <button>, so iOS UA padding cannot stretch the background into an oval.
 */
export const SheetCloseButton = forwardRef<
  HTMLButtonElement,
  { onClick: () => void }
>(function SheetCloseButton({ onClick }, ref) {
  return (
    <div className="flex size-11 shrink-0 items-center justify-center">
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-label="Close"
        className="relative flex size-11 shrink-0 items-center justify-center appearance-none bg-transparent p-0"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-100"
        />
        <CloseIcon className="relative text-ink-soft" />
      </button>
    </div>
  );
});
