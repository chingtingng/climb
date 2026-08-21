"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { countryName } from "@/lib/countries";
import { formatStampDate } from "@/lib/dates";
import {
  flattenCountryOutlets,
  formatVisitedOutlet,
  type LocationCityGroup,
  type LocationCountryGroup,
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
              onToggle={() => toggle(group.key)}
            />
          ) : (
            <CountryCityList
              group={group}
              isOpen={isOpen}
              onToggle={toggle}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function CountryAccordion({
  group,
  open,
  onToggle,
}: {
  group: LocationCountryGroup;
  open: boolean;
  onToggle: () => void;
}) {
  const outlets = flattenCountryOutlets(group);
  const name = countryName(group.country) || group.country;
  const panelId = usePrefixedId(group.key);

  return (
    <Card className="overflow-hidden !p-0">
      <AccordionButton
        open={open}
        panelId={panelId}
        onClick={onToggle}
        leading={<CountryStamp country={group.country} size="sm" />}
        title={name}
        subtitle={outletSummary(outlets.length, group.visitCount)}
      />
      {open ? (
        <OutletList id={panelId} outlets={outlets} includeCity />
      ) : null}
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
  const cityCount = group.cities.length;

  return (
    <Card className="overflow-hidden !p-0">
      <div className="flex items-center gap-3 px-3 py-3">
        <CountryStamp country={group.country} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{name}</p>
          <p className="text-sm text-ink-soft">
            {cityCount} {cityCount === 1 ? "city" : "cities"} ·{" "}
            {outletSummary(flattenCountryOutlets(group).length, group.visitCount)}
          </p>
        </div>
      </div>
      <ul className="border-t border-sky-200">
        {group.cities.map((city) => (
          <li key={city.key} className="border-t border-sky-100 first:border-t-0">
            <CityAccordion
              city={city}
              open={isOpen(city.key)}
              onToggle={() => onToggle(city.key)}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CityAccordion({
  city,
  open,
  onToggle,
}: {
  city: LocationCityGroup;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = usePrefixedId(city.key);

  return (
    <div>
      <AccordionButton
        open={open}
        panelId={panelId}
        onClick={onToggle}
        title={city.city}
        subtitle={outletSummary(city.outlets.length, city.visitCount)}
        compact
      />
      {open ? (
        <OutletList id={panelId} outlets={city.outlets} />
      ) : null}
    </div>
  );
}

function AccordionButton({
  open,
  panelId,
  onClick,
  leading,
  title,
  subtitle,
  compact,
}: {
  open: boolean;
  panelId: string;
  onClick: () => void;
  leading?: ReactNode;
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
      <ChevronIcon
        className={cx(
          "size-4 shrink-0 text-ink-soft transition-transform duration-150",
          open && "rotate-180",
        )}
      />
    </button>
  );
}

function OutletList({
  id,
  outlets,
  includeCity,
}: {
  id: string;
  outlets: VisitedOutlet[];
  includeCity?: boolean;
}) {
  return (
    <ul id={id} className="border-t border-sky-200 bg-sky-50/60">
      {outlets.map((outlet) => (
        <li key={outlet.key} className="border-t border-sky-100 first:border-t-0">
          <OutletRow outlet={outlet} includeCity={includeCity} />
        </li>
      ))}
    </ul>
  );
}

function OutletRow({
  outlet,
  includeCity,
}: {
  outlet: VisitedOutlet;
  includeCity?: boolean;
}) {
  const { title, place } = formatVisitedOutlet(outlet, { includeCity });

  return (
    <Link
      href={`/passport/gyms/${outlet.slug}`}
      className="flex min-h-16 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-sky-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold leading-tight">{title}</span>
        <span className="flex items-center gap-1 truncate text-sm text-ink-soft">
          <PlaceKindMark kind={outlet.place_kind} />
          {place ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{place}</span>
            </>
          ) : null}
        </span>
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

function outletSummary(outlets: number, visits: number) {
  const outletLabel = `${outlets} ${outlets === 1 ? "outlet" : "outlets"}`;
  const visitLabel = `${visits} ${visits === 1 ? "visit" : "visits"}`;
  return `${outletLabel} · ${visitLabel}`;
}

function usePrefixedId(key: string) {
  const base = useId();
  return `${base}-${key.replace(/[^a-z0-9]+/gi, "-")}`;
}
