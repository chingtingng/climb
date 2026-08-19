"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatStampDate } from "@/lib/dates";
import { gradeSortValue } from "@/lib/grades";
import { formatGymPlace, uniqueCountries } from "@/lib/gyms";
import { formatPlaceKind } from "@/lib/placeKinds";
import type { GymGroup } from "@/lib/types";
import { CountryStamp } from "./CountryStamp";
import { GradeLabel } from "./GradePicker";
import { PlusIcon, SearchIcon } from "./icons";
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
    list.sort((a, b) => compareGyms(a, b, sort));
    return list;
  }, [gyms, query, country, sort]);

  return (
    <div className="space-y-4">
      <header>
        <p className="eyebrow">Collection</p>
        <h1 className="page-title mt-1.5">Your places</h1>
        <p className="page-subtitle">Every place you’ve left some chalk.</p>
      </header>

      <label className="relative block">
        <span className="sr-only">Search places, cities or countries</span>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
          <SearchIcon />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search places, cities or countries"
          className="passport-field passport-field-icon"
        />
      </label>

      {countries.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["All", ...countries].map((item) => {
            const selected = item === country;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCountry(item)}
                className={`chip ${selected ? "chip-selected" : ""}`}
              >
                {item}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="relative z-20 flex items-center justify-between gap-3">
        <p className="text-[0.82rem] font-medium text-ink-soft">
          {filtered.length} {filtered.length === 1 ? "place" : "places"}
        </p>
        <SortMenu value={sort} onChange={setSort} />
      </div>

      {gyms.length === 0 ? (
        <div className="card-tint px-5 py-10 text-center">
          <p className="wordmark text-2xl text-ink">No places yet</p>
          <p className="mx-auto mt-2 max-w-[17rem] text-[0.88rem] leading-relaxed text-ink-soft">
            Log a visit and it’ll appear here, sorted however you like.
          </p>
          <button
            type="button"
            onClick={() => openLog()}
            disabled={!configured}
            className="btn btn-primary mx-auto mt-5 max-w-[15rem]"
          >
            <PlusIcon />
            Log a visit
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="card px-5 py-8 text-center text-[0.88rem] text-ink-soft">
          No places match that search.
        </p>
      ) : (
        <ul className="relative z-0 space-y-2">
          {filtered.map((gym) => (
            <li key={gym.slug}>
              <Link href={`/passport/gyms/${gym.slug}`} className="row-card">
                <CountryStamp country={gym.country} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold leading-tight">
                    {gym.name}
                  </span>
                  <span className="block truncate text-[0.82rem] text-ink-soft">
                    {formatPlaceKind(gym.place_kind)} · {formatGymPlace(gym)}
                  </span>
                  <span className="mt-0.5 block text-[0.72rem] text-ink-faint">
                    {gym.visitCount} {gym.visitCount === 1 ? "visit" : "visits"} ·{" "}
                    {formatStampDate(gym.lastVisited)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="pill-tag">
                    <GradeLabel
                      system={gym.bestGradeSystem}
                      grade={gym.bestGrade}
                      vEquiv={gym.bestVEquiv}
                    />
                  </span>
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
        className="chip"
      >
        <span className="text-ink-faint">Sort</span>
        <span>{label}</span>
        <span className="text-ink-faint" aria-hidden>
          {placeAbove && open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <ul
          id={menuId}
          role="listbox"
          aria-label="Sort places"
          className={`card absolute right-0 z-40 min-w-[12.5rem] overflow-hidden py-1.5 ${
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
                  className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                    selected
                      ? "bg-sky-100 text-sky-700"
                      : "text-ink hover:bg-sky-50"
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
