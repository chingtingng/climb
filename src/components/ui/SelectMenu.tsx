"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cx } from "./cx";

export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className="field flex cursor-pointer items-center justify-between gap-2 pr-3 text-left font-semibold"
      >
        <span className="min-w-0 truncate">{value}</span>
        <ChevronIcon className={open ? "rotate-180" : undefined} />
      </button>
      {open ? (
        <ul
          id={menuId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-40 overflow-hidden rounded-xl border border-sky-300 bg-surface py-1 shadow-lifted"
        >
          {options.map((item) => {
            const selected = item === value;
            return (
              <li key={item} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  className={cx(
                    "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-semibold",
                    selected ? "bg-sky-100 text-ink" : "text-ink hover:bg-sky-50",
                  )}
                >
                  {item}
                  {selected ? <span aria-hidden>✓</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cx("size-4 shrink-0 text-ink-soft transition-transform duration-150", className)}
      fill="none"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
