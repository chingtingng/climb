"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "./cx";

type MenuCoords = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled,
  className,
  id,
  placeholder,
  labels,
  fullWidth = true,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
  labels?: Partial<Record<T, string>>;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  function labelFor(item: T) {
    return labels?.[item] ?? (item === "" ? (placeholder ?? "Skip") : item);
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function update() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const maxHeight = Math.min(window.innerHeight * 0.45, 256);
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const openUp = spaceBelow < Math.min(maxHeight, 120) && rect.top > spaceBelow;
      setCoords({
        left: rect.left,
        width: Math.max(rect.width, 112),
        maxHeight,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
      });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent | PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const menu =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={menuRef}
            id={menuId}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
            }}
            className="soft-scroll fixed z-[80] overflow-y-auto rounded-xl border border-sky-300 bg-surface py-1 shadow-lifted"
          >
            {options.map((item) => {
              const selected = item === value;
              return (
                <li key={item || "empty"} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                    className={cx(
                      "flex min-h-9 w-full items-center justify-between gap-3 px-3.5 py-1.5 text-left text-sm font-semibold",
                      selected ? "bg-sky-100 text-ink" : "text-ink hover:bg-sky-50",
                    )}
                  >
                    {labelFor(item)}
                    {selected ? <span aria-hidden>✓</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cx("relative", fullWidth ? "w-full" : "w-auto")}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className={cx(
          "field flex cursor-pointer items-center justify-between gap-2 pr-2.5 text-left font-semibold",
          !fullWidth && "!w-auto min-w-[6.25rem]",
          className,
        )}
      >
        <span className="min-w-0 truncate">{labelFor(value)}</span>
        <ChevronIcon className={open ? "rotate-180" : undefined} />
      </button>
      {menu}
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
