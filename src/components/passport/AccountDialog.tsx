"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/components/ui/cx";

export function AccountDialog({
  open,
  pending,
  onClose,
  titleId,
  descriptionId,
  title,
  description,
  titleClassName,
  wide,
  children,
}: {
  open: boolean;
  pending?: boolean;
  onClose: () => void;
  titleId: string;
  descriptionId?: string;
  title: string;
  description?: ReactNode;
  titleClassName?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (!pending) onClose();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, pending, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-5">
      <button
        type="button"
        className="absolute inset-0 bg-ink/35"
        aria-label="Cancel"
        onClick={() => !pending && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`passport-sheet-in relative flex max-h-[calc(100dvh-2.5rem)] w-full flex-col overflow-hidden rounded-xl bg-surface p-5 shadow-sheet ${
          wide ? "max-w-md" : "max-w-sm"
        }`}
      >
        <h2
          id={titleId}
          className={cx("shrink-0 mark text-center text-ink", titleClassName ?? "text-2xl")}
        >
          {title}
        </h2>
        {description ? (
          <p
            id={descriptionId}
            className="mt-2 shrink-0 text-center text-sm leading-relaxed text-ink-soft"
          >
            {description}
          </p>
        ) : null}
        <div className="hide-scroll min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
