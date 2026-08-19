"use client";

import { logoutAction } from "@/app/actions";
import { CountryStamp } from "./CountryStamp";
import { usePassport } from "./PassportContext";

export function ProfileView() {
  const { username, stats, gyms } = usePassport();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-pass-muted">
          @{username}
        </p>
        <h1 className="passport-mark mt-1 text-[2rem] leading-none">
          My climbing passport
        </h1>
      </header>

      <section aria-label="Passport statistics" className="grid grid-cols-4 gap-1 text-center">
        <Stat value={stats.gyms} label="Gyms" />
        <Stat value={stats.cities} label="Cities" />
        <Stat value={stats.countries} label="Countries" />
        <Stat value={stats.bestSend ?? "—"} label="Best send" />
      </section>

      <section className="space-y-2.5">
        <h2 className="passport-mark text-xl">Highlights</h2>
        <div className="rounded-[1.25rem] bg-white px-4 py-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-pass-muted">
            Most visited gym
          </p>
          {stats.mostVisitedGym ? (
            <div className="mt-2 flex items-center gap-3">
              <CountryStamp country={stats.mostVisitedGym.country} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{stats.mostVisitedGym.name}</p>
                <p className="truncate text-sm text-pass-muted">
                  {stats.mostVisitedGym.visitCount}{" "}
                  {stats.mostVisitedGym.visitCount === 1 ? "visit" : "visits"} ·{" "}
                  {stats.mostVisitedGym.city}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-pass-muted">Log a gym to fill this in.</p>
          )}
        </div>

        <div className="overflow-hidden rounded-[1.25rem] bg-white px-4 py-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-pass-muted">
            Favourite climbing city
          </p>
          {stats.favouriteCity ? (
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="passport-mark text-2xl leading-none">{stats.favouriteCity}</p>
              <Skyline />
            </div>
          ) : (
            <p className="mt-2 text-sm text-pass-muted">Your favourite city will show up here.</p>
          )}
        </div>
      </section>

      {gyms.length > 0 ? (
        <section>
          <h2 className="passport-mark text-xl">Countries</h2>
          <div className="stamp-row mt-3">
            {[...new Set(gyms.map((gym) => gym.country))].map((country) => (
              <CountryStamp key={country} country={country} />
            ))}
          </div>
        </section>
      ) : null}

      <form action={logoutAction} className="pt-4 text-center">
        <button
          type="submit"
          className="min-h-11 px-4 text-sm font-semibold text-[#b42318]"
        >
          Log out
        </button>
      </form>
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="min-w-0">
      <p className="passport-mark truncate text-[1.55rem] leading-none">{value}</p>
      <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-pass-muted">
        {label}
      </p>
    </div>
  );
}

function Skyline() {
  return (
    <svg
      viewBox="0 0 88 36"
      className="h-9 w-[5.5rem] text-pass-line"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M4 36V20h8v16H4Zm12 0V10l10 6v20H16Zm14 0V16h7v20h-7Zm11 0V8h4v6h6V8h4v28H41Zm18 0V14h10v22H59Zm14 0V18h8v18h-8Z"
      />
    </svg>
  );
}
