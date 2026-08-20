"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateVisitAction, type ActionResult } from "@/app/actions";
import {
  DEFAULT_CLIMBING_TYPES,
  normalizeClimbingTypes,
  type ClimbingType,
} from "@/lib/climbingTypes";
import { countryCode } from "@/lib/countries";
import { vEquivFor } from "@/lib/grades";
import {
  findKnownGym,
  mergeOutlets,
  sameCountry,
  visibleOutlets,
} from "@/lib/gymCatalog";
import { normalizePlaceKind } from "@/lib/placeKinds";
import {
  isLegacyVisitMediaPath,
  parseVisitMediaUrl,
  visitMediaLinkFromStored,
} from "@/lib/visitMedia";
import type { CatalogGym, GradeSystem, GymGroup, GymOutlet, GymVisit } from "@/lib/types";
import { ActionButtonLabel } from "./ActionButtonLabel";
import { DeleteStampDialog } from "./DeleteStampDialog";
import { FlashToast } from "./FlashToast";
import { CloseIcon } from "./icons";
import { GradePicker } from "./GradePicker";
import { usePassport } from "./PassportContext";
import { VisitMediaFields } from "./VisitMediaFields";
import { VisitMediaPreview } from "./VisitMediaPreview";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ChoiceTile } from "@/components/ui/ChoiceTile";
import { Field, TextArea } from "@/components/ui/Field";
import { DisciplineMark } from "@/components/ui/Marks";

const initial: ActionResult | null = null;
const NOTES_MAX = 400;

export function EditVisitSheet() {
  const router = useRouter();
  const { catalogGyms, gyms, editVisit, closeEdit, configured } = usePassport();
  if (!editVisit) return null;

  return (
    <EditVisitSheetInner
      visit={editVisit}
      catalogGyms={catalogGyms}
      gyms={gyms}
      configured={configured}
      onClose={closeEdit}
      onSaved={() => {
        closeEdit();
        router.refresh();
      }}
    />
  );
}

function EditVisitSheetInner({
  visit,
  catalogGyms,
  gyms,
  configured,
  onClose,
  onSaved,
}: {
  visit: GymVisit;
  catalogGyms: CatalogGym[];
  gyms: GymGroup[];
  configured: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [state, formAction, actionPending] = useActionState(updateVisitAction, initial);
  const [isPending, startTransition] = useTransition();
  const closeRef = useRef<HTMLButtonElement>(null);
  const errorBannerRef = useRef<HTMLParagraphElement>(null);

  const catalogMatch = catalogGyms.find((gym) => gym.id === visit.gym_id) ??
    catalogGyms.find(
      (gym) =>
        gym.name.toLowerCase() === visit.gym_name.toLowerCase() &&
        sameCountry(gym.country, visit.country),
    );
  const userMatch = gyms.find(
    (gym) =>
      gym.gymId === visit.gym_id ||
      (gym.name.toLowerCase() === visit.gym_name.toLowerCase() &&
        sameCountry(gym.country, visit.country)),
  );
  const known = findKnownGym(visit.gym_name, visit.country);

  const [outlet, setOutlet] = useState(visit.outlet?.trim() || visit.city);
  const [city, setCity] = useState(visit.city);
  const [newOutletName, setNewOutletName] = useState("");
  const catalogTypes = normalizeClimbingTypes(
    catalogMatch?.climbing_types ?? known?.climbing_types,
  );
  const offeredTypes = uniqueTypes([
    ...(catalogTypes.length > 0 ? catalogTypes : DEFAULT_CLIMBING_TYPES),
    visit.climbing_type,
  ]);
  const [climbType, setClimbType] = useState<ClimbingType>(visit.climbing_type);
  const [system, setSystem] = useState<GradeSystem>(visit.grade_system);
  const [grade, setGrade] = useState(visit.highest_grade);
  const [visitedOn, setVisitedOn] = useState(visit.visited_on);
  const [notes, setNotes] = useState(visit.notes ?? "");
  const initialClip = visitMediaLinkFromStored(visit.photo_path, visit.video_path)?.url ?? "";
  const [visitMediaUrl, setVisitMediaUrl] = useState(initialClip);
  const [clearLegacy, setClearLegacy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const pending = actionPending || isPending;
  const sheetError = mediaError || state?.error || null;
  const hasLegacyMedia =
    isLegacyVisitMediaPath(visit.photo_path) || isLegacyVisitMediaPath(visit.video_path);

  const resolvedScale =
    catalogMatch?.scale ??
    known?.scale ??
    (userMatch
      ? { kind: userMatch.bestGradeSystem, bands: [] }
      : null);
  const hasCatalogScale = Boolean(
    (catalogMatch?.scale && catalogMatch.scale.bands.length > 0) ||
      (known?.scale && known.scale.bands.length > 0),
  );
  const activeScale = resolvedScale;
  const pickerSystem =
    activeScale && activeScale.bands.length > 0 ? activeScale.kind : system;

  const outlets: GymOutlet[] = visibleOutlets({
    name: visit.gym_name,
    outlets: mergeOutlets(
      catalogMatch?.outlets ?? [],
      known?.outlets ?? [],
      (userMatch?.outlets ?? []).map((item) => ({
        name: item,
        city: userMatch?.city || visit.city,
      })),
      outlet && city ? [{ name: outlet, city }] : [],
    ),
  });
  const needsOutlet = outlets.length > 1;
  const needsClimb = offeredTypes.length > 1;
  const placeKind = normalizePlaceKind(
    catalogMatch?.place_kind ?? known?.place_kind ?? userMatch?.place_kind,
  );

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

  const canSave = Boolean(configured && grade && visitedOn && visit.gym_name && visit.country);

  if (state?.ok) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <button
          type="button"
          aria-label="Close dialog"
          className="absolute inset-0 bg-ink/35"
          onClick={onSaved}
        />
        <div className="relative w-full sm:px-3">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-saved-title"
            className="passport-sheet-in sheet mx-auto flex w-full max-w-[var(--sheet-max)] flex-col items-center px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 text-center"
          >
            <h2 id="edit-saved-title" className="mark text-3xl text-ink">
              Stamp updated ✦
            </h2>
            <p className="mt-3 text-lg font-semibold leading-tight">{visit.gym_name}</p>
            <Button type="button" onClick={onSaved} className="mt-6">
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink/35"
        onClick={onClose}
      />
      <FlashToast message={sheetError} />
      <div className="relative w-full sm:px-3">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-title"
          className="passport-sheet-in sheet mx-auto flex max-h-[min(92dvh,760px)] w-full max-w-[var(--sheet-max)] flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="sheet-handle mx-auto mb-3 h-1 w-10 rounded-full bg-sky-300" />
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="label-micro">Edit stamp</p>
              <h2 id="edit-title" className="mark text-2xl text-ink">
                {visit.gym_name}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {[outlet || city, countryCode(visit.country) || visit.country]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <DeleteStampDialog
                visitId={visit.id}
                disabled={pending || !configured}
                onDeleted={() => {
                  const lastVisit = (userMatch?.visitCount ?? 1) <= 1;
                  onClose();
                  if (lastVisit) router.replace("/passport/gyms");
                  router.refresh();
                }}
              />
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="inline-flex size-11 items-center justify-center rounded-full bg-sky-100 text-ink-soft"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-3">
            {needsOutlet ? (
              <OutletEditor
                outlets={outlets}
                selected={outlet}
                newName={newOutletName}
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
            ) : null}

            {needsClimb ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold">What did you climb?</p>
                <div className="grid gap-2">
                  {offeredTypes.map((type) => (
                    <ChoiceTile
                      key={type}
                      selected={climbType === type}
                      onClick={() => setClimbType(type)}
                      className="text-base font-semibold"
                    >
                      <DisciplineMark type={type} />
                    </ChoiceTile>
                  ))}
                </div>
              </div>
            ) : null}

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

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Visited on</span>
              <Field
                type="date"
                value={visitedOn}
                onChange={(e) => setVisitedOn(e.target.value)}
                required
              />
            </label>

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
                onUrl={(next) => {
                  setVisitMediaUrl(next);
                  if (next.trim()) setClearLegacy(false);
                }}
                busy={pending}
              />
              {!visitMediaUrl.trim() && hasLegacyMedia && !clearLegacy ? (
                <div>
                  <p className="mb-2 text-xs text-ink-soft">
                    This stamp still has an older upload. Paste a link to replace it, or remove it.
                  </p>
                  <VisitMediaPreview
                    photoPath={visit.photo_path}
                    videoPath={visit.video_path}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setClearLegacy(true)}
                    className="mt-2 text-xs font-semibold text-sky-600"
                  >
                    Remove uploaded clip
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {sheetError ? (
            <p
              ref={errorBannerRef}
              role="alert"
              className="mt-1 shrink-0 rounded-md bg-danger-fill px-3 py-2 text-sm text-danger-ink"
            >
              {sheetError}
            </p>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="tertiary"
              onClick={onClose}
              disabled={pending}
              className="min-w-22"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !canSave}
              aria-busy={pending}
              onClick={() => {
                if (pending || !canSave) return;
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
                data.set("visit_id", visit.id);
                data.set("gym_name", visit.gym_name);
                data.set("city", (city.trim() || visit.city).trim());
                data.set("country", visit.country.trim());
                const outletValue = (outlet || city || visit.city).trim();
                data.set("outlet", outletValue);
                if (catalogMatch?.id) {
                  data.set("gym_id", catalogMatch.id);
                  const matchedOutlet = catalogMatch.outlets.find(
                    (item) => item.name.toLowerCase() === outletValue.toLowerCase(),
                  );
                  if (matchedOutlet?.id) data.set("outlet_id", matchedOutlet.id);
                } else if (visit.gym_id) {
                  data.set("gym_id", visit.gym_id);
                  if (visit.outlet_id && outletValue.toLowerCase() === (visit.outlet ?? "").toLowerCase()) {
                    data.set("outlet_id", visit.outlet_id);
                  }
                }
                data.set("grade_system", pickerSystem);
                data.set("highest_grade", grade);
                data.set("climbing_type", climbType);
                data.set("climbing_types", offeredTypes.join(","));
                data.set("place_kind", placeKind);
                data.set("v_equiv", vEquivFor(pickerSystem, grade, activeScale) ?? "");
                data.set("visited_on", visitedOn);
                data.set("notes", notes);
                data.set("is_new_gym", "0");
                data.set("has_catalog_scale", hasCatalogScale ? "1" : "0");
                if (visitMediaUrl.trim()) data.set("media_url", visitMediaUrl.trim());
                if (!visitMediaUrl.trim() && (clearLegacy || Boolean(initialClip))) {
                  data.set("clear_media", "1");
                }
                startTransition(() => {
                  formAction(data);
                });
              }}
              className="flex-1"
            >
              <ActionButtonLabel pending={pending} idle="Save changes" busy="Saving…" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function uniqueTypes(types: ClimbingType[]): ClimbingType[] {
  const seen = new Set<ClimbingType>();
  const ordered: ClimbingType[] = [];
  for (const type of types) {
    if (seen.has(type)) continue;
    seen.add(type);
    ordered.push(type);
  }
  return ordered;
}

function OutletEditor({
  outlets,
  selected,
  newName,
  onSelect,
  onNewName,
  onAddNew,
}: {
  outlets: GymOutlet[];
  selected: string;
  newName: string;
  onSelect: (outlet: GymOutlet) => void;
  onNewName: (value: string) => void;
  onAddNew: () => void;
}) {
  const [addingNew, setAddingNew] = useState(false);
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingNew) newInputRef.current?.focus();
  }, [addingNew]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Outlet</p>
      <div className="flex flex-wrap gap-2">
        {outlets.map((item) => {
          const active = !addingNew && item.name === selected;
          return (
            <Chip key={item.name} selected={active} onClick={() => {
              setAddingNew(false);
              onSelect(item);
            }}>
              {item.name}
            </Chip>
          );
        })}
        <Chip
          selected={addingNew}
          onClick={() => setAddingNew(true)}
          aria-pressed={addingNew}
        >
          + New outlet
        </Chip>
      </div>
      {addingNew ? (
        <div className="flex gap-2">
          <Field
            ref={newInputRef}
            value={newName}
            onChange={(e) => onNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddNew();
                setAddingNew(false);
              }
            }}
            placeholder="Outlet name"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onAddNew();
              setAddingNew(false);
            }}
            className="w-auto shrink-0 px-4"
          >
            Add
          </Button>
        </div>
      ) : null}
    </div>
  );
}
