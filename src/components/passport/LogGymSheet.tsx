"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addVisitAction, type ActionResult } from "@/app/actions";
import { COUNTRY_NAMES } from "@/lib/countries";
import { todayISO } from "@/lib/dates";
import { formatGrade, GRADE_SYSTEMS, gradesForSystem } from "@/lib/grades";
import { gymSlug } from "@/lib/gyms";
import type { GradeSystem, GymGroup } from "@/lib/types";
import { CloseIcon, MountainIcon } from "./icons";
import { usePassport } from "./PassportContext";

const initial: ActionResult | null = null;
const NOTES_MAX = 400;

type Step = "gym" | "location" | "grade" | "date" | "notes";

export function LogGymSheet() {
  const router = useRouter();
  const { gyms, logOpen, logPrefill, closeLog, configured } = usePassport();
  if (!logOpen) return null;

  return (
    <LogGymSheetInner
      gyms={gyms}
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
  prefill,
  configured,
  onClose,
  onViewGym,
  onHome,
}: {
  gyms: GymGroup[];
  prefill: { name?: string; city?: string; country?: string; existing?: boolean } | null;
  configured: boolean;
  onClose: () => void;
  onViewGym: (slug: string) => void;
  onHome: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(addVisitAction, initial);
  const [step, setStep] = useState<Step>(prefill?.existing ? "grade" : "gym");
  const [name, setName] = useState(prefill?.name ?? "");
  const [city, setCity] = useState(prefill?.city ?? "");
  const [country, setCountry] = useState(prefill?.country ?? "");
  const [existing, setExisting] = useState(Boolean(prefill?.existing));
  const [system, setSystem] = useState<GradeSystem>("v");
  const [grade, setGrade] = useState("");
  const [visitedOn, setVisitedOn] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState(prefill?.name ?? "");
  const closeRef = useRef<HTMLButtonElement>(null);
  const submitted = useRef(false);

  const grades = useMemo(() => gradesForSystem(system), [system]);
  const steps: Step[] = existing
    ? ["gym", "grade", "date", "notes"]
    : ["gym", "location", "grade", "date", "notes"];
  const stepIndex = Math.max(0, steps.indexOf(step));

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return gyms.slice(0, 6);
    return gyms
      .filter((gym) =>
        `${gym.name} ${gym.city} ${gym.country}`.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [gyms, query]);

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

  function selectGym(gym: GymGroup) {
    setName(gym.name);
    setCity(gym.city);
    setCountry(gym.country);
    setQuery(gym.name);
    setExisting(true);
    setStep("grade");
  }

  function goNext() {
    if (step === "gym") {
      if (!name.trim()) return;
      const exact = gyms.filter(
        (gym) => gym.name.toLowerCase() === name.trim().toLowerCase(),
      );
      if (exact.length === 1) {
        selectGym(exact[0]);
        return;
      }
      if (existing) setStep("grade");
      else setStep("location");
      return;
    }
    if (step === "location") {
      if (!city.trim() || !country.trim()) return;
      const match = gyms.find(
        (gym) =>
          gym.name.toLowerCase() === name.trim().toLowerCase() &&
          gym.city.toLowerCase() === city.trim().toLowerCase() &&
          gym.country.toLowerCase() === country.trim().toLowerCase(),
      );
      if (match) {
        setName(match.name);
        setCity(match.city);
        setCountry(match.country);
        setExisting(true);
      }
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
    (step === "grade" && Boolean(grade)) ||
    step === "date";

  if (state?.ok) {
    const slug = gymSlug(name, city, country);
    return (
      <Overlay onClose={onHome}>
        <SuccessState
          name={name}
          city={city}
          country={country}
          gradeLabel={formatGrade(system, grade)}
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
                {city ? ` · ${city}` : ""}
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
              matches={matches}
              onQuery={(value) => {
                setQuery(value);
                setName(value);
                setExisting(false);
              }}
              onSelect={selectGym}
            />
          )}

          {step === "location" && (
            <LocationStep
              city={city}
              country={country}
              gyms={gyms}
              onCity={setCity}
              onCountry={setCountry}
            />
          )}

          {step === "grade" && (
            <GradeStep
              system={system}
              grade={grade}
              grades={grades}
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
            <form
              action={formAction}
              className="flex-1"
              onSubmit={() => {
                if (pending || submitted.current) return;
                submitted.current = true;
              }}
            >
              <input type="hidden" name="gym_name" value={name.trim()} />
              <input type="hidden" name="city" value={city.trim()} />
              <input type="hidden" name="country" value={country.trim()} />
              <input type="hidden" name="grade_system" value={system} />
              <input type="hidden" name="highest_grade" value={grade} />
              <input type="hidden" name="visited_on" value={visitedOn} />
              <input type="hidden" name="notes" value={notes} />
              <button
                type="submit"
                disabled={pending || !configured || !name || !city || !country || !grade}
                className="passport-btn"
              >
                {pending ? "Saving..." : "Add stamp"}
              </button>
            </form>
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
  matches,
  onQuery,
  onSelect,
}: {
  query: string;
  matches: GymGroup[];
  onQuery: (value: string) => void;
  onSelect: (gym: GymGroup) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Gym name</span>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Boulder World"
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="next"
          className="passport-field"
        />
      </label>
      {matches.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-pass-muted">
            {query.trim() ? "Matches" : "Recent gyms"}
          </p>
          <ul className="space-y-1.5">
            {matches.map((gym) => (
              <li key={gym.slug}>
                <button
                  type="button"
                  onClick={() => onSelect(gym)}
                  className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-pass-line bg-pass-soft px-3 py-2 text-left"
                >
                  <span>
                    <span className="block font-semibold leading-tight">{gym.name}</span>
                    <span className="text-sm text-pass-muted">
                      {gym.city} · {gym.country}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-pass-primary">
                    {gym.visitCount} {gym.visitCount === 1 ? "visit" : "visits"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {query.trim() && (
        <p className="text-sm text-pass-muted">
          Can’t find it? Continue to add <span className="font-semibold text-pass-navy">{query.trim()}</span> as a new gym.
        </p>
      )}
    </div>
  );
}

function LocationStep({
  city,
  country,
  gyms,
  onCity,
  onCountry,
}: {
  city: string;
  country: string;
  gyms: GymGroup[];
  onCity: (value: string) => void;
  onCountry: (value: string) => void;
}) {
  const cities = [...new Set(gyms.map((gym) => gym.city))];

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">City</span>
        <input
          value={city}
          onChange={(e) => onCity(e.target.value)}
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

function GradeStep({
  system,
  grade,
  grades,
  onSystem,
  onGrade,
}: {
  system: GradeSystem;
  grade: string;
  grades: string[];
  onSystem: (system: GradeSystem) => void;
  onGrade: (grade: string) => void;
}) {
  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Grade system</legend>
        <div className="grid grid-cols-3 gap-2">
          {GRADE_SYSTEMS.map((item) => {
            const selected = item.value === system;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onSystem(item.value)}
                className={`min-h-11 rounded-full border text-sm font-semibold ${
                  selected
                    ? "border-pass-primary bg-[#e7f4fb] text-pass-navy"
                    : "border-pass-line bg-white text-pass-muted"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Highest grade</legend>
        <div className="grid grid-cols-4 gap-2 min-[380px]:grid-cols-5">
          {grades.map((item) => {
            const selected = item === grade;
            return (
              <button
                key={item}
                type="button"
                onClick={() => onGrade(item)}
                className={`min-h-11 rounded-xl border text-sm font-semibold ${
                  selected
                    ? "border-pass-primary bg-[#e7f4fb] text-pass-navy"
                    : "border-pass-line bg-white text-pass-navy"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function SuccessState({
  name,
  city,
  country,
  gradeLabel,
  date,
  onViewGym,
  onHome,
}: {
  name: string;
  city: string;
  country: string;
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
      <p className="text-sm text-pass-muted">
        {city} · {country}
      </p>
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
