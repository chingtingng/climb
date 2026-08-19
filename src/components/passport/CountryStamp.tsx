import { countryMeta } from "@/lib/countries";

type Props = {
  country: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "size-11",
  md: "size-[4.35rem]",
  lg: "size-[5.5rem]",
};

const flagSize = {
  sm: "0.82rem",
  md: "1.15rem",
  lg: "1.45rem",
};

const codeClass = {
  sm: "mt-0.5 text-[0.48rem]",
  md: "mt-1 text-[0.52rem]",
  lg: "mt-1 text-[0.58rem]",
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
      <div className="absolute inset-[3px] flex flex-col items-center justify-center gap-0.5 rounded-full border border-pass-line bg-white px-1.5 py-1 shadow-[0_4px_12px_rgba(27,58,82,0.06)]">
        {meta.flag ? (
          <span className="leading-none" style={{ fontSize: flagSize[size] }}>
            {meta.flag}
          </span>
        ) : (
          <span className="text-pass-primary" style={{ fontSize: flagSize[size] }}>
            ✦
          </span>
        )}
        <span
          className={`font-semibold leading-none tracking-[0.14em] text-pass-navy ${codeClass[size]}`}
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
