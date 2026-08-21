"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { countryName } from "@/lib/countries";
import { formatStampDate } from "@/lib/dates";
import {
  cityLocationSummary,
  countryLocationSummary,
  formatOutletLocation,
  formatPlaceLocation,
  placeHasOutlets,
  placeLocationSummary,
  type LocationCityGroup,
  type LocationCountryGroup,
  type LocationPlaceGroup,
  type VisitedOutlet,
} from "@/lib/gyms";
import { Card } from "@/components/ui/Card";
import { GradeBadge } from "@/components/ui/GradeBadge";
import { PlaceKindMark } from "@/components/ui/Marks";
import { cx } from "@/components/ui/cx";
import { CountryStamp } from "./CountryStamp";
import { ChevronIcon } from "./icons";

export type LocationGroupBy = "country" | "city";

export function PlacesLocationView({
  groups,
  groupBy,
  expandAll,
}: {
  groups: LocationCountryGroup[];
  groupBy: LocationGroupBy;
  expandAll?: boolean;
}) {
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  function isOpen(key: string) {
    return Boolean(expandAll) || openKeys.includes(key);
  }

  function toggle(key: string) {
    setOpenKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  return (
    <ul className="relative z-0 space-y-2.5 wide:grid wide:grid-cols-2 wide:items-start wide:gap-2.5 wide:space-y-0">
      {groups.map((group) => (
        <li key={group.key}>
          {groupBy === "country" ? (
            <CountryAccordion
              group={group}
              open={isOpen(group.key)}
              isOpen={isOpen}
              onToggle={toggle}
            />
          ) : group.skipCity ? (
            <CountryPlaceList group={group} isOpen={isOpen} onToggle={toggle} />
          ) : (
            <CountryCityList group={group} isOpen={isOpen} onToggle={toggle} />
          )}
        </li>
      ))}
    </ul>
  );
}

function CountryAccordion({
  group,
  open,
  isOpen,
  onToggle,
}: {
  group: LocationCountryGroup;
  open: boolean;
  isOpen: (key: string) => boolean;
  onToggle: (key: string) => void;
}) {
  const name = countryName(group.country) || group.country;
  const panelId = usePrefixedId(group.key);

  return (
    <Card className="overflow-hidden !p-0">
      <AccordionButton
        open={open}
        panelId={panelId}
        onClick={() => onToggle(group.key)}
        leading={<CountryStamp country={group.country} size="sm" />}
        title={name}
        subtitle={countryLocationSummary(group)}
      />
      {open ? (
        <PlaceList
          id={panelId}
          places={group.places}
          isOpen={isOpen}
          onToggle={onToggle}
          includeCity={!group.skipCity}
        />
      ) : null}
    </Card>
  );
}

function CountryPlaceList({
  group,
  isOpen,
  onToggle,
}: {
  group: LocationCountryGroup;
  isOpen: (key: string) => boolean;
  onToggle: (key: string) => void;
}) {
  const name = countryName(group.country) || group.country;

  return (
    <Card className="overflow-hidden !p-0">
      <CountryHeader group={group} name={name} />
      <PlaceList
        places={group.places}
        isOpen={isOpen}
        onToggle={onToggle}
        includeCity={false}
      />
    </Card>
  );
}

function CountryCityList({
  group,
  isOpen,
  onToggle,
}: {
  group: LocationCountryGroup;
  isOpen: (key: string) => boolean;
  onToggle: (key: string) => void;
}) {
  const name = countryName(group.country) || group.country;

  return (
    <Card className="overflow-hidden !p-0">
      <CountryHeader group={group} name={name} />
      <ul className="border-t border-sky-200">
        {group.cities.map((city) => (
          <li key={city.key} className="border-t border-sky-100 first:border-t-0">
            <CityAccordion
              city={city}
              open={isOpen(city.key)}
              isOpen={isOpen}
              onToggle={onToggle}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CountryHeader({
  group,
  name,
}: {
  group: LocationCountryGroup;
  name: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <CountryStamp country={group.country} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-tight">{name}</p>
        <p className="text-sm text-ink-soft">{countryLocationSummary(group)}</p>
      </div>
    </div>
  );
}

function CityAccordion({
  city,
  open,
  isOpen,
  onToggle,
}: {
  city: LocationCityGroup;
  open: boolean;
  isOpen: (key: string) => boolean;
  onToggle: (key: string) => void;
}) {
  const panelId = usePrefixedId(city.key);

  return (
    <div>
      <AccordionButton
        open={open}
        panelId={panelId}
        onClick={() => onToggle(city.key)}
        title={city.city}
        subtitle={cityLocationSummary(city)}
        compact
      />
      {open ? (
        <PlaceList
          id={panelId}
          places={city.places}
          isOpen={isOpen}
          onToggle={onToggle}
          includeCity={false}
        />
      ) : null}
    </div>
  );
}

function PlaceList({
  id,
  places,
  isOpen,
  onToggle,
  includeCity,
}: {
  id?: string;
  places: LocationPlaceGroup[];
  isOpen: (key: string) => boolean;
  onToggle: (key: string) => void;
  includeCity?: boolean;
}) {
  return (
    <ul id={id} className="border-t border-sky-200 bg-sky-50/60">
      {places.map((place) => (
        <li key={place.key} className="border-t border-sky-100 first:border-t-0">
          {placeHasOutlets(place) ? (
            <PlaceAccordion
              place={place}
              open={isOpen(place.key)}
              onToggle={() => onToggle(place.key)}
              includeCity={includeCity}
            />
          ) : (
            <PlaceRow place={place} includeCity={includeCity} />
          )}
        </li>
      ))}
    </ul>
  );
}

function PlaceAccordion({
  place,
  open,
  onToggle,
  includeCity,
}: {
  place: LocationPlaceGroup;
  open: boolean;
  onToggle: () => void;
  includeCity?: boolean;
}) {
  const panelId = usePrefixedId(place.key);

  return (
    <div>
      <AccordionButton
        open={open}
        panelId={panelId}
        onClick={onToggle}
        title={place.name}
        subtitle={placeLocationSummary(place)}
        compact
        trailing={
          <GradeBadge
            system={place.bestGradeSystem}
            grade={place.bestGrade}
            vEquiv={place.bestVEquiv}
          />
        }
      />
      {open ? (
        <ul id={panelId} className="border-t border-sky-200 bg-surface">
          {place.outlets.map((outlet) => (
            <li key={outlet.key} className="border-t border-sky-100 first:border-t-0">
              <OutletRow outlet={outlet} includeCity={includeCity} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PlaceRow({
  place,
  includeCity,
}: {
  place: LocationPlaceGroup;
  includeCity?: boolean;
}) {
  const location = formatPlaceLocation(place, { includeCity });

  return (
    <Link
      href={`/passport/gyms/${place.slug}`}
      className="flex min-h-16 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-sky-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold leading-tight">{place.name}</span>
        <span className="flex items-center gap-1 truncate text-sm text-ink-soft">
          <PlaceKindMark kind={place.place_kind} />
          {location ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{location}</span>
            </>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs text-ink-soft">
          {placeLocationSummary(place)}
          {place.lastVisited ? ` · ${formatStampDate(place.lastVisited)}` : ""}
        </span>
      </span>
      <GradeBadge
        system={place.bestGradeSystem}
        grade={place.bestGrade}
        vEquiv={place.bestVEquiv}
      />
      <ChevronIcon className="size-4 shrink-0 -rotate-90 text-ink-soft" />
    </Link>
  );
}

function OutletRow({
  outlet,
  includeCity,
}: {
  outlet: VisitedOutlet;
  includeCity?: boolean;
}) {
  const location = formatOutletLocation(outlet, { includeCity, includeOutlet: true });
  const title =
    outlet.outlet.trim() &&
    outlet.outlet.trim().toLowerCase() !== outlet.gymName.trim().toLowerCase()
      ? outlet.outlet.trim()
      : location || outlet.city.trim() || outlet.gymName;

  return (
    <Link
      href={`/passport/gyms/${outlet.slug}`}
      className="flex min-h-14 items-center gap-3 px-3 py-2.5 pl-5 transition-colors hover:bg-sky-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold leading-tight">{title}</span>
        {includeCity && location && location !== title ? (
          <span className="block truncate text-sm text-ink-soft">{location}</span>
        ) : null}
        <span className="mt-0.5 block text-xs text-ink-soft">
          {outlet.visitCount} {outlet.visitCount === 1 ? "visit" : "visits"} ·{" "}
          {formatStampDate(outlet.lastVisited)}
        </span>
      </span>
      <GradeBadge
        system={outlet.bestGradeSystem}
        grade={outlet.bestGrade}
        vEquiv={outlet.bestVEquiv}
      />
      <ChevronIcon className="size-4 shrink-0 -rotate-90 text-ink-soft" />
    </Link>
  );
}

function AccordionButton({
  open,
  panelId,
  onClick,
  leading,
  trailing,
  title,
  subtitle,
  compact,
}: {
  open: boolean;
  panelId: string;
  onClick: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  title: string;
  subtitle: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 text-left transition-colors hover:bg-sky-50",
        compact ? "px-3 py-2.5" : "px-3 py-3",
      )}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold leading-tight">{title}</span>
        <span className="block text-sm text-ink-soft">{subtitle}</span>
      </span>
      {trailing}
      <ChevronIcon
        className={cx(
          "size-4 shrink-0 text-ink-soft transition-transform duration-150",
          open && "rotate-180",
        )}
      />
    </button>
  );
}

function usePrefixedId(key: string) {
  const base = useId();
  return `${base}-${key.replace(/[^a-z0-9]+/gi, "-")}`;
}
