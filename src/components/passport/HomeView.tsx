"use client";

import Link from "next/link";
import { BrandStamp } from "@/components/BrandStamp";
import { formatClimbingType } from "@/lib/climbingTypes";
import { formatStampDate } from "@/lib/dates";
import type { GymVisit } from "@/lib/types";
import { formatVisitPlace, gymSlug } from "@/lib/gyms";
import { AddStampButton, CountryStamp } from "./CountryStamp";
import { EmptyPassport } from "./EmptyPassport";
import { GradeLabel } from "./GradePicker";
import { ChevronIcon, SparkleIcon } from "./icons";
import { usePassport } from "./PassportContext";

export function HomeView() {
  const { username, visits, stats, configured, loadError, openLog } =
    usePassport();
  const countries = uniqueRecentCountries(visits);
  const recent = visits.slice(0, 8);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Chalk Passport</p>
          <h1 className="page-title mt-1.5 truncate">Hey, {username}</h1>
          <p className="page-subtitle">Every wall you’ve climbed, in one place.</p>
        </div>
        <BrandStamp size={58} label={false} />
      </header>

      {loadError ? (
        <p role="alert" className="notice notice-error">
          {loadError}
        </p>
      ) : null}

      {!configured ? (
        <p className="notice notice-info">
          Supabase isn’t connected yet, so new stamps can’t be saved.
        </p>
      ) : null}

      {visits.length === 0 && !loadError ? (
        <EmptyPassport onLog={() => openLog()} disabled={!configured} />
      ) : (
        <>
          <section aria-label="Passport statistics" className="card px-2 py-4">
            <div className="grid grid-cols-4 divide-x divide-line-soft">
              <Stat value={stats.gyms} label="Places" />
              <Stat value={stats.cities} label="Cities" />
              <Stat value={stats.countries} label="Countries" />
              <Stat value={stats.bestSend ?? "—"} label="Best send" accent />
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="section-title">Your stamps</h2>
              <p className="text-[0.78rem] font-medium text-ink-faint">
                {countries.length} {countries.length === 1 ? "country" : "countries"}
              </p>
            </div>
            <div className="stamp-row mt-1">
              {countries.map((country) => (
                <div key={country} className="snap-start">
                  <CountryStamp country={country} />
                </div>
              ))}
              <AddStampButton onClick={() => configured && openLog()} />
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="section-title">Recent stamps</h2>
              <Link
                href="/passport/gyms"
                className="inline-flex items-center gap-0.5 text-[0.78rem] font-semibold text-sky-700"
              >
                All places
                <ChevronIcon />
              </Link>
            </div>
            <ul className="mt-2.5 space-y-2">
              {recent.map((visit) => (
                <li key={visit.id}>
                  <Link
                    href={`/passport/gyms/${gymSlug(visit.gym_name, visit.country)}`}
                    className="row-card"
                  >
                    <CountryStamp country={visit.country} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold leading-tight">
                        {visit.gym_name}
                      </span>
                      <span className="block truncate text-[0.82rem] text-ink-soft">
                        {formatVisitPlace(visit)} · {formatClimbingType(visit.climbing_type)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="pill-tag">
                        <GradeLabel
                          system={visit.grade_system}
                          grade={visit.highest_grade}
                          vEquiv={visit.v_equiv}
                        />
                      </span>
                      <span className="mt-1 block text-[0.7rem] text-ink-faint">
                        {formatStampDate(visit.visited_on)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 px-1 text-center">
      <p
        className={`wordmark truncate text-[1.6rem] leading-none ${
          accent ? "text-sky-700" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="mt-1.5 flex items-center justify-center gap-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        {accent ? <SparkleIcon className="size-2.5 text-sky-400" /> : null}
        {label}
      </p>
    </div>
  );
}

function uniqueRecentCountries(visits: GymVisit[]): string[] {
  const seen = new Set<string>();
  const countries: string[] = [];
  for (const visit of visits) {
    const key = visit.country.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    countries.push(visit.country);
  }
  return countries;
}
