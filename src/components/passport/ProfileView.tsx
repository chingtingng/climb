"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { countryName } from "@/lib/countries";
import { formatMonthYear, formatStampDayMonth } from "@/lib/dates";
import { gymSlug, uniqueCountries } from "@/lib/gyms";
import type { FavouriteCity, GymGroup, GymVisit } from "@/lib/types";
import { AccountMenu } from "./AccountMenu";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { DisciplineMark } from "@/components/ui/Marks";
import { GlobeIcon, GymsIcon, MountainIcon, PlusIcon } from "./icons";
import { usePassport } from "./PassportContext";

const RECENT_LIMIT = 4;

function countryTitle(countries: string[]): string {
  const names = countries.map((country) => countryName(country) || country);
  if (names.length <= 2) return names.join(" · ");
  return `${names[0]} and ${names.length - 1} more`;
}

function CountryHighlight({ countries }: { countries: string[] }) {
  return (
    <>
      <p className="truncate text-base font-semibold leading-tight">
        {countryTitle(countries)}
      </p>
      <p className="mt-0.5 text-sm leading-tight text-ink-soft">
        Countries explored
      </p>
    </>
  );
}

export function ProfileView() {
  const { username, stats, visits, gyms, configured, openLog } = usePassport();
  const empty = visits.length === 0;
  const recent = visits.slice(0, RECENT_LIMIT);
  const countries = uniqueCountries(gyms);
  const climbingSince = climbingSinceLabel(visits);
  const placesLabel = `${stats.gyms} ${stats.gyms === 1 ? "place" : "places"} visited`;

  return (
    <div className="space-y-4 wide:grid wide:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] wide:items-start wide:gap-8 wide:space-y-0">
      <div className="space-y-4">
      <section>
        <header className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-semibold text-ink">
            @{username}
          </p>
          <AccountMenu />
        </header>

        <h1 className="mark mt-2 text-2xl leading-none text-ink">
          My climbing passport
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {empty
            ? "Log your first visit to start filling this in."
            : "Here’s where you’ve been climbing."}
        </p>
        {climbingSince ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
            <MountainIcon className="h-3 w-[1.15rem] shrink-0 text-sky-700" />
            <span>
              Climbing since {climbingSince}
              {stats.gyms > 0 ? ` · ${placesLabel}` : null}
            </span>
          </p>
        ) : null}
      </section>

      <Card className="px-3 py-4">
        <div
          aria-label="Passport statistics"
          className="grid grid-cols-4 divide-x divide-sky-200"
        >
          <Stat value={stats.gyms} label="Places" dim={empty} />
          <Stat value={stats.cities} label="Cities" dim={empty} />
          <Stat value={stats.countries} label="Countries" dim={empty} />
          <Stat
            value={stats.bestSend ?? "—"}
            label="Best grade"
            dim={!stats.bestSend}
          />
        </div>
      </Card>

      <Button
        type="button"
        variant="secondary"
        onClick={() => openLog()}
        disabled={!configured}
      >
        <PlusIcon className="size-4 shrink-0" />
        {empty ? "Log your first visit" : "Log a visit"}
      </Button>
      </div>

      <div className="space-y-4">
      <Card className="overflow-hidden !p-0">
        <h2 className="mark px-4 pt-3.5 pb-1 text-lg leading-none text-ink">
          Your climbing
        </h2>
        {stats.mostVisitedGym || stats.favouriteCity || countries.length > 0 ? (
          <ul>
            {stats.mostVisitedGym ? (
              <HighlightRow
                href={`/passport/gyms/${stats.mostVisitedGym.slug || gymSlug(stats.mostVisitedGym.name, stats.mostVisitedGym.country)}`}
                icon={<MountainIcon className="h-4 w-6" />}
                aside={
                  <Count
                    value={stats.mostVisitedGym.visitCount}
                    label={stats.mostVisitedGym.visitCount === 1 ? "Visit" : "Visits"}
                  />
                }
              >
                <GymHighlight gym={stats.mostVisitedGym} />
              </HighlightRow>
            ) : null}
            {stats.favouriteCity ? (
              <HighlightRow
                href="/passport/gyms?view=location&by=city"
                label={`Favourite city: ${stats.favouriteCity.name}`}
                icon={<GymsIcon className="size-5" />}
                aside={
                  <Count
                    value={stats.favouriteCity.sessionCount}
                    label={
                      stats.favouriteCity.sessionCount === 1 ? "Session" : "Sessions"
                    }
                  />
                }
              >
                <CityHighlight city={stats.favouriteCity} />
              </HighlightRow>
            ) : null}
            {countries.length > 0 ? (
              <HighlightRow
                href="/passport/gyms"
                label={
                  countries.length > 2
                    ? `Countries explored: ${countries.map((country) => countryName(country) || country).join(", ")}`
                    : undefined
                }
                icon={<GlobeIcon />}
                aside={
                  <Count
                    value={stats.countries}
                    label={stats.countries === 1 ? "Country" : "Countries"}
                  />
                }
              >
                <CountryHighlight countries={countries} />
              </HighlightRow>
            ) : null}
          </ul>
        ) : (
          <p className="px-4 pb-4 pt-2 text-sm leading-snug text-ink-soft">
            No place logged yet.{" "}
            <button
              type="button"
              onClick={() => openLog()}
              disabled={!configured}
              className="font-semibold text-sky-600 disabled:text-ink-faint"
            >
              Log a visit
            </button>{" "}
            to fill this in.
          </p>
        )}
      </Card>

      {recent.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="mark text-lg leading-none text-ink">Recent</h2>
            {visits.length > recent.length ? (
              <Link
                href="/passport"
                className="-my-2 -mr-1 inline-flex min-h-11 items-center px-1 text-sm font-semibold text-sky-600"
              >
                View all
              </Link>
            ) : null}
          </div>
          <Card className="overflow-hidden !p-0">
            <ul>
              {recent.map((visit) => (
                <RecentRow key={visit.id} visit={visit} />
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
      </div>
    </div>
  );
}

function climbingSinceLabel(visits: GymVisit[]): string | null {
  if (visits.length === 0) return null;
  let oldest = visits[0].visited_on;
  for (const visit of visits) {
    if (visit.visited_on < oldest) oldest = visit.visited_on;
  }
  return formatMonthYear(oldest);
}

function Stat({
  value,
  label,
  dim,
}: {
  value: string | number;
  label: string;
  dim?: boolean;
}) {
  return (
    <div className="min-w-0 px-1.5 text-center first:pl-0 last:pr-0">
      <p
        className={`mark truncate text-2xl leading-none tabular-nums ${
          dim ? "text-ink-faint" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase leading-tight tracking-wide text-ink-soft">
        {label}
      </p>
    </div>
  );
}

function IconCircle({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
      {children}
    </div>
  );
}

function HighlightRow({
  icon,
  href,
  label,
  aside,
  children,
}: {
  icon: ReactNode;
  href?: string;
  label?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const body = (
    <>
      <IconCircle>{icon}</IconCircle>
      <div className="min-w-0 flex-1">{children}</div>
      {aside ? (
        <div className="flex shrink-0 items-center justify-end self-stretch">
          {aside}
        </div>
      ) : null}
    </>
  );

  const rowClass = "flex items-center gap-3 px-3 py-3";

  return (
    <li className="border-t border-sky-200 first:border-t-0">
      {href ? (
        <Link
          href={href}
          aria-label={label}
          className={`${rowClass} hover:bg-sky-50 active:bg-sky-50`}
        >
          {body}
        </Link>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
    </li>
  );
}

function GymHighlight({ gym }: { gym: GymGroup }) {
  return (
    <>
      <p className="break-words text-base font-semibold leading-tight">{gym.name}</p>
      <p className="mt-0.5 text-sm leading-tight text-ink-soft">
        Most visited · {countryName(gym.country) || gym.country}
      </p>
    </>
  );
}

function CityHighlight({ city }: { city: FavouriteCity }) {
  const sessionsLabel =
    city.sessionCount === 1 ? "1 session" : `${city.sessionCount} sessions`;

  return (
    <>
      <p className="break-words text-base font-semibold leading-tight">{city.name}</p>
      <p className="mt-0.5 text-sm leading-tight text-ink-soft">
        Favourite city · {sessionsLabel}
      </p>
    </>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex shrink-0 flex-col items-end justify-center text-right">
      <p className="mark text-xl leading-none tabular-nums">{value}</p>
      <p className="label-micro mt-0.5">{label}</p>
    </div>
  );
}

function visitCityLabel(visit: GymVisit): string {
  const city = visit.city.trim();
  const country = countryName(visit.country) || visit.country.trim();
  if (city && city.toLowerCase() !== visit.country.trim().toLowerCase()) return city;
  return city || country;
}

function RecentRow({ visit }: { visit: GymVisit }) {
  const stamp = formatStampDayMonth(visit.visited_on);
  const city = visitCityLabel(visit);

  return (
    <li className="border-b border-sky-200 last:border-b-0">
      <Link
        href={`/passport/gyms/${gymSlug(visit.gym_name, visit.country)}`}
        className="flex min-h-16 items-center gap-3 px-3 py-2.5 hover:bg-sky-50 active:bg-sky-50"
      >
        <span className="w-9 shrink-0 text-center leading-tight">
          <span className="mark block text-[15px] leading-none text-ink">
            {stamp.day}
          </span>
          <span className="label-micro mt-0.5 block">{stamp.month}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold leading-tight">
            {visit.gym_name}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-ink-soft">
            {city ? (
              <>
                <span className="min-w-0 truncate">{city}</span>
                <span aria-hidden>·</span>
              </>
            ) : null}
            <DisciplineMark type={visit.climbing_type} className="shrink-0" />
          </span>
        </span>
        <GradeBadge
          className="shrink-0"
          system={visit.grade_system}
          grade={visit.highest_grade}
          vEquiv={visit.v_equiv}
        />
      </Link>
    </li>
  );
}
