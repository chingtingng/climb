import { countryMeta } from "@/lib/countries";
import { PlusIcon } from "./icons";

type Props = {
  country: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "size-11",
  md: "size-[4.5rem]",
  lg: "size-[5.5rem]",
};

const flagSize = {
  sm: "0.85rem",
  md: "1.2rem",
  lg: "1.5rem",
};

const codeClass = {
  sm: "mt-0.5 text-[0.48rem]",
  md: "mt-1 text-[0.54rem]",
  lg: "mt-1 text-[0.6rem]",
};

/** Slight, stable tilt per country so a row of stamps feels hand-pressed. */
function tiltFor(country: string): number {
  let hash = 0;
  for (const char of country) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return (hash % 9) - 4;
}

export function CountryStamp({ country, size = "md" }: Props) {
  const meta = countryMeta(country);

  return (
    <div
      className={`relative shrink-0 ${sizes[size]}`}
      style={{ rotate: `${tiltFor(country)}deg` }}
      title={meta.name}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full border border-dashed border-sky-400/80" />
      <div className="stamp-ring absolute inset-[3px] flex flex-col items-center justify-center gap-0.5 border border-sky-200 px-1.5 py-1">
        {meta.flag ? (
          <span className="leading-none" style={{ fontSize: flagSize[size] }}>
            {meta.flag}
          </span>
        ) : (
          <span className="text-sky-600" style={{ fontSize: flagSize[size] }}>
            ✦
          </span>
        )}
        <span
          className={`font-semibold leading-none tracking-[0.14em] text-ink ${codeClass[size]}`}
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
      aria-label="Log a visit"
      className="group relative size-[4.5rem] shrink-0 snap-start"
    >
      <span className="absolute inset-0 rounded-full border border-dashed border-sky-500/60 transition group-hover:border-sky-600" />
      <span className="absolute inset-[3px] flex flex-col items-center justify-center gap-0.5 rounded-full bg-white/70 text-sky-600 transition group-hover:bg-white">
        <PlusIcon className="size-5" />
        <span className="text-[0.5rem] font-semibold uppercase tracking-[0.12em]">
          Add
        </span>
      </span>
    </button>
  );
}
