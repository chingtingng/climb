export function EmptyPassport({
  onLog,
  disabled,
}: {
  onLog: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-2 pb-6 pt-4 text-center">
      <PassportIllustration />
      <h2 className="passport-mark mt-5 text-[1.85rem] leading-tight text-pass-navy">
        Your passport is still blank.
      </h2>
      <p className="mt-2 max-w-[16.5rem] text-sm leading-relaxed text-pass-muted">
        Every climbing adventure starts with one gym.
      </p>
      <button
        type="button"
        onClick={onLog}
        disabled={disabled}
        className="passport-btn mt-6 max-w-[17rem]"
      >
        + Log your first visit
      </button>
    </div>
  );
}

function PassportIllustration() {
  return (
    <svg
      viewBox="0 0 220 148"
      className="h-32 w-auto text-pass-navy"
      role="img"
      aria-label="An open blank passport"
    >
      <rect
        x="18"
        y="18"
        width="184"
        height="112"
        rx="14"
        fill="#fff"
        stroke="currentColor"
        strokeOpacity="0.18"
      />
      <path d="M110 18v112" stroke="currentColor" strokeOpacity="0.12" />
      <rect x="34" y="36" width="60" height="76" rx="8" fill="#eef6fb" />
      <circle
        cx="158"
        cy="74"
        r="28"
        fill="none"
        stroke="#347ea8"
        strokeWidth="1.6"
        strokeDasharray="5 4"
      />
      <text
        x="158"
        y="70"
        textAnchor="middle"
        fill="#347ea8"
        fontSize="9"
        fontWeight="700"
        letterSpacing="1.4"
      >
        STAMP IT
      </text>
      <text
        x="158"
        y="84"
        textAnchor="middle"
        fill="#5a7588"
        fontSize="11"
      >
        ✦
      </text>
    </svg>
  );
}
