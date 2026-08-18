"use client";

import { useMemo, useState } from "react";
import { logoutAction } from "@/app/actions";
import { formatGrade } from "@/lib/grades";
import type { GymVisit } from "@/lib/types";
import { DeleteVisitButton, VisitForm } from "@/components/VisitForm";

type Props = {
  username: string;
  visits: GymVisit[];
  configured: boolean;
};

export function PassportApp({ username, visits, configured }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GymVisit | null>(null);

  const grouped = useMemo(() => groupVisits(visits), [visits]);
  const countries = new Set(visits.map((v) => v.country)).size;
  const cities = new Set(visits.map((v) => `${v.country}::${v.city}`)).size;

  return (
    <div className="space-y-6">
      <header className="fade-up flex items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-ink-soft">
            @{username}
          </p>
          <h1 className="brand-mark mt-1 text-[2.4rem] leading-none text-ink">
            Chalk Passport
          </h1>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-full bg-white/80 px-3 py-1.5 text-sm font-semibold text-ink-soft shadow-sm"
          >
            Log out
          </button>
        </form>
      </header>

      <section className="fade-up-delay grid grid-cols-3 gap-2 text-center">
        <Metric label="Gyms" value={visits.length} />
        <Metric label="Cities" value={cities} />
        <Metric label="Countries" value={countries} />
      </section>

      {!configured && (
        <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-ink-soft">
          Supabase env vars are missing. Visits can’t be saved until the project
          is connected.
        </p>
      )}

      <div className="fade-up-delay-2">
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          disabled={!configured}
          className="w-full rounded-2xl bg-ink px-4 py-3.5 font-semibold text-white transition enabled:active:scale-[0.98] disabled:opacity-50"
        >
          + Stamp a gym
        </button>
      </div>

      {visits.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {grouped.map(([country, citiesMap]) => (
            <section key={country} className="space-y-3">
              <h2 className="brand-mark text-xl text-ink">{country}</h2>
              {Array.from(citiesMap.entries()).map(([city, cityVisits]) => (
                <div key={`${country}-${city}`} className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-soft">
                    {city}
                  </p>
                  <ul className="space-y-2.5">
                    {cityVisits.map((visit) => (
                      <li
                        key={visit.id}
                        className="rounded-[1.35rem] border border-white/80 bg-white/75 px-4 py-3.5 shadow-[0_12px_30px_rgba(107,179,217,0.12)] backdrop-blur"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold leading-tight text-ink">
                              {visit.gym_name}
                            </p>
                            <p className="mt-1 text-sm text-ink-soft">
                              Highest:{" "}
                              <span className="font-semibold text-baby-deep">
                                {formatGrade(
                                  visit.grade_system,
                                  visit.highest_grade,
                                )}
                              </span>
                            </p>
                            <p className="mt-1 text-xs text-ink-soft/80">
                              {formatDate(visit.visited_on)}
                            </p>
                            {visit.notes ? (
                              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                                {visit.notes}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(visit);
                                setOpen(true);
                              }}
                              className="text-sm font-semibold text-baby-deep"
                            >
                              Edit
                            </button>
                            <DeleteVisitButton visitId={visit.id} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <footer className="pt-4 text-center text-sm text-ink-soft">
        <a
          href="https://www.instagram.com/chalkchingup"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-[#9fd0ea] underline-offset-4"
        >
          @chalkchingup on Instagram
        </a>
      </footer>

      {open ? (
        <VisitForm
          visit={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/70 px-2 py-3 shadow-[0_8px_24px_rgba(107,179,217,0.1)]">
      <p className="brand-mark text-2xl text-ink">{value}</p>
      <p className="mt-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-ink-soft">
        {label}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[1.75rem] bg-gradient-to-br from-white/90 to-sky/70 px-5 py-10 text-center">
      <p className="brand-mark text-3xl text-ink">Blank pages</p>
      <p className="mx-auto mt-3 max-w-[16rem] text-sm leading-relaxed text-ink-soft">
        Your first gym stamp goes here — wherever the chalk dust settled.
      </p>
    </div>
  );
}

function groupVisits(visits: GymVisit[]) {
  const map = new Map<string, Map<string, GymVisit[]>>();
  for (const visit of visits) {
    if (!map.has(visit.country)) map.set(visit.country, new Map());
    const cities = map.get(visit.country)!;
    if (!cities.has(visit.city)) cities.set(visit.city, []);
    cities.get(visit.city)!.push(visit);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(`${iso}T00:00:00`));
  } catch {
    return iso;
  }
}
