export function HomeIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6" fill="none">
      <path
        d="M4.5 10.8 12 4.5l7.5 6.3V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.1H9.7V20.5H5.5A1.5 1.5 0 0 1 4 19V10.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

export function GymsIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6" fill="none">
      <path
        d="M12 21s6.4-5.3 6.4-10.1A6.4 6.4 0 0 0 5.6 10.9C5.6 15.7 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
      <circle
        cx="12"
        cy="10.6"
        r="2.15"
        fill={filled ? "#fff" : "none"}
        stroke={filled ? "#fff" : "currentColor"}
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function ProfileIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6" fill="none">
      <circle
        cx="12"
        cy="9"
        r="3.1"
        stroke="currentColor"
        strokeWidth="1.7"
        fill={filled ? "currentColor" : "none"}
      />
      <path
        d="M6.2 18.4c.7-2.6 2.8-4 5.8-4s5.1 1.4 5.8 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none">
      <path
        d="M15 5 8 12l7 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none">
      <path
        d="M7 7l10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-5" fill="currentColor">
      <path d="M14 2H10C10 0.897 9.103 0 8 0C6.897 0 6 0.897 6 2H2C1.724 2 1.5 2.224 1.5 2.5C1.5 2.776 1.724 3 2 3H2.54L3.349 12.708C3.456 13.994 4.55 15 5.84 15H10.159C11.449 15 12.543 13.993 12.65 12.708L13.459 3H13.999C14.275 3 14.499 2.776 14.499 2.5C14.499 2.224 14.275 2 13.999 2H14ZM8 1C8.551 1 9 1.449 9 2H7C7 1.449 7.449 1 8 1ZM11.655 12.625C11.591 13.396 10.934 14 10.16 14H5.841C5.067 14 4.41 13.396 4.346 12.625L3.544 3H12.458L11.656 12.625H11.655ZM7 5.5V11.5C7 11.776 6.776 12 6.5 12C6.224 12 6 11.776 6 11.5V5.5C6 5.224 6.224 5 6.5 5C6.776 5 7 5.224 7 5.5ZM10 5.5V11.5C10 11.776 9.776 12 9.5 12C9.224 12 9 11.776 9 11.5V5.5C9 5.224 9.224 5 9.5 5C9.776 5 10 5.224 10 5.5Z" />
    </svg>
  );
}

export function MountainIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" aria-hidden className={className} fill="none">
      <path
        d="M8 28 20.5 10l6.2 8.5L32 12l8 16H8Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="m18.8 12.4 3.2-2.4 2.6 2.1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className ?? "size-4 shrink-0 animate-spin"}
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.4"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
