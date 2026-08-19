import { countryMeta } from "@/lib/countries";

type Props = {
  country: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "size-11 text-[0.95rem]",
  md: "size-[4.35rem] text-xl",
  lg: "size-[5.5rem] text-2xl",
};

export function CountryStamp({ country, size = "md" }: Props) {
  const meta = countryMeta(country);

  return (
    <div
      className={`relative shrink-0 ${sizes[size]}`}
      title={meta.name}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full border border-dashed border-pass-line" />
      <div className="absolute inset-[3px] flex flex-col items-center justify-center rounded-full border border-pass-line bg-white shadow-[0_4px_12px_rgba(27,58,82,0.06)]">
        {meta.flag ? (
          <span className="leading-none" style={{ fontSize: size === "sm" ? "1rem" : undefined }}>
            {meta.flag}
          </span>
        ) : (
          <span className="text-pass-primary">✦</span>
        )}
        <span
          className={`mt-0.5 font-semibold tracking-[0.14em] text-pass-navy ${
            size === "sm" ? "text-[0.55rem]" : "text-[0.62rem]"
          }`}
        >
          {meta.code}
        </span>
      </div>
    </div>
  );
}

export function AddStampButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Log a gym"
      className="relative size-[4.35rem] shrink-0 snap-start"
    >
      <span className="absolute inset-0 rounded-full border border-dashed border-pass-primary/50" />
      <span className="absolute inset-[3px] flex items-center justify-center rounded-full bg-white/70 text-2xl leading-none text-pass-primary">
        +
      </span>
    </button>
  );
}
