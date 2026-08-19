"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVisitAction, type ActionResult } from "@/app/actions";
import { citiesForCountry } from "@/lib/cities";
import { COUNTRY_NAMES } from "@/lib/countries";
import { todayISO } from "@/lib/dates";
import { formatGrade, isHouseSystem, vEquivFor } from "@/lib/grades";
import {
  catalogCities,
  catalogCountries,
  catalogGymSubtitle,
  defaultScaleFor,
  findKnownGym,
  gymsInCity,
  gymsInCountry,
  hasMultipleOutlets,
  mergeOutlets,
  sameCountry,
  searchKnownGyms,
  skipsCityStep,
  visibleOutlets,
} from "@/lib/gymCatalog";
import { gymSlug } from "@/lib/gyms";
import type {
  CatalogGym,
  GradeScale,
  GradeSystem,
  GymGroup,
  GymOutlet,
} from "@/lib/types";
import { ActionButtonLabel } from "./ActionButtonLabel";
import { CloseIcon, MountainIcon } from "./icons";
import { GradePicker } from "./GradePicker";
import { usePassport } from "./PassportContext";
import { ScaleSetup } from "./ScaleSetup";

const initial: ActionResult | null = null;
const NOTES_MAX = 400;

type Step =
  | "country"
  | "city"
  | "gym"
  | "outlet"
  | "scale"
  | "grade"
  | "date"
  | "notes";

export function LogGymSheet() {
  const router = useRouter();
  const { gyms, catalogGyms, logOpen, logPrefill, closeLog, configured } =
    usePassport();
  if (!logOpen) return null;

  return (
    <LogGymSheetInner
      gyms={gyms}
      catalogGyms={catalogGyms}
      prefill={logPrefill}
      configured={configured}
      onClose={closeLog}
      onViewGym={(slug) => {
        closeLog();
        router.push(`/passport/gyms/${slug}`);
      }}
      onHome={() => {
        closeLog();
        router.push("/passport");
      }}
    />
  );
}

function LogGymSheetInner({
  gyms,
  catalogGyms,
  prefill,
  configured,
  onClose,
  onViewGym,
  onHome,
}: {
  gyms: GymGroup[];
  catalogGyms: CatalogGym[];
  prefill: { name?: string; city?: string; country?: string; outlet?: string; existing?: boolean } | null;
  configured: boolean;
  onClose: () => void;
  onViewGym: (slug: string) => void;
  onHome: () => void;
}) {
  const [state, formAction, actionPending] = useActionState(addVisitAction, initial);
  const [isPending, startTransition] = useTransition();
  const pending = actionPending || isPending;
  const [name, setName] = useState(prefill?.name ?? "");
  const [country, setCountry] = useState(prefill?.country ?? "");
  const [city, setCity] = useState(
    prefill?.city ??
      (prefill?.country && skipsCityStep(prefill.country) ? "Singapore" : ""),
  );
  const [outlet, setOutlet] = useState(prefill?.outlet ?? "");
  const [query, setQuery] = useState(prefill?.name ?? "");
  const [system, setSystem] = useState<GradeSystem>("v");
  const [grade, setGrade] = useState("");
  const [visitedOn, setVisitedOn] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [scale, setScale] = useState<GradeScale>(() => defaultScaleFor("number", 1, 12));
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [newOutletName, setNewOutletName] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  const known = findKnownGym(name, country);
  const catalogMatch = catalogGyms.find(
    (gym) =>
      gym.name.toLowerCase() === name.trim().toLowerCase() &&
      sameCountry(gym.country, country),
  );
  const userMatch = gyms.find(
    (gym) =>
      gym.name.toLowerCase() === name.trim().toLowerCase() &&
      sameCountry(gym.country, country),
  );

  const resolvedScale: GradeScale | null =
    catalogMatch?.scale ??
    known?.scale ??
    (userMatch
      ? {
          kind: userMatch.bestGradeSystem,
          bands: [],
        }
      : null);

  const hasCatalogScale = Boolean(
    (catalogMatch?.scale && catalogMatch.scale.bands.length > 0) ||
      (known?.scale && known.scale.bands.length > 0),
  );

  const outlets: GymOutlet[] = visibleOutlets({
    name,
    outlets: mergeOutlets(
      catalogMatch?.outlets ?? [],
      known?.outlets ?? [],
      (userMatch?.outlets ?? []).map((item) => ({ name: item, city: userMatch?.city || city })),
      outlet && city ? [{ name: outlet, city }] : [],
    ),
  });

  const skipCity = skipsCityStep(country);
  const isExistingBrand = Boolean(userMatch || catalogMatch || known);
  const needsOutlet = outlets.length > 1;
  const isNewGym = !userMatch && !catalogMatch && !known;
  const needsScale = isNewGym && !hasCatalogScale;
  const needsCity = !skipCity;

  const activeScale = hasCatalogScale ? resolvedScale : needsScale ? scale : resolvedScale;
  const pickerSystem =
    activeScale && activeScale.bands.length > 0 ? activeScale.kind : system;

  const steps: Step[] = [
    "country",
    ...(needsCity ? (["city"] as const) : []),
    "gym",
    ...(needsOutlet ? (["outlet"] as const) : []),
    ...(needsScale ? (["scale"] as const) : []),
    "grade",
    "date",
    "notes",
  ];

  const [step, setStep] = useState<Step>(() => {
    if (prefill?.existing) return needsOutlet ? "outlet" : "grade";
    return "country";
  });
  const stepIndex = Math.max(0, steps.indexOf(step));

  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function applyGym(choice: { name: string; country: string; city?: string; outlets?: GymOutlet[] }) {
    const locations = visibleOutlets({ name: choice.name, outlets: choice.outlets ?? [] });
    setName(choice.name);
    setQuery(choice.name);
    setCountry(choice.country);
    if (skipsCityStep(choice.country) && locations.length !== 1) {
      setCity("Singapore");
    }
    if (locations.length === 1) {
      setOutlet(locations[0].name);
      setCity(locations[0].city);
    } else if (choice.city && !skipsCityStep(choice.country)) {
      setCity(choice.city);
    } else {
      setOutlet("");
    }
    setGrade("");
  }

  function goNext() {
    if (step === "country") {
      if (!country.trim()) return;
      if (skipsCityStep(country)) {
        setCity((current) => current.trim() || "Singapore");
        setStep("gym");
      } else {
        setStep("city");
      }
      return;
    }
    if (step === "city") {
      if (!city.trim()) return;
      setStep("gym");
      return;
    }
    if (step === "gym") {
      if (!name.trim()) return;
      if (skipsCityStep(country) && !city.trim()) setCity("Singapore");
      if (isExistingBrand) {
        if (outlets.length === 1 && !outlet.trim()) {
          setOutlet(outlets[0].name);
          setCity(outlets[0].city);
        } else if (outlet.trim()) {
          const match = outlets.find(
            (item) => item.name.toLowerCase() === outlet.trim().toLowerCase(),
          );
          if (match) setCity(match.city);
        }
        // Optional outlet on this step can skip the dedicated picker.
        if (needsOutlet && !outlet.trim()) setStep("outlet");
        else if (needsScale) setStep("scale");
        else setStep("grade");
      } else if (!skipsCityStep(country) && !city.trim()) {
        setStep("city");
      } else {
        if (!outlet.trim()) setOutlet(city.trim() || country.trim());
        setStep(needsScale ? "scale" : "grade");
      }
      return;
    }
    if (step === "outlet") {
      if (!outlet.trim()) return;
      const match = outlets.find((item) => item.name === outlet);
      if (match) setCity(match.city);
      else if (skipsCityStep(country) && !city.trim()) setCity("Singapore");
      setStep(needsScale ? "scale" : "grade");
      return;
    }
    if (step === "scale") {
      if (isHouseSystem(scale.kind) && (scale.bands.length < 1 || !chartFile)) return;
      setSystem(scale.kind);
      setStep("grade");
      return;
    }
    if (step === "grade") {
      if (!grade) return;
      setStep("date");
      return;
    }
    if (step === "date") setStep("notes");
  }

  function goBack() {
    if (step === steps[0]) {
      onClose();
      return;
    }
    const idx = steps.indexOf(step);
    const prev = steps[Math.max(0, idx - 1)] ?? "country";
    // Selecting a gym fills the name field and advances; clear it when returning
    // so the full country/city list is visible again.
    if (prev === "gym") {
      setName("");
      setQuery("");
      setOutlet("");
    }
    setStep(prev);
  }

  const canNext =
    (step === "country" && country.trim().length > 0) ||
    (step === "city" && city.trim().length > 0) ||
    (step === "gym" && name.trim().length > 0) ||
    (step === "outlet" && outlet.trim()) ||
    (step === "scale" &&
      (!isHouseSystem(scale.kind) || (scale.bands.length > 0 && Boolean(chartFile)))) ||
    (step === "grade" && Boolean(grade)) ||
    step === "date";

  if (state?.ok) {
    const slug = gymSlug(name, country);
    return (
      <Overlay onClose={onHome}>
        <SuccessState
          name={name}
          place={[outlet || city, country].filter(Boolean).join(" · ")}
          gradeLabel={formatGrade(pickerSystem, grade)}
          date={visitedOn}
          onViewGym={() => onViewGym(slug)}
          onHome={onHome}
        />
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-title"
        className="passport-sheet-in flex max-h-[min(92dvh,760px)] w-full max-w-[480px] flex-col rounded-t-[1.6rem] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_18px_50px_rgba(27,58,82,0.18)] sm:rounded-[1.6rem]"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-pass-line" />
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-pass-muted">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <h2 id="log-title" className="passport-mark text-2xl text-pass-navy">
              {titleFor(step)}
            </h2>
            {step !== "country" && (name || country) ? (
              <p className="mt-1 text-sm text-pass-muted">
                {[name, outlet || (!skipCity ? city : ""), country]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-full bg-pass-soft text-pass-muted"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <ol className="mb-4 flex gap-1.5" aria-hidden>
          {steps.map((item, index) => (
            <li
              key={item}
              className={`h-1 flex-1 rounded-full ${
                index <= stepIndex ? "bg-pass-primary" : "bg-pass-line"
              }`}
            />
          ))}
        </ol>

        <div className="min-h-0 flex-1 overflow-y-auto pb-3">
          {step === "country" && (
            <CountryStep
              country={country}
              catalogGyms={catalogGyms}
              onChange={(value) => {
                setCountry(value);
                setName("");
                setQuery("");
                setOutlet("");
                if (skipsCityStep(value)) setCity("Singapore");
                else setCity("");
              }}
              onPick={(value) => {
                setCountry(value);
                setName("");
                setQuery("");
                setOutlet("");
                if (skipsCityStep(value)) {
                  setCity("Singapore");
                  setStep("gym");
                } else {
                  setCity("");
                  setStep("city");
                }
              }}
              onNext={goNext}
            />
          )}

          {step === "city" && (
            <CityStep
              city={city}
              country={country}
              catalogGyms={catalogGyms}
              gyms={gyms}
              onCity={setCity}
              onPick={(value) => {
                setCity(value);
                setStep("gym");
              }}
              onNext={goNext}
            />
          )}

          {step === "gym" && (
            <GymStep
              query={query}
              outlet={outlet}
              country={country}
              city={skipCity ? "" : city}
              gyms={gyms}
              catalogGyms={catalogGyms}
              onQuery={(value) => {
                setQuery(value);
                setName(value);
              }}
              onOutlet={setOutlet}
              onSelectUser={(gym) => {
                const catalog = catalogGyms.find(
                  (item) =>
                    item.name.toLowerCase() === gym.name.toLowerCase() &&
                    sameCountry(item.country, gym.country),
                );
                applyGym(
                  catalog ?? {
                    name: gym.name,
                    country: gym.country,
                    city: gym.city,
                    outlets: gym.outlets.map((item) => ({ name: item, city: gym.city })),
                  },
                );
                if (
                  hasMultipleOutlets(
                    catalog ?? {
                      name: gym.name,
                      outlets: gym.outlets.map((item) => ({ name: item, city: gym.city })),
                    },
                  )
                ) {
                  setStep("outlet");
                } else setStep("grade");
              }}
              onSelectCatalog={(gym) => {
                applyGym(gym);
                if (hasMultipleOutlets(gym)) setStep("outlet");
                else setStep("grade");
              }}
              onNext={goNext}
            />
          )}

          {step === "outlet" && (
            <OutletStep
              outlets={outlets}
              selected={outlet}
              newName={newOutletName}
              onSelect={(item) => {
                setOutlet(item.name);
                setCity(item.city);
              }}
              onSelectNew={() => {
                setOutlet("");
                setNewOutletName("");
              }}
              onNewName={setNewOutletName}
              onAddNew={() => {
                const label = newOutletName.trim();
                if (!label) return;
                setOutlet(label);
                setNewOutletName("");
              }}
            />
          )}

          {step === "scale" && (
            <ScaleSetup
              scale={scale}
              chartFile={chartFile}
              onChange={(next) => {
                setScale(next);
                setSystem(next.kind);
                setGrade("");
              }}
              onChart={setChartFile}
            />
          )}

          {step === "grade" && (
            <GradePicker
              system={pickerSystem}
              grade={grade}
              scale={activeScale && activeScale.bands.length > 0 ? activeScale : null}
              allowSystemChange={!hasCatalogScale}
              onSystem={(next) => {
                setSystem(next);
                setGrade("");
              }}
              onGrade={setGrade}
            />
          )}

          {step === "date" && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Visited on</span>
              <input
                type="date"
                value={visitedOn}
                onChange={(e) => setVisitedOn(e.target.value)}
                className="passport-field"
                required
              />
            </label>
          )}

          {step === "notes" && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">
                Notes <span className="font-medium text-pass-muted">(optional)</span>
              </span>
              <textarea
                value={notes}
                maxLength={NOTES_MAX}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="That blue slab was harder than it looked..."
                className="passport-field"
              />
              <p className="mt-1.5 text-right text-xs text-pass-muted">
                {notes.length}/{NOTES_MAX}
              </p>
            </label>
          )}

          {state?.error && (
            <p role="alert" className="mt-3 rounded-xl bg-[#ffe8e8] px-3 py-2 text-sm text-[#8a2f2f]">
              {state.error}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={goBack}
            disabled={pending}
            className="passport-btn-ghost min-w-[5.5rem]"
          >
            {step === steps[0] ? "Cancel" : "Back"}
          </button>
          {step === "notes" ? (
            <button
              type="button"
              disabled={
                pending ||
                !configured ||
                !name ||
                !country ||
                !grade ||
                !(city.trim() || skipCity)
              }
              aria-busy={pending}
              onClick={() => {
                if (pending) return;
                const data = new FormData();
                data.set("gym_name", name.trim());
                data.set("city", (city.trim() || (skipCity ? "Singapore" : "")).trim());
                data.set("country", country.trim());
                const outletValue = (outlet || city).trim();
                data.set("outlet", outletValue);
                if (catalogMatch?.id) {
                  data.set("gym_id", catalogMatch.id);
                  const matchedOutlet = catalogMatch.outlets.find(
                    (item) => item.name.toLowerCase() === outletValue.toLowerCase(),
                  );
                  if (matchedOutlet?.id) data.set("outlet_id", matchedOutlet.id);
                }
                data.set("grade_system", pickerSystem);
                data.set("highest_grade", grade);
                data.set("v_equiv", vEquivFor(pickerSystem, grade, activeScale) ?? "");
                data.set("visited_on", visitedOn);
                data.set("notes", notes);
                data.set("is_new_gym", isNewGym ? "1" : "0");
                data.set("has_catalog_scale", hasCatalogScale ? "1" : "0");
                if (needsScale) data.set("scale_json", JSON.stringify(scale));
                if (chartFile) data.set("grade_chart", chartFile);
                startTransition(() => {
                  formAction(data);
                });
              }}
              className="passport-btn flex-1"
            >
              <ActionButtonLabel pending={pending} idle="Add stamp" busy="Saving…" />
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="passport-btn flex-1"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#1b3a52]/35"
        onClick={onClose}
      />
      <div className="relative w-full sm:px-3">{children}</div>
    </div>
  );
}

function titleFor(step: Step) {
  switch (step) {
    case "country":
      return "Which country?";
    case "city":
      return "Which city?";
    case "gym":
      return "Which gym?";
    case "outlet":
      return "Which outlet?";
    case "scale":
      return "How does it grade?";
    case "grade":
      return "Highest grade";
    case "date":
      return "Visited on";
    case "notes":
      return "Anything to remember?";
  }
}

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(trimmed);
  }
  return ordered;
}

function GymStep({
  query,
  outlet,
  country,
  city,
  gyms,
  catalogGyms,
  onQuery,
  onOutlet,
  onSelectUser,
  onSelectCatalog,
  onNext,
}: {
  query: string;
  outlet: string;
  country: string;
  city: string;
  gyms: GymGroup[];
  catalogGyms: CatalogGym[];
  onQuery: (value: string) => void;
  onOutlet: (value: string) => void;
  onSelectUser: (gym: GymGroup) => void;
  onSelectCatalog: (gym: CatalogGym) => void;
  onNext: () => void;
}) {
  const q = query.trim().toLowerCase();
  const inCountry = gyms.filter((gym) => sameCountry(gym.country, country));
  const recent = (q
    ? inCountry.filter((gym) =>
        `${gym.name} ${gym.outlets.join(" ")} ${gym.country}`.toLowerCase().includes(q),
      )
    : inCountry
  ).slice(0, 5);
  const filters = { country, city: city || undefined };
  const known = searchKnownGyms(query, catalogGyms, filters).filter(
    (gym) => !recent.some((item) => item.name.toLowerCase() === gym.name.toLowerCase()),
  );
  const scopedCatalog = city
    ? gymsInCity(catalogGyms, country, city)
    : gymsInCountry(catalogGyms, country);
  const extra = scopedCatalog.filter(
    (gym) =>
      (!q || gym.name.toLowerCase().includes(q)) &&
      !recent.some((item) => item.name.toLowerCase() === gym.name.toLowerCase()) &&
      !known.some((item) => item.name.toLowerCase() === gym.name.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Gym name</span>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onNext();
            }
          }}
          placeholder="Boulder Planet"
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="next"
          className="passport-field"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">
          Outlet <span className="font-medium text-pass-muted">(optional)</span>
        </span>
        <input
          value={outlet}
          onChange={(e) => onOutlet(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onNext();
            }
          }}
          placeholder="Leave blank if only one location"
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="next"
          className="passport-field"
        />
      </label>
      {recent.length > 0 && (
        <ChoiceList
          label={q ? "Your gyms" : "Recent gyms"}
          items={recent.map((gym) => {
            const places = gym.outlets.filter(
              (item) => item.toLowerCase() !== gym.name.toLowerCase(),
            );
            return {
              key: gym.slug,
              title: gym.name,
              subtitle: places.length > 1 ? places.join(" · ") : "",
              meta: `${gym.visitCount} ${gym.visitCount === 1 ? "visit" : "visits"}`,
              onClick: () => onSelectUser(gym),
            };
          })}
        />
      )}
      {known.length > 0 && (
        <ChoiceList
          label="Known gyms"
          items={known.map((gym) => ({
            key: `${gym.name}-${gym.country}`,
            title: gym.name,
            subtitle: catalogGymSubtitle(gym),
            meta: gym.scale?.kind === "color" ? "Colours" : gym.scale?.kind === "number" ? "Numbers" : undefined,
            onClick: () => onSelectCatalog(gym),
          }))}
        />
      )}
      {extra.length > 0 && (
        <ChoiceList
          label="Catalog"
          items={extra.map((gym) => ({
            key: `cat-${gym.name}-${gym.country}`,
            title: gym.name,
            subtitle: catalogGymSubtitle(gym),
            onClick: () => onSelectCatalog(gym),
          }))}
        />
      )}
      {query.trim() && (
        <p className="text-sm text-pass-muted">
          New gym? Continue to add{" "}
          <span className="font-semibold text-pass-navy">
            {[query.trim(), outlet.trim()].filter(Boolean).join(" · ")}
          </span>
          .
        </p>
      )}
    </div>
  );
}

function ChoiceList({
  label,
  items,
}: {
  label: string;
  items: { key: string; title: string; subtitle?: string; meta?: string; onClick: () => void }[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-pass-muted">
        {label}
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={item.onClick}
              className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-pass-line bg-pass-soft px-3 py-2 text-left"
            >
              <span>
                <span className="block font-semibold leading-tight">{item.title}</span>
                {item.subtitle ? (
                  <span className="text-sm text-pass-muted">{item.subtitle}</span>
                ) : null}
              </span>
              {item.meta ? (
                <span className="text-xs font-semibold text-pass-primary">{item.meta}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SearchSelect({
  label,
  value,
  options,
  placeholder,
  emptyMessage = "No matches",
  onSelect,
  onOpenChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  emptyMessage?: string;
  onSelect: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const showClear = query.length > 0 || value.length > 0;

  function setOpenState(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        onOpenChange?.(false);
        setQuery(value);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [value, onOpenChange]);

  const filtered = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    const starts = options.filter((item) => item.toLowerCase().startsWith(q));
    const contains = options.filter(
      (item) =>
        !item.toLowerCase().startsWith(q) && item.toLowerCase().includes(q),
    );
    return [...starts, ...contains];
  })();

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  function commit(item: string) {
    onSelect(item);
    setQuery(item);
    setOpenState(false);
    inputRef.current?.blur();
  }

  function clear() {
    setQuery("");
    onSelect("");
    setOpenState(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">{label}</span>
        <span className="relative block">
          <input
            ref={inputRef}
            value={query}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && filtered[highlight] ? `${listId}-${highlight}` : undefined
            }
            autoComplete="off"
            autoCapitalize="words"
            placeholder={placeholder}
            className={`passport-field${showClear ? " passport-field-clearable" : ""}`}
            onFocus={() => setOpenState(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenState(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpenState(true);
                setHighlight((index) =>
                  filtered.length === 0 ? 0 : Math.min(index + 1, filtered.length - 1),
                );
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setOpenState(true);
                setHighlight((index) => Math.max(index - 1, 0));
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                const exact = options.find(
                  (item) => item.toLowerCase() === query.trim().toLowerCase(),
                );
                const choice = exact ?? filtered[highlight];
                if (choice) commit(choice);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setOpenState(false);
                setQuery(value);
              }
            }}
          />
          {showClear ? (
            <button
              type="button"
              aria-label={`Clear ${label.toLowerCase()}`}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-pass-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clear}
            >
              <CloseIcon className="size-4" />
            </button>
          ) : null}
        </span>
      </label>
      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="mt-2 max-h-[min(45dvh,24rem)] w-full overflow-y-auto rounded-2xl border border-pass-line bg-white py-1.5 shadow-[0_12px_28px_rgba(27,58,82,0.12)]"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-pass-muted">{emptyMessage}</li>
          ) : (
            filtered.map((item, index) => {
              const active = index === highlight;
              return (
                <li key={item} role="option" aria-selected={active} id={`${listId}-${index}`}>
                  <button
                    type="button"
                    className={`flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold ${
                      active ? "bg-[#e7f4fb] text-pass-navy" : "text-pass-navy"
                    }`}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(item)}
                  >
                    {item}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

function CountryStep({
  country,
  catalogGyms,
  onChange,
  onPick,
}: {
  country: string;
  catalogGyms: CatalogGym[];
  onChange: (value: string) => void;
  onPick: (value: string) => void;
  onNext: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const featured = catalogCountries(catalogGyms);
  const options = uniqueNames([
    ...featured,
    ...COUNTRY_NAMES,
    country,
  ]).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-3">
      <SearchSelect
        label="Country"
        value={country}
        options={options}
        placeholder="Search countries"
        emptyMessage="No countries match that search"
        onSelect={onChange}
        onOpenChange={setSearchOpen}
      />
      {!searchOpen && featured.length > 0 ? (
        <ChoiceList
          label="With known gyms"
          items={featured.map((item) => ({
            key: item,
            title: item,
            onClick: () => onPick(item),
          }))}
        />
      ) : null}
    </div>
  );
}

function CityStep({
  city,
  country,
  catalogGyms,
  gyms,
  onCity,
  onPick,
}: {
  city: string;
  country: string;
  catalogGyms: CatalogGym[];
  gyms: GymGroup[];
  onCity: (value: string) => void;
  onPick: (value: string) => void;
  onNext: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const gymCities = [
    ...catalogCities(catalogGyms, country),
    ...gyms
      .filter((gym) => sameCountry(gym.country, country))
      .map((gym) => gym.city),
  ];
  const cities = citiesForCountry(country, [...gymCities, city]).sort((a, b) =>
    a.localeCompare(b),
  );
  const withGyms = uniqueNames(gymCities).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-3">
      <SearchSelect
        label="City"
        value={city}
        options={cities}
        placeholder="Search cities"
        emptyMessage="No cities match that search"
        onSelect={onCity}
        onOpenChange={setSearchOpen}
      />
      {searchOpen ? null : withGyms.length > 0 ? (
        <ChoiceList
          label="Cities with gyms"
          items={withGyms.map((item) => ({
            key: item,
            title: item,
            subtitle: country,
            onClick: () => onPick(item),
          }))}
        />
      ) : (
        <p className="text-sm text-pass-muted">
          Search for a city, then continue to choose or add the gym.
        </p>
      )}
    </div>
  );
}

function OutletStep({
  outlets,
  selected,
  newName,
  onSelect,
  onSelectNew,
  onNewName,
  onAddNew,
}: {
  outlets: GymOutlet[];
  selected: string;
  newName: string;
  onSelect: (outlet: GymOutlet) => void;
  onSelectNew: () => void;
  onNewName: (value: string) => void;
  onAddNew: () => void;
}) {
  const [addingNew, setAddingNew] = useState(false);
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingNew) newInputRef.current?.focus();
  }, [addingNew]);

  const chipClass = (active: boolean) =>
    `min-h-11 rounded-full border px-4 text-sm font-semibold ${
      active
        ? "border-pass-primary bg-[#e7f4fb] text-pass-navy"
        : "border-pass-line bg-white text-pass-navy"
    }`;

  function handleSelectOutlet(item: GymOutlet) {
    setAddingNew(false);
    onSelect(item);
  }

  function handleSelectNew() {
    setAddingNew(true);
    onSelectNew();
  }

  function handleAddNew() {
    const label = newName.trim();
    if (!label) return;
    onAddNew();
    setAddingNew(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {outlets.map((item) => {
          const active = !addingNew && item.name === selected;
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => handleSelectOutlet(item)}
              className={chipClass(active)}
            >
              {item.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={handleSelectNew}
          aria-pressed={addingNew}
          className={chipClass(addingNew)}
        >
          + New outlet
        </button>
      </div>

      {addingNew ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">New outlet</span>
          <div className="flex gap-2">
            <input
              ref={newInputRef}
              value={newName}
              onChange={(e) => onNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddNew();
                }
              }}
              placeholder="Outlet name"
              className="passport-field"
            />
            <button
              type="button"
              onClick={handleAddNew}
              className="min-h-12 shrink-0 rounded-full bg-pass-soft px-4 text-sm font-semibold"
            >
              Add
            </button>
          </div>
        </label>
      ) : null}
    </div>
  );
}

function SuccessState({
  name,
  place,
  gradeLabel,
  date,
  onViewGym,
  onHome,
}: {
  name: string;
  place: string;
  gradeLabel: string;
  date: string;
  onViewGym: () => void;
  onHome: () => void;
}) {
  const prettyDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-title"
      className="passport-sheet-in mx-auto flex w-full max-w-[480px] flex-col items-center rounded-t-[1.6rem] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 text-center shadow-[0_18px_50px_rgba(27,58,82,0.18)] sm:rounded-[1.6rem]"
    >
      <div className="stamp-press text-pass-primary">
        <div className="relative flex size-36 items-center justify-center rounded-full border-[3px] border-dashed border-current">
          <div className="flex size-[7.4rem] flex-col items-center justify-center rounded-full border-2 border-current">
            <MountainIcon className="h-8 w-12" />
            <p className="mt-1 text-[0.62rem] font-bold tracking-[0.18em]">STAMP ADDED</p>
            <p className="text-[0.65rem] font-semibold tracking-wide">{prettyDate}</p>
          </div>
        </div>
      </div>
      <h2 id="success-title" className="passport-mark mt-5 text-3xl text-pass-navy">
        Stamp added ✦
      </h2>
      <p className="mt-3 text-lg font-semibold leading-tight">{name}</p>
      <p className="text-sm text-pass-muted">{place}</p>
      <p className="mt-2 text-xl font-semibold text-pass-navy">{gradeLabel}</p>
      <p className="mt-1 text-sm text-pass-muted">Added to your passport</p>
      <button type="button" onClick={onViewGym} className="passport-btn mt-6">
        View gym
      </button>
      <button type="button" onClick={onHome} className="passport-btn-ghost mt-1">
        Back to home
      </button>
    </div>
  );
}
