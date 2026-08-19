"use client";

import { useMemo, useState } from "react";
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

      <label className="flex min-h-12 items-center gap-3 rounded-full border border-pass-line bg-white px-3.5 text-pass-navy focus-within:border-pass-primary focus-within:shadow-[0_0_0_3px_rgba(52,126,168,0.18)]">
        <span className="shrink-0 text-pass-muted" aria-hidden>
          <SearchIcon />
        </span>
        <span className="sr-only">Search gyms, cities or countries</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search gyms, cities or countries"
          className="min-h-12 w-full min-w-0 flex-1 border-0 bg-transparent py-3 text-[16px] text-pass-navy outline-none"
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

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-pass-muted">
          {filtered.length} {filtered.length === 1 ? "gym" : "gyms"}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-pass-muted">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="min-h-10 rounded-full border border-pass-line bg-white px-2.5 text-sm font-semibold"
          >
            <option value="recent">Recently visited</option>
            <option value="grade">Highest grade</option>
            <option value="az">A–Z</option>
            <option value="country">Country</option>
          </select>
        </label>
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
        <ul className="space-y-2.5">
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

function compareGyms(a: GymGroup, b: GymGroup, sort: SortKey) {
  if (sort === "az") return a.name.localeCompare(b.name);
  if (sort === "country") {
    const country = a.country.localeCompare(b.country);
    return country !== 0 ? country : a.name.localeCompare(b.name);
  }
  if (sort === "grade") {
    return (
      gradeSortValue(b.bestGradeSystem, b.bestGrade) -
      gradeSortValue(a.bestGradeSystem, a.bestGrade)
    );
  }
  return b.lastVisited.localeCompare(a.lastVisited);
}
