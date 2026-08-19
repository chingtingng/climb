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
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none">
      <path
        d="M5 7h14M10 7V5h4v2M8 7l.8 12h6.4L16 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
