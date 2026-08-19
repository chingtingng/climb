"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatStampDate } from "@/lib/dates";
import { gradeSortValue } from "@/lib/grades";
import { formatGymPlace, uniqueCountries } from "@/lib/gyms";
import type { GymGroup } from "@/lib/types";
import { CountryStamp } from "./CountryStamp";
import { GradeLabel } from "./GradePicker";
import { SearchIcon } from "./icons";
import { usePassport } from "./PassportContext";

type SortKey = "recent" | "grade" | "az" | "country";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently visited" },
  { value: "grade", label: "Highest grade" },
  { value: "az", label: "A–Z" },
  { value: "country", label: "Country" },
];

export function GymsView() {
  const { gyms, configured, openLog } = usePassport();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("All");
  const [sort, setSort] = useState<SortKey>("recent");
  const countries = uniqueCountries(gyms);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = gyms.filter((gym) => {
      const matchesQuery =
        !q ||
        `${gym.name} ${gym.city} ${gym.country} ${gym.outlets.join(" ")}`.toLowerCase().includes(q);
      const matchesCountry =
        country === "All" ||
        gym.country.trim().toLowerCase() === country.trim().toLowerCase();
      return matchesQuery && matchesCountry;
    });
    return [...list].sort((a, b) => compareGyms(a, b, sort));
  }, [gyms, query, country, sort]);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="passport-mark text-[2rem] leading-none text-pass-navy">
            Your gyms
          </h1>
          <p className="mt-1.5 text-sm text-pass-muted">
            Every place you’ve left some chalk.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openLog()}
          disabled={!configured}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-pass-primary text-lg font-semibold text-white"
          aria-label="Log a gym"
        >
          +
        </button>
      </header>

      <label className="relative block">
        <span className="sr-only">Search gyms, cities or countries</span>
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pass-muted">
          <SearchIcon />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search gyms, cities or countries"
          className="passport-field passport-field-icon"
        />
      </label>

      {countries.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["All", ...countries].map((item) => {
            const selected = item === country;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCountry(item)}
                className={`min-h-10 shrink-0 rounded-full px-3.5 text-sm font-semibold ${
                  selected
                    ? "bg-pass-primary text-white"
                    : "border border-pass-line bg-white text-pass-navy"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="relative z-20 flex items-center justify-between gap-3">
        <p className="text-sm text-pass-muted">
          {filtered.length} {filtered.length === 1 ? "gym" : "gyms"}
        </p>
        <SortMenu value={sort} onChange={setSort} />
      </div>

      {gyms.length === 0 ? (
        <div className="rounded-[1.4rem] bg-white px-5 py-10 text-center">
          <p className="passport-mark text-2xl">No gyms yet</p>
          <p className="mt-2 text-sm text-pass-muted">
            Log a gym and it’ll appear in your collection.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-[1.4rem] bg-white px-5 py-8 text-center text-sm text-pass-muted">
          No gyms match that search.
        </p>
      ) : (
        <ul className="relative z-0 space-y-2.5">
          {filtered.map((gym) => (
            <li key={gym.slug}>
              <Link
                href={`/passport/gyms/${gym.slug}`}
                className="flex min-h-16 items-center gap-3 rounded-[1.25rem] border border-white bg-white px-3 py-3 shadow-[0_8px_20px_rgba(52,126,168,0.08)]"
              >
                <CountryStamp country={gym.country} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold leading-tight">
                    {gym.name}
                  </span>
                  <span className="block truncate text-sm text-pass-muted">
                    {formatGymPlace(gym)}
                  </span>
                  <span className="mt-0.5 block text-xs text-pass-muted">
                    {gym.visitCount} {gym.visitCount === 1 ? "visit" : "visits"} ·{" "}
                    {formatStampDate(gym.lastVisited)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold">
                  <GradeLabel
                    system={gym.bestGradeSystem}
                    grade={gym.bestGrade}
                    vEquiv={gym.bestVEquiv}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SortMenu({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (next: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const [placeAbove, setPlaceAbove] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label = SORT_OPTIONS.find((item) => item.value === value)?.label ?? "Sort";

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPlaceAbove(spaceBelow < 220 && rect.top > spaceBelow);
    }
    setOpen((prev) => !prev);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={toggle}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-pass-line bg-white px-3 text-sm font-semibold text-pass-navy"
      >
        <span className="text-pass-muted">Sort</span>
        <span>{label}</span>
        <span className="text-pass-muted" aria-hidden>
          {placeAbove && open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <ul
          id={menuId}
          role="listbox"
          aria-label="Sort gyms"
          className={`absolute right-0 z-40 min-w-[12.5rem] rounded-2xl border border-pass-line bg-white py-1.5 shadow-[0_16px_40px_rgba(27,58,82,0.16)] ${
            placeAbove ? "bottom-[calc(100%+0.4rem)]" : "top-[calc(100%+0.4rem)]"
          }`}
        >
          {SORT_OPTIONS.map((item) => {
            const selected = item.value === value;
            return (
              <li key={item.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-semibold ${
                    selected
                      ? "bg-pass-soft text-pass-navy"
                      : "text-pass-navy hover:bg-pass-soft/70"
                  }`}
                >
                  {item.label}
                  {selected ? <span aria-hidden>✓</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function compareGyms(a: GymGroup, b: GymGroup, sort: SortKey) {
  if (sort === "az") return a.name.localeCompare(b.name);
  if (sort === "country") {
    const country = a.country.localeCompare(b.country);
    return country !== 0 ? country : a.name.localeCompare(b.name);
  }
  if (sort === "grade") {
    return (
      gradeSortValue(b.bestGradeSystem, b.bestGrade, b.bestVEquiv) -
      gradeSortValue(a.bestGradeSystem, a.bestGrade, a.bestVEquiv)
    );
  }
  return b.lastVisited.localeCompare(a.lastVisited);
}
