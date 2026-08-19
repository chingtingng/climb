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
          <path id="brand-stamp-top" d="M18 60a42 42 0 0 1 84 0" />
          <path id="brand-stamp-bottom" d="M22 60a38 38 0 0 0 76 0" />
        </defs>

        <circle
          cx="60"
          cy="60"
          r="55"
          stroke="var(--sky-400)"
          strokeWidth="1.6"
          strokeDasharray="4 5"
        />
        <circle cx="60" cy="60" r="47.5" stroke="var(--sky-600)" strokeWidth="1.8" />

        {label ? (
          <g fill="var(--sky-700)" fontSize="8.6" fontWeight="700" letterSpacing="2.1">
            <text textAnchor="middle">
              <textPath href="#brand-stamp-top" startOffset="50%">
                CHALK PASSPORT
              </textPath>
            </text>
            <text textAnchor="middle" fontSize="6.8" letterSpacing="1.8" fill="var(--sky-600)">
              <textPath href="#brand-stamp-bottom" startOffset="50%">
                CLIMB · LOG · COLLECT
              </textPath>
            </text>
          </g>
        ) : null}

        <g stroke="var(--sky-700)" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
          <path d="M38 72l14.5-21 7.5 10.5 8-9.5L82 72H38Z" />
          <path d="m48.6 55.5 4-3 3.4 2.6" />
        </g>
        <circle cx="76" cy="45" r="2.6" fill="var(--sky-400)" />
      </svg>
    </span>
  );
}
