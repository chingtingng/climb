"use client";

import Link from "next/link";
import { formatStampDate } from "@/lib/dates";
import type { GymVisit } from "@/lib/types";
import { formatVisitPlace, gymSlug } from "@/lib/gyms";
import { Banner } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { DisciplineMark } from "@/components/ui/Marks";
import { CountryStamp } from "./CountryStamp";
import { EmptyPassport } from "./EmptyPassport";
import { usePassport } from "./PassportContext";

export function HomeView() {
  const { username, visits, stats, configured, loadError, openLog } =
    usePassport();
  const countries = uniqueRecentCountries(visits);
  const bestVisit = stats.bestSendVisit;

  return (
    <div
      className={cx(
        "space-y-6",
        visits.length > 0 &&
          "wide:grid wide:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] wide:items-start wide:gap-10 wide:space-y-0",
      )}
    >
      <div className="space-y-6">
        <header>
          <p className="label-micro">@{username}</p>
          <h1 className="mark mt-1 text-3xl text-ink">Chalk Passport</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Every wall you’ve climbed, in one place.
          </p>
        </header>

        {loadError ? (
          <Banner tone="danger" role="alert">
            {loadError}
          </Banner>
        ) : null}

        {!configured ? (
          <Banner>
            Supabase isn’t connected yet, so new stamps can’t be saved.
          </Banner>
        ) : null}

        {visits.length === 0 && !loadError ? (
          <EmptyPassport onLog={() => openLog()} disabled={!configured} />
        ) : (
          <>
            <section
              aria-label="Passport statistics"
              className="glass rounded-lg px-3 py-4"
            >
              <div className="grid grid-cols-4 gap-1 text-center">
                <Stat value={stats.gyms} label="Places" />
                <Stat value={stats.cities} label="Cities" />
                <Stat value={stats.countries} label="Countries" />
                <Stat value={stats.bestSend ?? "—"} label="Best send" />
              </div>
              {bestVisit ? (
                <p className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-center text-xs text-ink-soft">
                  <span>
                    Best send at {bestVisit.gym_name} {bestVisit.city}
                  </span>
                  <GradeBadge
                    system={bestVisit.grade_system}
                    grade={bestVisit.highest_grade}
                    vEquiv={bestVisit.v_equiv}
                  />
                </p>
              ) : null}
            </section>

            <section>
              <h2 className="mark text-xl text-ink">Your passport</h2>
              <div className="stamp-row mt-1">
                {countries.map((country) => (
                  <div key={country} className="snap-start">
                    <CountryStamp country={country} />
                    <span className="sr-only">{country}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {visits.length > 0 ? (
        <section>
          <h2 className="mark text-xl text-ink">Recent stamps</h2>
          <ul className="mt-3 space-y-2.5">
            {visits.slice(0, 12).map((visit) => (
              <li key={visit.id}>
                <Link
                  href={`/passport/gyms/${gymSlug(visit.gym_name, visit.country)}`}
                  className="flex min-h-16 items-center gap-3"
                >
                  <Card className="flex min-h-16 w-full items-center gap-3 px-3 py-3 transition-colors hover:bg-sky-50">
                    <CountryStamp country={visit.country} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-micro leading-tight text-ink-soft">
                        {formatStampDate(visit.visited_on)}
                      </span>
                      <span className="mt-0.5 block truncate font-semibold leading-tight">
                        {visit.gym_name}
                      </span>
                      <span className="flex items-center gap-1 truncate text-sm text-ink-soft">
                        <span className="truncate">{formatVisitPlace(visit)}</span>
                        <span aria-hidden>·</span>
                        <DisciplineMark type={visit.climbing_type} />
                      </span>
                    </span>
                    <GradeBadge
                      className="shrink-0"
                      system={visit.grade_system}
                      grade={visit.highest_grade}
                      vEquiv={visit.v_equiv}
                    />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="min-w-0">
      <p className="mark truncate text-2xl leading-none text-ink">{value}</p>
      <p className="label-micro mt-1">{label}</p>
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
