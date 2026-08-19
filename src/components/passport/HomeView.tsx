"use client";

import Link from "next/link";
import { formatStampDate } from "@/lib/dates";
import type { GymVisit } from "@/lib/types";
import { formatVisitPlace, gymSlug } from "@/lib/gyms";
import { AddStampButton, CountryStamp } from "./CountryStamp";
import { EmptyPassport } from "./EmptyPassport";
import { GradeLabel } from "./GradePicker";
import { usePassport } from "./PassportContext";

export function HomeView() {
  const { username, visits, stats, configured, loadError, openLog } =
    usePassport();
  const countries = uniqueRecentCountries(visits);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-pass-muted">
          @{username}
        </p>
        <h1 className="passport-mark mt-1 text-[2rem] leading-none text-pass-navy">
          Chalk Passport
        </h1>
        <p className="mt-1.5 text-sm text-pass-muted">
          Every wall you’ve climbed, in one place.
        </p>
      </header>

      {loadError ? (
        <p role="alert" className="rounded-2xl bg-[#ffe8e8] px-4 py-3 text-sm text-[#8a2f2f]">
          {loadError}
        </p>
      ) : null}

      {!configured ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-pass-muted">
          Supabase isn’t connected yet, so new stamps can’t be saved.
        </p>
      ) : null}

      {visits.length === 0 && !loadError ? (
        <EmptyPassport onLog={() => openLog()} disabled={!configured} />
      ) : (
        <>
          <section aria-label="Passport statistics" className="grid grid-cols-4 gap-1 text-center">
            <Stat value={stats.gyms} label="Gyms" />
            <Stat value={stats.cities} label="Cities" />
            <Stat value={stats.countries} label="Countries" />
            <Stat value={stats.bestSend ?? "—"} label="Best send" />
          </section>

          <section>
            <h2 className="passport-mark text-xl text-pass-navy">Your passport</h2>
            <div className="stamp-row mt-3">
              {countries.map((country) => (
                <div key={country} className="snap-start">
                  <CountryStamp country={country} />
                </div>
              ))}
              <AddStampButton onClick={() => configured && openLog()} />
            </div>
          </section>

          <section className="pb-20">
            <h2 className="passport-mark text-xl text-pass-navy">Recent stamps</h2>
            <ul className="mt-3 space-y-2.5">
              {visits.slice(0, 12).map((visit) => (
                <li key={visit.id}>
                  <Link
                    href={`/passport/gyms/${gymSlug(visit.gym_name, visit.country)}`}
                    className="flex min-h-16 items-center gap-3 rounded-[1.25rem] border border-white bg-white px-3 py-3 shadow-[0_8px_20px_rgba(52,126,168,0.08)]"
                  >
                    <CountryStamp country={visit.country} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold leading-tight">
                        {visit.gym_name}
                      </span>
                      <span className="block truncate text-sm text-pass-muted">
                        {formatVisitPlace(visit)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold">
                        <GradeLabel
                          system={visit.grade_system}
                          grade={visit.highest_grade}
                        />
                      </span>
                      <span className="block text-xs text-pass-muted">
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

      {visits.length > 0 ? (
        <div className="pointer-events-none fixed bottom-[calc(4.65rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-[min(100%,480px)] -translate-x-1/2 px-4">
          <button
            type="button"
            onClick={() => openLog()}
            disabled={!configured}
            className="passport-btn pointer-events-auto"
          >
            + Log a gym
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="min-w-0">
      <p className="passport-mark truncate text-[1.55rem] leading-none text-pass-navy">
        {value}
      </p>
      <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-pass-muted">
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
