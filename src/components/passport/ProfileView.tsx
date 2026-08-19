"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/app/actions";
import { formatClimbingType } from "@/lib/climbingTypes";
import { formatStampDayMonth } from "@/lib/dates";
import { gymSlug } from "@/lib/gyms";
import type { FavouriteCity, GymGroup, GymVisit } from "@/lib/types";
import { ActionButtonLabel } from "./ActionButtonLabel";
import { GradeLabel } from "./GradePicker";
import { ChevronIcon, GymsIcon, MountainIcon } from "./icons";
import { usePassport } from "./PassportContext";

const FEEDBACK_URL = "https://www.instagram.com/chalkchingup";

export function ProfileView() {
  const { username, stats, visits, configured, openLog } = usePassport();
  const empty = visits.length === 0;
  const recent = visits.slice(0, 4);

  return (
    <div className="space-y-3">
      <header className="pb-1">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-pass-muted">
          Profile
        </p>
        <p className="mt-2 text-[0.95rem] font-semibold text-pass-navy">@{username}</p>
      </header>

      <section className="rounded-[1.25rem] bg-white px-4 py-5">
        <h1 className="passport-mark text-[1.65rem] leading-none text-pass-navy">
          My climbing passport
        </h1>
        <p className="mt-2 text-sm text-pass-muted">
          {empty
            ? "Log your first gym to start filling this in."
            : "Here’s where you’ve been climbing."}
        </p>

        <div
          aria-label="Passport statistics"
          className="mt-5 grid grid-cols-4 gap-2"
        >
          <Stat value={stats.gyms} label="Gyms" dim={empty} />
          <Stat value={stats.cities} label="Cities" dim={empty} />
          <Stat value={stats.countries} label="Countries" dim={empty} />
          <Stat
            value={stats.bestSend ?? "—"}
            label="Best send"
            dim={!stats.bestSend}
            accent={Boolean(stats.bestSend)}
          />
        </div>

        <button
          type="button"
          onClick={() => openLog()}
          disabled={!configured}
          className={
            empty
              ? "passport-btn mt-5"
              : "mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-pass-soft text-[0.95rem] font-semibold text-pass-primary disabled:cursor-not-allowed disabled:opacity-55"
          }
        >
          {empty ? "+ Log your first gym" : "+ Log a gym"}
        </button>
      </section>

      <HighlightCard
        icon={<MountainIcon className="h-5 w-7" />}
        label="Most visited gym"
        empty={
          <>
            No gym logged yet.{" "}
            <button
              type="button"
              onClick={() => openLog()}
              disabled={!configured}
              className="font-semibold text-pass-primary"
            >
              Log a gym
            </button>{" "}
            to fill this in.
          </>
        }
      >
        {stats.mostVisitedGym ? (
          <GymHighlight gym={stats.mostVisitedGym} />
        ) : null}
      </HighlightCard>

      <HighlightCard
        icon={<GymsIcon />}
        label="Favourite climbing city"
        empty="Your top city shows up here after a few logged sessions."
      >
        {stats.favouriteCity ? <CityHighlight city={stats.favouriteCity} /> : null}
      </HighlightCard>

      {recent.length > 0 ? (
        <section>
          <h2 className="mb-2 px-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-pass-muted">
            Recent
          </h2>
          <ul className="overflow-hidden rounded-[1.25rem] bg-white">
            {recent.map((visit) => (
              <RecentRow key={visit.id} visit={visit} />
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 px-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-pass-muted">
          Account
        </h2>
        <div className="overflow-hidden rounded-[1.25rem] bg-white">
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-14 items-center gap-3 px-4 text-sm font-semibold"
          >
            <HelpIcon />
            Help & feedback
            <span className="ml-auto text-pass-line">
              <ChevronIcon />
            </span>
          </a>
          <form action={logoutAction}>
            <LogoutButton />
          </form>
        </div>
      </section>
    </div>
  );
}

function LogoutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex min-h-14 w-full items-center gap-3 border-t border-pass-line px-4 text-sm font-semibold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogoutIcon />
      <ActionButtonLabel pending={pending} idle="Log out" busy="Logging out…" />
      <span className="ml-auto text-pass-line">
        <ChevronIcon />
      </span>
    </button>
  );
}

function Stat({
  value,
  label,
  dim,
  accent,
}: {
  value: string | number;
  label: string;
  dim?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p
        className={`passport-mark truncate text-[1.7rem] leading-none ${
          accent ? "text-pass-primary" : dim ? "text-pass-line" : "text-pass-navy"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-pass-muted">
        {label}
      </p>
    </div>
  );
}

function HighlightCard({
  icon,
  label,
  empty,
  children,
}: {
  icon: ReactNode;
  label: string;
  empty: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex items-center gap-3.5 rounded-[1.25rem] bg-white px-4 py-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-pass-soft text-pass-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-pass-muted">
          {label}
        </p>
        {children ? children : <p className="mt-1 text-sm leading-relaxed text-pass-muted">{empty}</p>}
      </div>
    </section>
  );
}

function GymHighlight({ gym }: { gym: GymGroup }) {
  return (
    <Link
      href={`/passport/gyms/${gym.slug || gymSlug(gym.name, gym.country)}`}
      className="mt-1 flex items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold leading-tight">{gym.name}</p>
        <p className="truncate text-sm text-pass-muted">{gym.country}</p>
      </div>
      <Count value={gym.visitCount} label={gym.visitCount === 1 ? "Visit" : "Visits"} />
    </Link>
  );
}

function CityHighlight({ city }: { city: FavouriteCity }) {
  const samePlace = city.name.trim().toLowerCase() === city.country.trim().toLowerCase();
  const gymsLabel = `${city.gymCount} ${city.gymCount === 1 ? "gym" : "gyms"} logged here`;

  return (
    <div className="mt-1 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-semibold leading-tight">{city.name}</p>
        <p className="truncate text-sm text-pass-muted">
          {samePlace ? gymsLabel : `${city.country} · ${gymsLabel}`}
        </p>
      </div>
      <Count
        value={city.sessionCount}
        label={city.sessionCount === 1 ? "Session" : "Sessions"}
      />
    </div>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="shrink-0 text-right">
      <p className="passport-mark text-2xl leading-none">{value}</p>
      <p className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-pass-muted">
        {label}
      </p>
    </div>
  );
}

function RecentRow({ visit }: { visit: GymVisit }) {
  const stamp = formatStampDayMonth(visit.visited_on);
  const place =
    visit.outlet && visit.outlet.toLowerCase() !== visit.country.toLowerCase()
      ? `${visit.outlet} · ${visit.country}`
      : visit.country;

  return (
    <li className="border-b border-pass-line last:border-b-0">
      <Link
        href={`/passport/gyms/${gymSlug(visit.gym_name, visit.country)}`}
        className="flex min-h-16 items-center gap-3 px-4 py-2.5"
      >
        <span className="w-9 shrink-0 text-center text-[0.65rem] font-semibold uppercase leading-tight text-pass-muted">
          <span className="block text-[0.95rem] font-bold tracking-tight text-pass-navy">
            {stamp.day}
          </span>
          {stamp.month}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight">
            {visit.gym_name}
          </span>
          <span className="block truncate text-xs text-pass-muted">
            {place} · {formatClimbingType(visit.climbing_type)}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-pass-soft px-2.5 py-1 text-xs font-semibold text-pass-primary">
          <GradeLabel
            system={visit.grade_system}
            grade={visit.highest_grade}
            vEquiv={visit.v_equiv}
          />
        </span>
      </Link>
    </li>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 shrink-0" fill="none">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 16.2v-4.1M12 8.4h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 shrink-0" fill="none">
      <path
        d="M9.5 20H6.2A1.7 1.7 0 0 1 4.5 18.3V5.7A1.7 1.7 0 0 1 6.2 4h3.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="m15 16 5-4-5-4M20 12H9.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
