"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from "react";
import Link from "next/link";
import { countryCode } from "@/lib/countries";
import { formatStampDate } from "@/lib/dates";
import { gradeSortValue } from "@/lib/grades";
import { catalogNameMatchKind, normalizeCatalogLabel, sameCountry } from "@/lib/gymCatalog";
import {
  filterLocationGroups,
  formatGymPlace,
  groupVisitsByLocation,
  locationGroupCounts,
  uniqueCountries,
} from "@/lib/gyms";
import type { GymGroup } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { PlaceKindMark } from "@/components/ui/Marks";
import { placeInk } from "@/components/ui/Stamp";
import { cx } from "@/components/ui/cx";
import { CountryStamp } from "./CountryStamp";
import { ChevronIcon, GlobeIcon, GymsIcon, SearchIcon } from "./icons";
import { usePassport } from "./PassportContext";
import {
  PlacesLocationView,
  type LocationGroupBy,
} from "./PlacesLocationView";

type SortKey = "recent" | "grade" | "az" | "country";
type PlacesView = "places" | "location";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently visited" },
  { value: "grade", label: "Highest grade" },
  { value: "az", label: "A–Z" },
  { value: "country", label: "Country" },
];

export function GymsView({
  initialView = "places",
  initialGroupBy = "city",
}: {
  initialView?: PlacesView;
  initialGroupBy?: LocationGroupBy;
}) {
  const { gyms, visits, configured, openLog } = usePassport();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("All");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<PlacesView>(initialView);
  const [groupBy, setGroupBy] = useState<LocationGroupBy>(initialGroupBy);

  useEffect(() => {
    setView(initialView);
    setGroupBy(initialGroupBy);
  }, [initialView, initialGroupBy]);

  const countries = uniqueCountries(gyms);
  const activeCountry = view === "location" ? "All" : country;
  const q = normalizeCatalogLabel(query);
  const filtered = gyms
    .filter((gym) => {
      const matchesQuery =
        !q ||
        catalogNameMatchKind(query, gym.name) !== "none" ||
        normalizeCatalogLabel(
          `${gym.name} ${gym.city} ${gym.country} ${countryCode(gym.country)} ${gym.outlets.join(" ")}`,
        ).includes(q);
      const matchesCountry =
        activeCountry === "All" || sameCountry(gym.country, activeCountry);
      return matchesQuery && matchesCountry;
    })
    .sort((a, b) => compareGyms(a, b, sort));
  const locationGroups = useMemo(
    () =>
      filterLocationGroups(
        groupVisitsByLocation(visits, gyms),
        query,
        activeCountry,
      ),
    [visits, gyms, query, activeCountry],
  );
  const locationCounts = locationGroupCounts(locationGroups);
  const locationEmpty = locationGroups.length === 0;
  const listEmpty = view === "places" ? filtered.length === 0 : locationEmpty;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="mark text-3xl text-ink">Your places</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Every place you’ve left some chalk.
        </p>
      </header>

      <div
        role="group"
        aria-label="Places view"
        className="flex gap-2"
      >
        <Pill
          selected={view === "places"}
          aria-pressed={view === "places"}
          onClick={() => setView("places")}
        >
          Places
        </Pill>
        <Pill
          selected={view === "location"}
          aria-pressed={view === "location"}
          onClick={() => setView("location")}
        >
          Location
        </Pill>
      </div>

      <div className="space-y-2.5">
        <label className="relative block">
          <span className="sr-only">Search places, cities or countries</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">
            <SearchIcon className="size-[1.125rem]" />
          </span>
          <Field
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places, cities or countries"
            icon
            preventIosZoom
            className="!text-base"
          />
        </label>

        <div className="relative z-20 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="flex min-w-0 shrink items-center gap-1.5 text-sm text-ink-soft">
            {view === "location" ? (
              <GlobeIcon className="size-3.5 shrink-0" />
            ) : (
              <GymsIcon className="size-3.5 shrink-0" />
            )}
            <span className="truncate">
              {view === "places"
                ? `${filtered.length} ${filtered.length === 1 ? "place" : "places"}`
                : groupBy === "city"
                  ? locationCounts.cities > 0
                    ? `${locationCounts.cities} ${locationCounts.cities === 1 ? "city" : "cities"}`
                    : `${locationCounts.places} ${locationCounts.places === 1 ? "place" : "places"}`
                  : `${locationCounts.countries} ${locationCounts.countries === 1 ? "country" : "countries"}`}
            </span>
          </p>
          {view === "places" ? (
            <SortMenu value={sort} onChange={setSort} />
          ) : (
            <div
              role="group"
              aria-label="Show by country or city"
              className="flex min-w-0 gap-1.5"
            >
              <Pill
                selected={groupBy === "country"}
                aria-pressed={groupBy === "country"}
                onClick={() => setGroupBy("country")}
              >
                Country
              </Pill>
              <Pill
                selected={groupBy === "city"}
                aria-pressed={groupBy === "city"}
                onClick={() => setGroupBy("city")}
              >
                City
              </Pill>
            </div>
          )}
        </div>
      </div>

      {gyms.length === 0 ? (
        <EmptyState
          seed="no-places"
          label="GO"
          title="No stamps yet, log your first send"
          body="Log a visit and it’ll appear in your collection."
          actionLabel="+ Log a visit"
          onAction={() => openLog()}
          disabled={!configured}
        />
      ) : listEmpty ? (
        <EmptyState
          seed="no-search"
          label="?"
          title="Nothing in this corner of the atlas"
          body="No places match that search. Try another country, or clear the search."
        />
      ) : view === "location" ? (
        <PlacesLocationView
          key={groupBy}
          groups={locationGroups}
          groupBy={groupBy}
          expandAll={Boolean(q)}
        />
      ) : (
        <ul className="relative z-0 grid grid-cols-1 gap-2.5 wide:grid-cols-2 desktop:grid-cols-3">
          {filtered.map((gym) => (
            <li key={gym.slug}>
              <Link href={`/passport/gyms/${gym.slug}`}>
                <Card className="flex min-h-16 items-center gap-3 px-3 py-3 transition-colors hover:bg-sky-50">
                  <CountryStamp
                    country={gym.country}
                    size="sm"
                    ink={placeInk(gym.place_kind)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold leading-tight">
                      {gym.name}
                    </span>
                    <span className="flex items-center gap-1 truncate text-sm text-ink-soft">
                      <PlaceKindMark kind={gym.place_kind} />
                      <span aria-hidden>·</span>
                      <span className="truncate">{formatGymPlace(gym)}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {gym.visitCount} {gym.visitCount === 1 ? "visit" : "visits"} ·{" "}
                      {formatStampDate(gym.lastVisited)}
                    </span>
                  </span>
                  <GradeBadge
                    system={gym.bestGradeSystem}
                    grade={gym.bestGrade}
                    vEquiv={gym.bestVEquiv}
                  />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Pill({
  selected,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold",
        selected
          ? "border-sky-300 bg-sky-300 text-ink"
          : "border-sky-300 bg-surface text-ink hover:bg-sky-50 active:bg-sky-50",
        className,
      )}
      {...props}
    />
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
    <div ref={rootRef} className="flex min-w-0 items-center gap-1.5">
      <div className="relative min-w-0">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={`Sort: ${label}`}
          onClick={toggle}
          className="inline-flex h-8 min-w-0 max-w-full items-center gap-1 rounded-full border border-sky-300 bg-surface py-0 pl-2.5 pr-2 text-sm"
        >
          <span className="truncate font-semibold text-ink">{label}</span>
          <ChevronIcon
            className={cx(
              "size-3.5 shrink-0 text-ink transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        </button>
        {open ? (
          <ul
            id={menuId}
            role="listbox"
            aria-label="Sort places"
            className={cx(
              "absolute right-0 z-40 min-w-50 overflow-hidden rounded-xl border border-sky-300 bg-surface py-1 shadow-lifted",
              placeAbove ? "bottom-[calc(100%+0.4rem)]" : "top-[calc(100%+0.4rem)]",
            )}
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
                    className={cx(
                      "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-semibold",
                      selected ? "bg-sky-100 text-ink" : "text-ink hover:bg-sky-50",
                    )}
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
    </div>
  );
}

function compareGyms(a: GymGroup, b: GymGroup, sort: SortKey) {
  if (sort === "az") return a.name.localeCompare(b.name);
  if (sort === "country") {
    const country = countryCode(a.country).localeCompare(countryCode(b.country));
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
