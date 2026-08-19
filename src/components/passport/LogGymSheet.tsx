"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addVisitAction, type ActionResult } from "@/app/actions";
import { COUNTRY_NAMES } from "@/lib/countries";
import { todayISO } from "@/lib/dates";
import { formatGrade, isHouseSystem, vEquivFor } from "@/lib/grades";
import { defaultScaleFor, findKnownGym, mergeOutlets, searchKnownGyms } from "@/lib/gymCatalog";
import { gymSlug } from "@/lib/gyms";
import type {
  CatalogGym,
  GradeScale,
  GradeSystem,
  GymGroup,
  GymOutlet,
} from "@/lib/types";
import { CloseIcon, MountainIcon } from "./icons";
import { GradePicker } from "./GradePicker";
import { usePassport } from "./PassportContext";
import { ScaleSetup } from "./ScaleSetup";

const initial: ActionResult | null = null;
const NOTES_MAX = 400;

type Step = "gym" | "location" | "outlet" | "scale" | "grade" | "date" | "notes";

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
  const router = useRouter();
  const [state, formAction, pending] = useActionState(addVisitAction, initial);
  const [name, setName] = useState(prefill?.name ?? "");
  const [city, setCity] = useState(prefill?.city ?? "");
  const [country, setCountry] = useState(prefill?.country ?? "Singapore");
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
  const submitted = useRef(false);

  const known = findKnownGym(name, country);
  const catalogMatch = catalogGyms.find(
    (gym) =>
      gym.name.toLowerCase() === name.trim().toLowerCase() &&
      gym.country.toLowerCase() === country.trim().toLowerCase(),
  );
  const userMatch = gyms.find(
    (gym) =>
      gym.name.toLowerCase() === name.trim().toLowerCase() &&
      gym.country.toLowerCase() === country.trim().toLowerCase(),
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

  const outlets: GymOutlet[] = mergeOutlets(
    catalogMatch?.outlets ?? [],
    known?.outlets ?? [],
    (userMatch?.outlets ?? []).map((item) => ({ name: item, city: userMatch?.city || city })),
    outlet && city ? [{ name: outlet, city }] : [],
  );

  const isExistingBrand = Boolean(userMatch || catalogMatch || known);
  const needsOutlet = outlets.length > 1 || Boolean(userMatch && userMatch.outlets.length > 1);
  const isNewGym = !userMatch && !catalogMatch && !known;
  const needsScale = isNewGym && !hasCatalogScale;

  const activeScale = hasCatalogScale ? resolvedScale : needsScale ? scale : resolvedScale;
  const pickerSystem =
    activeScale && activeScale.bands.length > 0 ? activeScale.kind : system;

  const steps: Step[] = [
    "gym",
    ...(!isExistingBrand ? (["location"] as const) : []),
    ...(needsOutlet ? (["outlet"] as const) : []),
    ...(needsScale ? (["scale"] as const) : []),
    "grade",
    "date",
    "notes",
  ];

  const [step, setStep] = useState<Step>(
    prefill?.existing ? (needsOutlet ? "outlet" : "grade") : "gym",
  );
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

  useEffect(() => {
    if (state?.ok) router.refresh();
    if (state && !state.ok) submitted.current = false;
  }, [state, router]);

  function applyGym(choice: { name: string; country: string; city?: string; outlets?: GymOutlet[] }) {
    setName(choice.name);
    setQuery(choice.name);
    setCountry(choice.country);
    if (choice.outlets?.length === 1) {
      setOutlet(choice.outlets[0].name);
      setCity(choice.outlets[0].city);
    } else if (choice.city) {
      setCity(choice.city);
    }
    setGrade("");
  }

  function goNext() {
    if (step === "gym") {
      if (!name.trim()) return;
      if (!country.trim()) setCountry("Singapore");
      if (isExistingBrand) {
        if (needsOutlet) setStep("outlet");
        else if (needsScale) setStep("scale");
        else setStep("grade");
      } else {
        setStep("location");
      }
      return;
    }
    if (step === "location") {
      if (!city.trim() || !country.trim()) return;
      if (!outlet.trim()) setOutlet(city.trim());
      setStep(needsScale ? "scale" : "grade");
      return;
    }
    if (step === "outlet") {
      if (!outlet.trim()) return;
      const match = outlets.find((item) => item.name === outlet);
      if (match) setCity(match.city);
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
    if (step === "gym") {
      onClose();
      return;
    }
    const idx = steps.indexOf(step);
    setStep(steps[Math.max(0, idx - 1)] ?? "gym");
  }

  const canNext =
    (step === "gym" && name.trim().length > 0) ||
    (step === "location" && city.trim() && country.trim()) ||
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
            {step !== "gym" && name ? (
              <p className="mt-1 text-sm text-pass-muted">
                {name}
                {outlet ? ` · ${outlet}` : city ? ` · ${city}` : ""}
                {country ? ` · ${country}` : ""}
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
          {step === "gym" && (
            <GymStep
              query={query}
              gyms={gyms}
              catalogGyms={catalogGyms}
              onQuery={(value) => {
                setQuery(value);
                setName(value);
              }}
              onSelectUser={(gym) => {
                applyGym({
                  name: gym.name,
                  country: gym.country,
                  city: gym.city,
                  outlets: gym.outlets.map((item) => ({ name: item, city: gym.city })),
                });
                if (gym.outlets.length > 1) setStep("outlet");
                else setStep("grade");
              }}
              onSelectCatalog={(gym) => {
                applyGym(gym);
                if (gym.outlets.length > 1) setStep("outlet");
                else setStep("grade");
              }}
              onNext={goNext}
            />
          )}

          {step === "location" && (
            <LocationStep
              city={city}
              country={country}
              gyms={gyms}
              onCity={setCity}
              onCountry={setCountry}
              onNext={goNext}
            />
          )}

          {step === "outlet" && (
            <OutletStep
              outlets={outlets}
              selected={outlet}
              newName={newOutletName}
              city={city}
              onSelect={(item) => {
                setOutlet(item.name);
                setCity(item.city);
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
          <button type="button" onClick={goBack} className="passport-btn-ghost min-w-[5.5rem]">
            {step === "gym" ? "Cancel" : "Back"}
          </button>
          {step === "notes" ? (
            <button
              type="button"
              disabled={pending || !configured || !name || !city || !country || !grade}
              onClick={() => {
                if (pending || submitted.current) return;
                submitted.current = true;
                const data = new FormData();
                data.set("gym_name", name.trim());
                data.set("city", city.trim());
                data.set("country", country.trim());
                data.set("outlet", (outlet || city).trim());
                data.set("grade_system", pickerSystem);
                data.set("highest_grade", grade);
                data.set("v_equiv", vEquivFor(pickerSystem, grade, activeScale) ?? "");
                data.set("visited_on", visitedOn);
                data.set("notes", notes);
                data.set("is_new_gym", isNewGym ? "1" : "0");
                data.set("has_catalog_scale", hasCatalogScale ? "1" : "0");
                if (needsScale) data.set("scale_json", JSON.stringify(scale));
                if (chartFile) data.set("grade_chart", chartFile);
                formAction(data);
              }}
              className="passport-btn flex-1"
            >
              {pending ? "Saving..." : "Add stamp"}
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
    case "gym":
      return "Which gym?";
    case "location":
      return "Where was it?";
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

function GymStep({
  query,
  gyms,
  catalogGyms,
  onQuery,
  onSelectUser,
  onSelectCatalog,
  onNext,
}: {
  query: string;
  gyms: GymGroup[];
  catalogGyms: CatalogGym[];
  onQuery: (value: string) => void;
  onSelectUser: (gym: GymGroup) => void;
  onSelectCatalog: (gym: CatalogGym) => void;
  onNext: () => void;
}) {
  const q = query.trim().toLowerCase();
  const recent = (q
    ? gyms.filter((gym) =>
        `${gym.name} ${gym.outlets.join(" ")} ${gym.country}`.toLowerCase().includes(q),
      )
    : gyms
  ).slice(0, 5);
  const known = searchKnownGyms(query).filter(
    (gym) => !recent.some((item) => item.name.toLowerCase() === gym.name.toLowerCase()),
  );
  const extra = catalogGyms.filter(
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
      {recent.length > 0 && (
        <ChoiceList
          label={q ? "Your gyms" : "Recent gyms"}
          items={recent.map((gym) => ({
            key: gym.slug,
            title: gym.name,
            subtitle: gym.outlets.length > 1 ? gym.outlets.join(" · ") : `${gym.city} · ${gym.country}`,
            meta: `${gym.visitCount} ${gym.visitCount === 1 ? "visit" : "visits"}`,
            onClick: () => onSelectUser(gym),
          }))}
        />
      )}
      {known.length > 0 && (
        <ChoiceList
          label="Known gyms"
          items={known.map((gym) => ({
            key: `${gym.name}-${gym.country}`,
            title: gym.name,
            subtitle:
              gym.outlets.length > 1
                ? `${gym.outlets.map((o) => o.name).join(" · ")} · ${gym.country}`
                : gym.country,
            meta: gym.scale?.kind === "color" ? "Colours" : gym.scale?.kind === "number" ? "Numbers" : undefined,
            onClick: () => onSelectCatalog(gym),
          }))}
        />
      )}
      {extra.length > 0 && (
        <ChoiceList
          label="Catalog"
          items={extra.slice(0, 4).map((gym) => ({
            key: `cat-${gym.name}`,
            title: gym.name,
            subtitle: gym.country,
            onClick: () => onSelectCatalog(gym),
          }))}
        />
      )}
      {query.trim() && (
        <p className="text-sm text-pass-muted">
          New gym? Continue to add{" "}
          <span className="font-semibold text-pass-navy">{query.trim()}</span>.
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
  items: { key: string; title: string; subtitle: string; meta?: string; onClick: () => void }[];
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
                <span className="text-sm text-pass-muted">{item.subtitle}</span>
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

function LocationStep({
  city,
  country,
  gyms,
  onCity,
  onCountry,
  onNext,
}: {
  city: string;
  country: string;
  gyms: GymGroup[];
  onCity: (value: string) => void;
  onCountry: (value: string) => void;
  onNext: () => void;
}) {
  const cities = [...new Set(gyms.map((gym) => gym.city).filter(Boolean))];

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">City</span>
        <input
          value={city}
          onChange={(e) => onCity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onNext();
            }
          }}
          placeholder="Singapore"
          list="passport-cities"
          autoComplete="address-level2"
          className="passport-field"
        />
        <datalist id="passport-cities">
          {cities.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Country</span>
        <input
          value={country}
          onChange={(e) => onCountry(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onNext();
            }
          }}
          placeholder="Singapore"
          list="passport-countries"
          autoComplete="country-name"
          className="passport-field"
        />
        <datalist id="passport-countries">
          {COUNTRY_NAMES.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </label>
    </div>
  );
}

function OutletStep({
  outlets,
  selected,
  newName,
  city,
  onSelect,
  onNewName,
  onAddNew,
}: {
  outlets: GymOutlet[];
  selected: string;
  newName: string;
  city: string;
  onSelect: (outlet: GymOutlet) => void;
  onNewName: (value: string) => void;
  onAddNew: () => void;
}) {
  return (
    <div className="space-y-3">
      {outlets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {outlets.map((item) => {
            const active = item.name === selected;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => onSelect(item)}
                className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
                  active
                    ? "border-pass-primary bg-[#e7f4fb] text-pass-navy"
                    : "border-pass-line bg-white text-pass-navy"
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-pass-muted">
          Add an outlet name if this gym has more than one location.
        </p>
      )}
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">New outlet</span>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => onNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddNew();
              }
            }}
            placeholder={city ? `${city} branch` : "Tai Seng"}
            className="passport-field"
          />
          <button
            type="button"
            onClick={onAddNew}
            className="min-h-12 shrink-0 rounded-full bg-pass-soft px-4 text-sm font-semibold"
          >
            Add
          </button>
        </div>
      </label>
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
