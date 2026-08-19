import { PlusIcon } from "./icons";

export function EmptyPassport({
  onLog,
  disabled,
}: {
  onLog: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="card-tint flex flex-col items-center px-5 pb-7 pt-8 text-center">
      <PassportIllustration />
      <h2 className="wordmark mt-6 text-[1.7rem] leading-tight text-ink">
        Your passport is still blank
      </h2>
      <p className="mt-2 max-w-[17rem] text-[0.88rem] leading-relaxed text-ink-soft">
        Every climbing adventure starts with one place. Add your first stamp and
        watch the pages fill up.
      </p>
      <button
        type="button"
        onClick={onLog}
        disabled={disabled}
        className="btn btn-primary mt-6 max-w-[17rem]"
      >
        <PlusIcon />
        Log your first visit
      </button>
    </div>
  );
}

function PassportIllustration() {
  return (
    <svg
      viewBox="0 0 220 150"
      className="h-32 w-auto"
      role="img"
      aria-label="An open blank passport with a stamp"
    >
      <rect
        x="16"
        y="20"
        width="188"
        height="112"
        rx="16"
        fill="#fff"
        stroke="var(--sky-300)"
        strokeWidth="1.6"
      />
      <path d="M110 24v104" stroke="var(--sky-200)" strokeWidth="1.4" strokeDasharray="4 5" />

      <rect x="32" y="38" width="62" height="76" rx="10" fill="var(--sky-100)" />
      <rect x="40" y="48" width="30" height="4" rx="2" fill="var(--sky-300)" />
      <rect x="40" y="58" width="44" height="4" rx="2" fill="var(--sky-200)" />
      <rect x="40" y="68" width="36" height="4" rx="2" fill="var(--sky-200)" />
      <circle cx="60" cy="94" r="12" fill="#fff" stroke="var(--sky-300)" strokeWidth="1.4" />
      <path
        d="m53.5 98 5-7 2.8 4 3-3.6 4.2 6.6h-15Z"
        fill="none"
        stroke="var(--sky-500)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      <g transform="rotate(-8 158 78)">
        <circle
          cx="158"
          cy="78"
          r="30"
          fill="#fff"
          stroke="var(--sky-400)"
          strokeWidth="1.6"
          strokeDasharray="5 5"
        />
        <circle cx="158" cy="78" r="24" fill="none" stroke="var(--sky-500)" strokeWidth="1.4" />
        <text
          x="158"
          y="74"
          textAnchor="middle"
          fill="var(--sky-700)"
          fontSize="8"
          fontWeight="700"
          letterSpacing="1.6"
        >
          STAMP IT
        </text>
        <text
          x="158"
          y="88"
          textAnchor="middle"
          fill="var(--sky-500)"
          fontSize="9"
          fontWeight="600"
          letterSpacing="1.2"
        >
          ✦ ✦ ✦
        </text>
      </g>
    </svg>
  );
}
