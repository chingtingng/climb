"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVisitAction, type ActionResult } from "@/app/actions";
import { citiesForCountry } from "@/lib/cities";
import {
  CLIMBING_TYPES,
  DEFAULT_CLIMBING_TYPES,
  formatClimbingType,
  normalizeClimbingTypes,
  type ClimbingType,
} from "@/lib/climbingTypes";
import { COUNTRY_NAMES, countryCode } from "@/lib/countries";
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
  isUnverifiedPlace,
  mergeOutlets,
  outletsInCity,
  sameCountry,
  scaleForClimb,
  searchKnownGyms,
  skipsCityStep,
  typesForOutlet,
  visibleOutlets,
} from "@/lib/gymCatalog";
import { gymSlug } from "@/lib/gyms";
import {
  PLACE_KINDS,
  PLACE_KIND_HELP,
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
import { ReportPlaceDialog } from "./ReportPlaceDialog";
import { FlashToast } from "./FlashToast";
import { CloseIcon } from "./icons";
import { GradePicker } from "./GradePicker";
import { usePassport } from "./PassportContext";
import { ScaleSetup } from "./ScaleSetup";
import { SheetCloseButton } from "./SheetCloseButton";
import { parseVisitMediaUrl } from "@/lib/visitMedia";
import { VisitMediaFields } from "./VisitMediaFields";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ChoiceTile } from "@/components/ui/ChoiceTile";
import { Field, TextArea } from "@/components/ui/Field";
import { DisciplineMark, PlaceKindMark } from "@/components/ui/Marks";
import { Stamp, placeInk } from "@/components/ui/Stamp";
import { Stepper } from "@/components/ui/Stepper";
import { cx } from "@/components/ui/cx";

const initial: ActionResult | null = null;
const NOTES_MAX = 400;

function outletsInSelectedCity(
  gym: { name: string; outlets?: GymOutlet[] },
  city: string,
): GymOutlet[] {
  const all = visibleOutlets({ name: gym.name, outlets: gym.outlets ?? [] });
  return city.trim() ? outletsInCity({ outlets: all }, city) : all;
}

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
  const [visitMediaUrl, setVisitMediaUrl] = useState("");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [newOutletName, setNewOutletName] = useState("");
  const [gymOfferTypes, setGymOfferTypes] = useState<ClimbingType[]>(DEFAULT_CLIMBING_TYPES);
  const [climbType, setClimbType] = useState<ClimbingType>("bouldering");
  const [placeKind, setPlaceKind] = useState<PlaceKind>("gym");
  const closeRef = useRef<HTMLButtonElement>(null);
  const errorBannerRef = useRef<HTMLParagraphElement>(null);
  const prevStepRef = useRef<Step | null>(null);
  const pending = actionPending || isPending;
  const sheetError = mediaError || state?.error || null;

  useEffect(() => {
    if (!sheetError) return;
    errorBannerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sheetError]);

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

  const catalogGym = catalogMatch ?? known ?? null;
  const resolvedScale: GradeScale | null =
    scaleForClimb(catalogGym, climbType) ??
    (userMatch
      ? {
          kind: userMatch.bestGradeSystem,
          bands: [],
        }
      : null);

  const hasCatalogScale = Boolean(scaleForClimb(catalogGym, climbType)?.bands.length);

  const outlets: GymOutlet[] = outletsInSelectedCity(
    {
      name,
      outlets: mergeOutlets(
        catalogMatch?.outlets ?? [],
        known?.outlets ?? [],
        (userMatch?.outlets ?? []).map((item) => ({ name: item, city: userMatch?.city || city })),
        outlet && city ? [{ name: outlet, city }] : [],
      ),
    },
    city,
  );

  const skipCity = skipsCityStep(country);
  const isExistingBrand = Boolean(userMatch || catalogMatch || known);
  const needsOutlet = outlets.length > 1;
  const isNewGym = !userMatch && !catalogMatch && !known;
  const needsScale = isNewGym && !hasCatalogScale;
  const needsCity = !skipCity;
  const catalogTypes = typesForOutlet(
    catalogGym ?? {
      climbing_types: DEFAULT_CLIMBING_TYPES,
      outlets: [],
    },
    outlet,
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
  const selectedOutlet = outlets.find(
    (item) => item.name.trim().toLowerCase() === outlet.trim().toLowerCase(),
  );
  const unverifiedPlace =
    isUnverifiedPlace(catalogMatch?.status) || isUnverifiedPlace(selectedOutlet?.status);

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

  useEffect(() => {
    const labels = activeScale?.bands.map((band) => band.label) ?? [];
    if (labels.length === 0) return;
    if (grade && !labels.includes(grade)) setGrade("");
  }, [climbType, activeScale, grade]);

  function applyGym(choice: {
    name: string;
    country: string;
    city?: string;
    outlets?: GymOutlet[];
    climbing_types?: ClimbingType[];
    place_kind?: PlaceKind;
  }) {
    const locations = outletsInSelectedCity(
      { name: choice.name, outlets: choice.outlets ?? [] },
      city,
    );
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
    if (locations.length >= 1) {
      setOutlet(locations[0].name);
      setCity(locations[0].city);
    } else if (choice.city && !skipsCityStep(choice.country)) {
      setCity(choice.city);
    } else {
      setOutlet("");
    }
    setNewOutletName("");
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
        if (outlets.length >= 1 && !outlet.trim()) {
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
      const nextOutlet = newOutletName.trim() || outlet.trim();
      if (!nextOutlet) return;
      setOutlet(nextOutlet);
      const match = outlets.find((item) => item.name === nextOutlet);
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
    (step === "outlet" && Boolean(outlet.trim() || newOutletName.trim())) ||
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
          place={[outlet || city, countryCode(country) || country].filter(Boolean).join(" · ")}
          climbLabel={formatClimbingType(climbType)}
          climbType={climbType}
          gradeLabel={
            displayGrade(pickerSystem, grade, vEquivFor(pickerSystem, grade, activeScale)).grade
          }
          date={visitedOn}
          placeKind={resolvedPlaceKind}
          onViewGym={() => onViewGym(slug)}
          onHome={onHome}
        />
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <FlashToast message={sheetError} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-title"
        className="passport-sheet-in sheet sheet-expandable mx-auto flex max-h-[min(92dvh,760px)] w-full max-w-[var(--sheet-max)] flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="sheet-handle mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-sky-300" />
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
          <div>
            <p className="label-micro">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <h2 id="log-title" className="mark text-2xl text-ink">
              {titleFor(step)}
            </h2>
            {step !== "country" && (name || country) ? (
              <p className="mt-1 text-sm text-ink-soft">
                {[name, outlet || (!skipCity ? city : ""), countryCode(country) || country]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
          <SheetCloseButton ref={closeRef} onClick={onClose} />
        </div>

        <div className="shrink-0">
          <Stepper step={step} steps={steps} />
        </div>

        <div className="sheet-body min-h-0 flex-1 overflow-y-auto pb-3">
          <div key={step} className="sheet-step">
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
                const locations = outletsInSelectedCity(choice, city);
                if (locations.length > 1) {
                  setStep("outlet");
                } else if (typesForOutlet(choice, locations[0]?.name).length > 1) {
                  setStep("climb");
                } else if (needsScale) {
                  setStep("scale");
                } else {
                  setStep("grade");
                }
              }}
              onSelectCatalog={(gym) => {
                applyGym(gym);
                const locations = outletsInSelectedCity(gym, city);
                if (locations.length > 1) setStep("outlet");
                else if (typesForOutlet(gym, locations[0]?.name).length > 1) {
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
                setNewOutletName("");
              }}
              onSelectNew={() => {
                setOutlet("");
                setNewOutletName("");
              }}
              onNewName={setNewOutletName}
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
              onChange={setScaleDraft}
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
            <label className="block min-w-0 max-w-full">
              <span className="mb-1.5 block text-sm font-semibold">Visited on</span>
              <Field
                type="date"
                value={visitedOn}
                onChange={(e) => setVisitedOn(e.target.value)}
                required
              />
            </label>
          )}

          {step === "notes" && (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  Notes <span className="font-medium text-ink-soft">(optional)</span>
                </span>
                <TextArea
                  value={notes}
                  maxLength={NOTES_MAX}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="That blue slab was harder than it looked..."
                />
                <p className="mt-1.5 text-right text-xs text-ink-soft">
                  {notes.length}/{NOTES_MAX}
                </p>
              </label>
              <VisitMediaFields
                url={visitMediaUrl}
                onUrl={setVisitMediaUrl}
                busy={pending}
              />
            </div>
          )}
          {unverifiedPlace && (step === "scale" || step === "grade") ? (
            <p className="mt-3 text-sm text-ink-soft">
              This place (and its grade chart) is unverified until another climber
              stamps it too.
            </p>
          ) : null}
          {catalogMatch?.id &&
          step !== "country" &&
          step !== "city" &&
          step !== "date" &&
          step !== "notes" ? (
            <ReportPlaceButton
              gymId={catalogMatch.id}
              gymName={catalogMatch.name}
              outletId={selectedOutlet?.id}
              outletName={selectedOutlet?.name}
            />
          ) : null}
          </div>
        </div>

        {/* Keep errors outside the scroll region so they stay visible above the CTA. */}
        {sheetError ? (
          <p
            ref={errorBannerRef}
            role="alert"
            className="mt-1 shrink-0 rounded-md bg-danger-fill px-3 py-2 text-sm text-danger-ink"
          >
            {sheetError}
          </p>
        ) : null}

        <div className="flex shrink-0 gap-2 pt-2">
          <Button
            type="button"
            variant="tertiary"
            onClick={goBack}
            disabled={pending}
            className="min-w-22"
          >
            {step === steps[0] ? "Cancel" : "Back"}
          </Button>
          {step === "notes" ? (
            <Button
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
                if (visitMediaUrl.trim()) {
                  const media = parseVisitMediaUrl(visitMediaUrl);
                  if (!media || "error" in media) {
                    setMediaError(
                      media && "error" in media
                        ? media.error
                        : "Paste a public TikTok, Instagram, or YouTube link.",
                    );
                    return;
                  }
                }
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
                if (visitMediaUrl.trim()) data.set("media_url", visitMediaUrl.trim());
                startTransition(() => {
                  formAction(data);
                });
              }}
              className="flex-1"
            >
              <ActionButtonLabel pending={pending} idle="Add stamp" busy="Saving…" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="flex-1"
            >
              Next
            </Button>
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
    <div className="passport-overlay fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink/35"
        onClick={onClose}
      />
      <div className="passport-overlay-frame relative min-w-0 w-full sm:px-3">{children}</div>
    </div>
  );
}

function ReportPlaceButton({
  gymId,
  gymName,
  outletId,
  outletName,
}: {
  gymId: string;
  gymName: string;
  outletId?: string;
  outletName?: string;
}) {
  const { username } = usePassport();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div className="pt-3">
      <button
        type="button"
        disabled={done}
        className="text-xs font-medium text-ink-soft/45 underline underline-offset-2 hover:text-ink-soft disabled:text-ink-soft/35"
        onClick={() => setOpen(true)}
      >
        This place looks wrong
      </button>
      {done ? (
        <p className="mt-1 text-sm text-ink-soft">Thanks — we’ll use this to fix the listing.</p>
      ) : null}
      <ReportPlaceDialog
        open={open}
        onClose={() => setOpen(false)}
        onReported={() => {
          setDone(true);
          setOpen(false);
        }}
        gymId={gymId}
        gymName={gymName}
        outletId={outletId}
        outletName={outletName}
        username={username}
      />
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
      <p className="text-sm text-ink-soft">
        Pick what you’re climbing on. Outdoor plastic walls still count as Gym.
      </p>
      <div className="grid gap-2">
        {PLACE_KINDS.map((kind) => {
          const active = selected === kind;
          return (
            <ChoiceTile
              key={kind}
              selected={active}
              onClick={() => onSelect(kind)}
            >
              <span className="flex items-center gap-2">
                <PlaceKindMark kind={kind} />
              </span>
              <span
                className={cx(
                  "mt-1 block text-sm leading-snug",
                  active ? "text-ink-soft" : "text-ink-soft",
                )}
              >
                {PLACE_KIND_HELP[kind]}
              </span>
            </ChoiceTile>
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
      <p className="text-sm text-ink-soft">
        Pick every discipline this place has. If there’s only one, you won’t be asked again when
        logging.
      </p>
      <div className="grid gap-2">
        {CLIMBING_TYPES.map((type) => {
          const active = selected.includes(type);
          return (
            <ChoiceTile
              key={type}
              selected={active}
              onClick={() => onToggle(type)}
              className="text-base font-semibold"
            >
              <DisciplineMark type={type} />
            </ChoiceTile>
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
      <p className="text-sm text-ink-soft">This place offers more than one style — which was today?</p>
      <div className="grid gap-2">
        {options.map((type) => {
          const active = selected === type;
          return (
            <ChoiceTile
              key={type}
              selected={active}
              onClick={() => onSelect(type)}
              className="text-base font-semibold"
            >
              <DisciplineMark type={type} />
            </ChoiceTile>
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
  const catalogIds = new Set(
    catalogGyms.map((gym) => gym.id).filter((id): id is string => Boolean(id)),
  );
  const catalogHasDbRows = catalogIds.size > 0;
  const inCountry = gyms.filter((gym) => {
    if (!sameCountry(gym.country, country)) return false;
    if (catalogHasDbRows && gym.gymId && !catalogIds.has(gym.gymId)) return false;
    return true;
  });
  const recent = (q
    ? inCountry.filter((gym) =>
        `${gym.name} ${gym.outlets.join(" ")} ${gym.country} ${countryCode(gym.country)}`.toLowerCase().includes(q),
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
        <Field
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
          preventIosZoom
          className="!text-base"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">
          Outlet <span className="font-medium text-ink-soft">(optional)</span>
        </span>
        <Field
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
          preventIosZoom
          className="!text-base"
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
            subtitle: catalogGymSubtitle(gym, city),
            meta: isUnverifiedPlace(gym.status)
              ? "Unverified"
              : gym.scale?.kind === "color"
                ? "Colours"
                : gym.scale?.kind === "number"
                  ? "Numbers"
                  : undefined,
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
            subtitle: catalogGymSubtitle(gym, city),
            meta: isUnverifiedPlace(gym.status) ? "Unverified" : undefined,
            onClick: () => onSelectCatalog(gym),
          }))}
        />
      )}
      {query.trim() && (
        <p className="text-sm text-ink-soft">
          New place? Continue to add{" "}
          <span className="font-semibold text-ink">
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
      <p className="label-micro mb-2">{label}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={item.onClick}
              className="flex min-h-[var(--control-min)] w-full items-center justify-between gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3.5 py-2 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight">{item.title}</span>
                {item.subtitle ? (
                  <span className="mt-0.5 block text-sm leading-snug text-ink-soft">
                    {item.subtitle}
                  </span>
                ) : null}
              </span>
              {item.meta ? (
                <span className="shrink-0 text-xs font-semibold text-sky-600">
                  {item.meta}
                </span>
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
      <label className="block shrink-0">
        <span className="mb-1.5 block text-sm font-semibold">{label}</span>
        <span className="relative block">
          <Field
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
            preventIosZoom
            className={cx("!text-base", showClear && "field-clearable")}
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
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-soft"
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
          id={listId}
          role="listbox"
          className="soft-scroll mt-2 max-h-[min(45dvh,24rem)] w-full overflow-y-auto rounded-lg border border-sky-300 bg-surface py-1.5 shadow-lifted"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-ink-soft">{emptyMessage}</li>
          ) : (
            filtered.map((item, index) => {
              const active = index === highlight;
              return (
                <li key={item} role="option" aria-selected={active} id={`${listId}-${index}`}>
                  <button
                    type="button"
                    className={cx(
                      "flex min-h-[var(--control-min)] w-full items-center px-3.5 text-left text-sm font-semibold",
                      active ? "bg-sky-100 text-ink" : "text-ink",
                    )}
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
  // GymGroup.city is the latest outlet name (Jaya One, Sunway Square), not the city.
  const gymCities = [
    ...catalogCities(catalogGyms, country),
    ...gyms
      .filter((gym) => sameCountry(gym.country, country))
      .flatMap((gym) => gym.visits.map((visit) => visit.city)),
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
            subtitle: countryCode(country) || country,
            onClick: () => onPick(item),
          }))}
        />
      ) : (
        <p className="text-sm text-ink-soft">
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
}: {
  outlets: GymOutlet[];
  selected: string;
  newName: string;
  onSelect: (outlet: GymOutlet) => void;
  onSelectNew: () => void;
  onNewName: (value: string) => void;
}) {
  const [addingNew, setAddingNew] = useState(false);
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingNew) newInputRef.current?.focus();
  }, [addingNew]);

  function handleSelectOutlet(item: GymOutlet) {
    setAddingNew(false);
    onSelect(item);
  }

  function handleSelectNew() {
    setAddingNew(true);
    onSelectNew();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {outlets.map((item) => {
          const active = !addingNew && item.name === selected;
          return (
            <Chip
              key={item.name}
              selected={active}
              onClick={() => handleSelectOutlet(item)}
            >
              {item.name}
              {isUnverifiedPlace(item.status) ? (
                <span className="ml-1 font-medium text-ink-soft">Unverified</span>
              ) : null}
            </Chip>
          );
        })}
        <Chip
          selected={addingNew}
          onClick={handleSelectNew}
          aria-pressed={addingNew}
        >
          + New outlet
        </Chip>
      </div>

      {addingNew ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">New outlet</span>
          <Field
            ref={newInputRef}
            value={newName}
            onChange={(e) => onNewName(e.target.value)}
            placeholder="Outlet name"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
            preventIosZoom
            className="!text-base"
          />
        </label>
      ) : null}
    </div>
  );
}

function SuccessState({
  name,
  place,
  climbLabel,
  climbType,
  gradeLabel,
  date,
  placeKind,
  onViewGym,
  onHome,
}: {
  name: string;
  place: string;
  climbLabel: string;
  climbType: ClimbingType;
  gradeLabel: string;
  date: string;
  placeKind: PlaceKind;
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
      className="passport-sheet-in sheet mx-auto flex w-full max-w-[var(--sheet-max)] flex-col items-center px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 text-center"
    >
      <div className="stamp-press">
        <Stamp
          variant="hero"
          size="hero"
          ink={placeInk(placeKind)}
          seed={`${name}-${date}`}
          label={gradeLabel}
          sublabel={climbLabel}
          caption={prettyDate}
        />
      </div>
      <h2 id="success-title" className="mark mt-5 text-3xl text-ink">
        Stamp added ✦
      </h2>
      <p className="mt-3 text-lg font-semibold leading-tight">{name}</p>
      <p className="text-sm text-ink-soft">{place}</p>
      <p className="mt-2 text-sm font-semibold">
        <DisciplineMark type={climbType} />
      </p>
      <p className="grade-text mt-1 text-xl text-ink">{gradeLabel}</p>
      <p className="mt-1 text-sm text-ink-soft">Added to your passport</p>
      <div className="mt-6 flex w-full flex-col gap-1">
        <Button type="button" onClick={onViewGym}>
          View place
        </Button>
        <Button type="button" variant="tertiary" onClick={onHome} className="!w-full">
          Back to home
        </Button>
      </div>
    </div>
  );
}
