/**
 * The Chalk Passport mark: a passport stamp with the brand set around the ring.
 * Used on the sign-in hero and as the profile avatar.
 */
export function BrandStamp({
  size = 108,
  className,
  label = true,
}: {
  size?: number;
  className?: string;
  label?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full stamp-ring ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 120 120" width={size} height={size} fill="none">
        <defs>
          <path id="brand-stamp-arc" d="M17 60a43 43 0 0 1 86 0" />
        </defs>

        <circle
          cx="60"
          cy="60"
          r="55"
          stroke="var(--sky-400)"
          strokeWidth="1.6"
          strokeDasharray="4 5"
        />
        <circle cx="60" cy="60" r="48" stroke="var(--sky-600)" strokeWidth="1.6" />

        {label ? (
          <>
            <text
              textAnchor="middle"
              fill="var(--sky-700)"
              fontSize="10"
              fontWeight="700"
              letterSpacing="2.4"
            >
              <textPath href="#brand-stamp-arc" startOffset="50%">
                CHALK PASSPORT
              </textPath>
            </text>
            <text
              x="60"
              y="94"
              textAnchor="middle"
              fill="var(--sky-500)"
              fontSize="9"
              letterSpacing="3"
            >
              ✦ ✦ ✦
            </text>
          </>
        ) : null}

        <g stroke="var(--sky-700)" strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round">
          <path d="M38 74l15-22 7.5 11 8-10L82 74H38Z" />
          <path d="m49.2 57 4-3 3.4 2.6" />
        </g>
        <circle cx="77" cy="46" r="2.8" fill="var(--sky-400)" />
      </svg>
    </span>
  );
}
