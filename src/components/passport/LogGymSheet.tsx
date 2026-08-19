"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVisitAction, type ActionResult } from "@/app/actions";
import { citiesForCountry } from "@/lib/cities";
import {
  CLIMBING_TYPES,
  CLIMBING_TYPE_LABELS,
  DEFAULT_CLIMBING_TYPES,
  formatClimbingType,
  normalizeClimbingTypes,
  type ClimbingType,
} from "@/lib/climbingTypes";
import { COUNTRY_NAMES } from "@/lib/countries";
import { todayISO } from "@/lib/dates";
import { displayGrade, isHouseSystem, vEquivFor } from "@/lib/grades";
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
import {
  PLACE_KINDS,
  PLACE_KIND_HELP,
  PLACE_KIND_LABELS,
  defaultGradeSystemForPlaceKind,
  normalizePlaceKind,
  type PlaceKind,
} from "@/lib/placeKinds";
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
import { uploadVisitMediaFile, VisitMediaFields } from "./VisitMediaFields";

const initial: ActionResult | null = null;
const NOTES_MAX = 400;

type Step =
  | "country"
  | "city"
  | "gym"
  | "outlet"
  | "kind"
  | "offer"
  | "climb"
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
  const [scaleDraft, setScaleDraft] = useState<GradeScale>(() => defaultScaleFor("number", 1, 12));
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [visitPhoto, setVisitPhoto] = useState<File | null>(null);
  const [visitVideo, setVisitVideo] = useState<File | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [newOutletName, setNewOutletName] = useState("");
  const [gymOfferTypes, setGymOfferTypes] = useState<ClimbingType[]>(DEFAULT_CLIMBING_TYPES);
  const [climbType, setClimbType] = useState<ClimbingType>("bouldering");
  const [placeKind, setPlaceKind] = useState<PlaceKind>("gym");
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevStepRef = useRef<Step | null>(null);
  const pending = actionPending || isPending || mediaUploading;

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
  const catalogTypes = normalizeClimbingTypes(
    catalogMatch?.climbing_types ?? known?.climbing_types,
  );
  const offeredTypes = isNewGym
    ? gymOfferTypes
    : catalogTypes.length > 0
      ? catalogTypes
      : DEFAULT_CLIMBING_TYPES;
  const needsKind = isNewGym;
  const needsOffer = isNewGym;
  const needsClimb = offeredTypes.length > 1;

  const resolvedPlaceKind = needsKind
    ? placeKind
    : normalizePlaceKind(
        catalogMatch?.place_kind ?? known?.place_kind ?? userMatch?.place_kind,
      );

  const activeScale = hasCatalogScale ? resolvedScale : needsScale ? scale : resolvedScale;
  const pickerSystem =
    activeScale && activeScale.bands.length > 0 ? activeScale.kind : system;

  const steps: Step[] = [
    "country",
    ...(needsCity ? (["city"] as const) : []),
    "gym",
    ...(needsOutlet ? (["outlet"] as const) : []),
    ...(needsKind ? (["kind"] as const) : []),
    ...(needsOffer ? (["offer"] as const) : []),
    ...(needsClimb ? (["climb"] as const) : []),
    ...(needsScale ? (["scale"] as const) : []),
    "grade",
    "date",
    "notes",
  ];

  const [step, setStep] = useState<Step>(() => {
    if (prefill?.existing) {
      if (needsOutlet) return "outlet";
      if (needsClimb) return "climb";
      return "grade";
    }
    return "country";
  });
  const stepIndex = Math.max(0, steps.indexOf(step));

  function afterLocationStep(): Step {
    if (needsKind) return "kind";
    if (needsOffer) return "offer";
    if (needsClimb) return "climb";
    if (needsScale) return "scale";
    return "grade";
  }

  function afterKindStep(): Step {
    if (needsOffer) return "offer";
    if (needsClimb) return "climb";
    if (needsScale) return "scale";
    return "grade";
  }

  function afterOfferStep(): Step {
    if (gymOfferTypes.length > 1) return "climb";
    if (needsScale) return "scale";
    return "grade";
  }

  function afterClimbStep(): Step {
    if (needsScale) return "scale";
    return "grade";
  }

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

  // Seed the editable draft when entering the scale step; commit only on Next.
  useEffect(() => {
    if (step === "scale" && prevStepRef.current !== "scale") {
      setScaleDraft(scale);
    }
    prevStepRef.current = step;
  }, [step, scale]);

  useEffect(() => {
    const types = offeredTypes;
    if (types.length === 1) {
      setClimbType(types[0]);
      return;
    }
    setClimbType((current) => (types.includes(current) ? current : types[0] ?? "bouldering"));
  }, [offeredTypes.join(",")]);

  function applyGym(choice: {
    name: string;
    country: string;
    city?: string;
    outlets?: GymOutlet[];
    climbing_types?: ClimbingType[];
    place_kind?: PlaceKind;
  }) {
    const locations = visibleOutlets({ name: choice.name, outlets: choice.outlets ?? [] });
    const types =
      normalizeClimbingTypes(choice.climbing_types).length > 0
        ? normalizeClimbingTypes(choice.climbing_types)
        : DEFAULT_CLIMBING_TYPES;
    setName(choice.name);
    setQuery(choice.name);
    setCountry(choice.country);
    setPlaceKind(normalizePlaceKind(choice.place_kind));
    setGymOfferTypes(types);
    setClimbType(types[0]);
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
        else setStep(afterLocationStep());
      } else if (!skipsCityStep(country) && !city.trim()) {
        setStep("city");
      } else {
        if (!outlet.trim()) setOutlet(city.trim() || country.trim());
        setStep(afterLocationStep());
      }
      return;
    }
    if (step === "outlet") {
      if (!outlet.trim()) return;
      const match = outlets.find((item) => item.name === outlet);
      if (match) setCity(match.city);
      else if (skipsCityStep(country) && !city.trim()) setCity("Singapore");
      setStep(afterLocationStep());
      return;
    }
    if (step === "kind") {
      setStep(afterKindStep());
      return;
    }
    if (step === "offer") {
      if (gymOfferTypes.length < 1) return;
      if (gymOfferTypes.length === 1) setClimbType(gymOfferTypes[0]);
      setStep(afterOfferStep());
      return;
    }
    if (step === "climb") {
      if (!climbType || !offeredTypes.includes(climbType)) return;
      setStep(afterClimbStep());
      return;
    }
    if (step === "scale") {
      if (isHouseSystem(scaleDraft.kind) && scaleDraft.bands.length < 1) return;
      setScale(scaleDraft);
      setSystem(scaleDraft.kind);
      setGrade("");
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
    (step === "outlet" && Boolean(outlet.trim())) ||
    (step === "kind" && Boolean(placeKind)) ||
    (step === "offer" && gymOfferTypes.length > 0) ||
    (step === "climb" && Boolean(climbType) && offeredTypes.includes(climbType)) ||
    (step === "scale" && (!isHouseSystem(scaleDraft.kind) || scaleDraft.bands.length > 0)) ||
    (step === "grade" && Boolean(grade)) ||
    step === "date";

  if (state?.ok) {
    const slug = gymSlug(name, country);
    return (
      <Overlay onClose={onHome}>
        <SuccessState
          name={name}
          place={[outlet || city, country].filter(Boolean).join(" · ")}
          climbLabel={formatClimbingType(climbType)}
          gradeLabel={
            displayGrade(pickerSystem, grade, vEquivFor(pickerSystem, grade, activeScale)).grade
          }
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
                const choice =
                  catalog ?? {
                    name: gym.name,
                    country: gym.country,
                    city: gym.city,
                    place_kind: gym.place_kind,
                    outlets: gym.outlets.map((item) => ({ name: item, city: gym.city })),
                    climbing_types: DEFAULT_CLIMBING_TYPES,
                  };
                applyGym(choice);
                if (
                  hasMultipleOutlets(
                    catalog ?? {
                      name: gym.name,
                      outlets: gym.outlets.map((item) => ({ name: item, city: gym.city })),
                    },
                  )
                ) {
                  setStep("outlet");
                } else if (normalizeClimbingTypes(choice.climbing_types).length > 1) {
                  setStep("climb");
                } else if (needsScale) {
                  setStep("scale");
                } else {
                  setStep("grade");
                }
              }}
              onSelectCatalog={(gym) => {
                applyGym(gym);
                if (hasMultipleOutlets(gym)) setStep("outlet");
                else if (normalizeClimbingTypes(gym.climbing_types).length > 1) {
                  setStep("climb");
                } else if (needsScale) setStep("scale");
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

          {step === "kind" && (
            <PlaceKindStep
              selected={placeKind}
              onSelect={(kind) => {
                setPlaceKind(kind);
                const gradeSystem = defaultGradeSystemForPlaceKind(kind);
                const nextScale =
                  gradeSystem === "number"
                    ? defaultScaleFor("number", 1, 12)
                    : defaultScaleFor(gradeSystem);
                setScale(nextScale);
                setScaleDraft(nextScale);
                setSystem(gradeSystem);
                setGrade("");
              }}
            />
          )}

          {step === "offer" && (
            <ClimbOfferStep
              selected={gymOfferTypes}
              onToggle={(type) => {
                setGymOfferTypes((current) => {
                  const has = current.includes(type);
                  const next = has
                    ? current.filter((item) => item !== type)
                    : normalizeClimbingTypes([...current, type]);
                  return next.length > 0 ? next : current;
                });
              }}
            />
          )}

          {step === "climb" && (
            <ClimbTypeStep
              options={offeredTypes}
              selected={climbType}
              onSelect={setClimbType}
            />
          )}

          {step === "scale" && (
            <ScaleSetup
              scale={scaleDraft}
              chartFile={chartFile}
              onChange={setScaleDraft}
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
            <div className="space-y-4">
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
              <VisitMediaFields
                photo={visitPhoto}
                video={visitVideo}
                onPhoto={setVisitPhoto}
                onVideo={setVisitVideo}
                busy={pending}
              />
            </div>
          )}

          {state?.error && (
            <p role="alert" className="mt-3 rounded-xl bg-[#ffe8e8] px-3 py-2 text-sm text-[#8a2f2f]">
              {state.error}
            </p>
          )}
          {mediaError ? (
            <p role="alert" className="mt-3 rounded-xl bg-[#ffe8e8] px-3 py-2 text-sm text-[#8a2f2f]">
              {mediaError}
            </p>
          ) : null}
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
                setMediaError(null);
                void (async () => {
                  setMediaUploading(true);
                  try {
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
                    data.set("climbing_type", climbType);
                    data.set("climbing_types", offeredTypes.join(","));
                    data.set("place_kind", resolvedPlaceKind);
                    data.set("v_equiv", vEquivFor(pickerSystem, grade, activeScale) ?? "");
                    data.set("visited_on", visitedOn);
                    data.set("notes", notes);
                    data.set("is_new_gym", isNewGym ? "1" : "0");
                    data.set("has_catalog_scale", hasCatalogScale ? "1" : "0");
                    if (needsScale) data.set("scale_json", JSON.stringify(scale));
                    if (chartFile) data.set("grade_chart", chartFile);
                    if (visitPhoto) {
                      data.set("photo_path", await uploadVisitMediaFile("photo", visitPhoto));
                    }
                    if (visitVideo) {
                      data.set("video_path", await uploadVisitMediaFile("video", visitVideo));
                    }
                    startTransition(() => {
                      formAction(data);
                    });
                  } catch (err) {
                    setMediaError(
                      err instanceof Error ? err.message : "Couldn't upload visit media.",
                    );
                  } finally {
                    setMediaUploading(false);
                  }
                })();
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
      return "Which place?";
    case "outlet":
      return "Which outlet?";
    case "kind":
      return "Gym or rock?";
    case "offer":
      return "What do they offer?";
    case "climb":
      return "What did you climb?";
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

function PlaceKindStep({
  selected,
  onSelect,
}: {
  selected: PlaceKind;
  onSelect: (kind: PlaceKind) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-pass-muted">
        Pick what you’re climbing on. Outdoor plastic walls still count as Gym.
      </p>
      <div className="grid gap-2">
        {PLACE_KINDS.map((kind) => {
          const active = selected === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onSelect(kind)}
              aria-pressed={active}
              className={`rounded-[1.15rem] px-4 py-3.5 text-left transition ${
                active
                  ? "bg-pass-primary text-white"
                  : "bg-pass-soft text-pass-navy"
              }`}
            >
              <span className="block text-base font-semibold">{PLACE_KIND_LABELS[kind]}</span>
              <span
                className={`mt-1 block text-sm leading-snug ${
                  active ? "text-white/85" : "text-pass-muted"
                }`}
              >
                {PLACE_KIND_HELP[kind]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClimbOfferStep({
  selected,
  onToggle,
}: {
  selected: ClimbingType[];
  onToggle: (type: ClimbingType) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-pass-muted">
        Pick every discipline this place has. If there’s only one, you won’t be asked again when
        logging.
      </p>
      <div className="grid gap-2">
        {CLIMBING_TYPES.map((type) => {
          const active = selected.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggle(type)}
              aria-pressed={active}
              className={`rounded-[1.15rem] px-4 py-3.5 text-left text-base font-semibold transition ${
                active
                  ? "bg-pass-primary text-white"
                  : "bg-pass-soft text-pass-navy"
              }`}
            >
              {CLIMBING_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClimbTypeStep({
  options,
  selected,
  onSelect,
}: {
  options: ClimbingType[];
  selected: ClimbingType;
  onSelect: (type: ClimbingType) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-pass-muted">This place offers more than one style — which was today?</p>
      <div className="grid gap-2">
        {options.map((type) => {
          const active = selected === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              aria-pressed={active}
              className={`rounded-[1.15rem] px-4 py-3.5 text-left text-base font-semibold transition ${
                active
                  ? "bg-pass-primary text-white"
                  : "bg-pass-soft text-pass-navy"
              }`}
            >
              {CLIMBING_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>
    </div>
  );
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
        <span className="mb-1.5 block text-sm font-semibold">Place name</span>
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
          label={q ? "Your places" : "Recent places"}
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
          label="Known places"
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
          New place? Continue to add{" "}
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
          label="With known places"
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
          label="Cities with places"
          items={withGyms.map((item) => ({
            key: item,
            title: item,
            subtitle: country,
            onClick: () => onPick(item),
          }))}
        />
      ) : (
        <p className="text-sm text-pass-muted">
          Search for a city, then continue to choose or add the place.
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
  climbLabel,
  gradeLabel,
  date,
  onViewGym,
  onHome,
}: {
  name: string;
  place: string;
  climbLabel: string;
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
      <p className="mt-2 text-sm font-semibold text-pass-primary">{climbLabel}</p>
      <p className="mt-1 text-xl font-semibold text-pass-navy">{gradeLabel}</p>
      <p className="mt-1 text-sm text-pass-muted">Added to your passport</p>
      <button type="button" onClick={onViewGym} className="passport-btn mt-6">
        View place
      </button>
      <button type="button" onClick={onHome} className="passport-btn-ghost mt-1">
        Back to home
      </button>
    </div>
  );
}
