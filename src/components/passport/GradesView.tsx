"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { saveGymScaleAction } from "@/app/actions";
import { countryCode } from "@/lib/countries";
import {
  SPORT_GRADE_COMPARISON,
  V_GRADES,
  bandsForVGrade,
  canonicalVGrade,
  colorHex,
  compareSendRank,
  gradeSystemLabel,
  hasVMapping,
  isHouseSystem,
  vEquivFor,
} from "@/lib/grades";
import { defaultScaleFor } from "@/lib/gymCatalog";
import { gymSlug } from "@/lib/gyms";
import type { CatalogGym, GradeBand, GradeScale, GymGroup, GymVisit } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { cx } from "@/components/ui/cx";
import { ActionButtonLabel } from "./ActionButtonLabel";
import { CountryStamp } from "./CountryStamp";
import { FlashToast } from "./FlashToast";
import { CloseIcon, PlusIcon, SearchIcon } from "./icons";
import { usePassport } from "./PassportContext";
import { ScaleSetup } from "./ScaleSetup";
import { SheetCloseButton } from "./SheetCloseButton";

type Chart = "compare" | "sport";
type Picker =
  | { mode: "add" }
  | { mode: "replace"; key: string };

const STORAGE_KEY = "chalk-grade-compare";

export function GradesView() {
  const { visits } = usePassport();
  const [chart, setChart] = useState<Chart>("compare");
  const bestV = bestSendV(visits);
  const chartSwitch = (
    <div
      role="group"
      aria-label="Grade charts"
      className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <Chip
        selected={chart === "compare"}
        aria-pressed={chart === "compare"}
        onClick={() => setChart("compare")}
        className="!min-h-9"
      >
        Compare
      </Chip>
      <Chip
        selected={chart === "sport"}
        aria-pressed={chart === "sport"}
        onClick={() => setChart("sport")}
        className="!min-h-9"
      >
        Sport
      </Chip>
    </div>
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="mark text-3xl text-ink">Grade chart</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          V stays the spine. Add as many gyms as you like — colours, numbers,
          Font, whatever they actually use.
        </p>
      </header>

      {chart === "compare" ? (
        <CompareChart bestV={bestV} chartSwitch={chartSwitch} />
      ) : (
        <>
          {chartSwitch}
          <SportChart />
        </>
      )}

      <p className="text-xs leading-relaxed text-ink-soft">
        {chart === "compare"
          ? "House colours and numbers come from each gym’s chart. V is for bouldering and French (6a) is for toprope and lead, so lining them up is only a rough conversion — they don’t map 1:1."
          : "Approximate gym-poster conversions, not law. YDS and French are sport — more 1:1 than lining a boulder up against a route."}
      </p>
    </div>
  );
}

function CompareChart({
  bestV,
  chartSwitch,
}: {
  bestV?: string;
  chartSwitch: ReactNode;
}) {
  const { catalogGyms, gyms, configured } = usePassport();
  const router = useRouter();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [scaleOverrides, setScaleOverrides] = useState<Record<string, GradeScale>>(
    {},
  );

  const byKey = useMemo(() => {
    const map = new Map<string, CatalogGym>();
    for (const gym of catalogGyms) {
      const key = compareKey(gym);
      const override = scaleOverrides[key];
      map.set(key, override ? { ...gym, scale: override } : gym);
    }
    return map;
  }, [catalogGyms, scaleOverrides]);

  useEffect(() => {
    const comparable = new Set(
      catalogGyms.filter((gym) => hasVMapping(gym.scale)).map(compareKey),
    );
    const stored = readCompareKeys()?.filter((key) => comparable.has(key)) ?? [];
    setSelectedKeys(
      stored.length > 0 ? stored : defaultCompareKeys(gyms, comparable),
    );
    setHydrated(true);
    // First paint only — catalog/visits are already loaded in the passport shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedKeys));
    } catch {
      /* private mode */
    }
  }, [hydrated, selectedKeys]);

  const selected = selectedKeys
    .map((key) => byKey.get(key))
    .filter((gym): gym is CatalogGym => Boolean(gym?.scale && hasVMapping(gym.scale)));

  const columns = selected.map((gym) => ({
    gym,
    cells: gymColumnCells(gym.scale!),
  }));

  function addGym(gym: CatalogGym) {
    const key = compareKey(gym);
    if (selectedKeys.includes(key)) return;
    setSelectedKeys((keys) => [...keys, key]);
    setPicker(null);
  }

  function replaceGym(currentKey: string, gym: CatalogGym) {
    const next = compareKey(gym);
    setSelectedKeys((keys) => keys.map((item) => (item === currentKey ? next : item)));
    setPicker(null);
  }

  function removeGym(key: string) {
    setSelectedKeys((keys) => keys.filter((item) => item !== key));
  }

  function handlePick(gym: CatalogGym) {
    if (picker?.mode === "replace") replaceGym(picker.key, gym);
    else addGym(gym);
  }

  function handleMapped(gym: CatalogGym) {
    if (gym.scale) {
      setScaleOverrides((prev) => ({ ...prev, [compareKey(gym)]: gym.scale! }));
    }
    handlePick(gym);
    router.refresh();
  }

  return (
    <>
      <div className="space-y-3">
      <div className="flex flex-col gap-3 wide:flex-row wide:items-center wide:justify-between">
        {chartSwitch}
        <button
          type="button"
          onClick={() => setPicker({ mode: "add" })}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 self-end rounded-full border border-dashed border-sky-300 px-3 text-sm font-semibold text-sky-700 hover:bg-sky-50 wide:self-auto"
        >
          <PlusIcon className="size-4" />
          Add gym
        </button>
      </div>
      <Card className="min-w-0 overflow-hidden !p-0">
        <div className="hide-scroll min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
          <table
            className="w-full min-w-full border-collapse text-center"
            style={{ minWidth: `${9.5 + columns.length * 6.5}rem` }}
          >
            <caption className="sr-only">
              V-scale compared with gym grade charts
            </caption>
            <thead>
              <tr className="bg-sky-50 text-ink">
                <th
                  scope="col"
                  className="sticky left-0 z-20 min-w-[3.6rem] bg-sky-50 px-1.5 py-2.5"
                >
                  <span className="grade-text text-sm">V</span>
                  <span className="label-micro mt-0.5 block tracking-wider">
                    Base
                  </span>
                </th>
                {columns.map(({ gym }) => {
                  const key = compareKey(gym);
                  return (
                  <th
                    key={key}
                    scope="col"
                    className="min-w-[6.5rem] max-w-[8.5rem] px-1 py-2 align-bottom wide:max-w-none wide:min-w-[8rem] desktop:min-w-[9.5rem] desktop:px-2"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => removeGym(key)}
                        className="inline-flex size-7 items-center justify-center rounded-full text-ink-soft hover:bg-sky-100 hover:text-ink"
                        aria-label={`Remove ${gym.name} from comparison`}
                      >
                        <CloseIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPicker({ mode: "replace", key })}
                        className="max-w-full rounded-md px-1 py-0.5 hover:bg-sky-100"
                      >
                        <span className="block truncate text-sm font-semibold leading-tight">
                          {gym.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                          {gradeSystemLabel(gym.scale!.kind)} · {countryCode(gym.country) || gym.country}
                        </span>
                      </button>
                    </div>
                  </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {V_GRADES.map((v) => {
                const yours = v === bestV;
                return (
                  <tr
                    key={v}
                    className={cx(
                      "border-t border-sky-100",
                      yours ? "bg-sky-100" : "bg-surface",
                    )}
                  >
                    <th
                      scope="row"
                      className={cx(
                        "sticky left-0 z-10 px-1.5 py-2.5 text-ink",
                        yours ? "bg-sky-100" : "bg-sky-50",
                      )}
                    >
                      <span className="grade-text text-sm">{v}</span>
                      {yours ? (
                        <span className="label-micro mt-0.5 block tracking-wider text-sky-700">
                          Your best
                        </span>
                      ) : null}
                    </th>
                    {columns.map(({ gym, cells }) => {
                      const cell = cells.get(v);
                      if (!cell || cell.hidden) return null;
                      return (
                        <td
                          key={`${compareKey(gym)}-${v}`}
                          rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                          className="px-1 py-2 align-middle"
                        >
                          <GymGradeCell
                            kind={gym.scale!.kind}
                            bands={cell.bands}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {selected.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Add a gym to see how its chart sits next to V.
        </p>
      ) : null}
      </div>
      {picker ? (
        <GymPickerSheet
          gyms={[...byKey.values()]}
          visits={gyms}
          selectedKeys={selectedKeys}
          replaceKey={picker.mode === "replace" ? picker.key : undefined}
          configured={configured}
          onPick={handlePick}
          onMapped={handleMapped}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </>
  );
}

function GymGradeCell({
  kind,
  bands,
}: {
  kind: GradeScale["kind"];
  bands: GradeBand[];
}) {
  if (bands.length === 0) {
    return <span className="text-ink-faint">—</span>;
  }
  return (
    <span className="flex flex-col items-center justify-center gap-1">
      {bands.map((band) => (
        <span
          key={band.label}
          className="inline-flex max-w-full items-center justify-center gap-1"
        >
          {kind === "color" ? (
            <span
              className="size-2.5 shrink-0 rounded-full border border-ink/15"
              style={{ background: colorHex(band.label, band.color) }}
              aria-hidden
            />
          ) : null}
          <span className="grade-text truncate text-sm text-ink">{band.label}</span>
        </span>
      ))}
    </span>
  );
}

function GymPickerSheet({
  gyms,
  visits,
  selectedKeys,
  replaceKey,
  configured,
  onPick,
  onMapped,
  onClose,
}: {
  gyms: CatalogGym[];
  visits: GymGroup[];
  selectedKeys: string[];
  replaceKey?: string;
  configured: boolean;
  onPick: (gym: CatalogGym) => void;
  onMapped: (gym: CatalogGym) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [mappingGym, setMappingGym] = useState<CatalogGym | null>(null);
  const [allowSearchFocus, setAllowSearchFocus] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const [scaleDraft, setScaleDraft] = useState<GradeScale>(() =>
    defaultScaleFor("number", 1, 12),
  );
  const [mapError, setMapError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const visited = useMemo(
    () => new Set(visits.map((gym) => gymSlug(gym.name, gym.country))),
    [visits],
  );
  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    const filtered = gyms.filter((gym) => {
      if (!q) return true;
      const outlets = gym.outlets.map((item) => item.name).join(" ");
      return `${gym.name} ${gym.country} ${countryCode(gym.country)} ${outlets}`
        .toLowerCase()
        .includes(q);
    });
    return [...filtered].sort((a, b) => {
      const aMapped = hasVMapping(a.scale) ? 0 : 1;
      const bMapped = hasVMapping(b.scale) ? 0 : 1;
      if (aMapped !== bMapped) return aMapped - bMapped;
      const aVisit = visited.has(compareKey(a)) ? 0 : 1;
      const bVisit = visited.has(compareKey(b)) ? 0 : 1;
      if (aVisit !== bVisit) return aVisit - bVisit;
      return 0;
    });
  }, [gyms, q, visited]);

  const canSave =
    configured &&
    hasVMapping(scaleDraft) &&
    (!isHouseSystem(scaleDraft.kind) || scaleDraft.bands.length > 0);

  function blurActive() {
    searchRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  function startMapping(gym: CatalogGym) {
    blurActive();
    setAllowSearchFocus(false);
    setMappingGym(gym);
    setScaleDraft(
      gym.scale?.bands.length ? gym.scale : defaultScaleFor("number", 1, 12),
    );
    setMapError(null);
  }

  function leaveMapping() {
    if (pending) return;
    blurActive();
    setMappingGym(null);
  }

  function saveMapping() {
    if (!mappingGym || !canSave || pending) return;
    const data = new FormData();
    data.set("gym_name", mappingGym.name);
    data.set("country", mappingGym.country);
    const outlet = mappingGym.outlets[0];
    if (outlet?.city) data.set("city", outlet.city);
    if (outlet?.name) data.set("outlet", outlet.name);
    if (mappingGym.id) data.set("gym_id", mappingGym.id);
    if (outlet?.id) data.set("outlet_id", outlet.id);
    data.set("place_kind", mappingGym.place_kind);
    data.set("climbing_types", mappingGym.climbing_types.join(","));
    data.set("scale_json", JSON.stringify(scaleDraft));

    startTransition(async () => {
      const result = await saveGymScaleAction(data);
      if (!result.ok) {
        setMapError(result.error ?? "Couldn’t save that mapping.");
        return;
      }
      onMapped({ ...mappingGym, scale: scaleDraft });
    });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (mappingGym) {
        leaveMapping();
        return;
      }
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mappingGym, onClose, pending]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink/35"
        onClick={onClose}
      />
      <div className="relative w-full sm:px-3">
        <FlashToast message={mapError} />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-gym-title"
          className="passport-sheet-in sheet mx-auto flex max-h-[min(92dvh,760px)] w-full max-w-[var(--sheet-max)] flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="sheet-handle mx-auto mb-3 h-1 w-10 rounded-full bg-sky-300" />
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="label-micro">Compare</p>
              <h2 id="compare-gym-title" className="mark text-2xl text-ink">
                {mappingGym
                  ? `Map ${mappingGym.name}`
                  : replaceKey
                    ? "Swap a gym"
                    : "Add a gym"}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {mappingGym
                  ? "Needs a chart mapped to V — colours, numbers, or a standard scale."
                  : "Needs a chart mapped to V. Add one if this place doesn’t have it yet."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <SheetCloseButton onClick={onClose} />
            </div>
          </div>

          <div
            className={cx(
              "flex min-h-0 flex-1 flex-col",
              mappingGym && "hidden",
            )}
            inert={mappingGym ? true : undefined}
          >
              <label className="relative mb-3 block">
                <span className="sr-only">Search gyms</span>
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">
                  <SearchIcon className="size-[1.125rem]" />
                </span>
                <Field
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search gyms"
                  icon
                  preventIosZoom
                  autoFocus={allowSearchFocus}
                  className="!text-base"
                />
              </label>

              <ul className="hide-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto pb-2">
                {rows.map((gym) => {
                  const key = compareKey(gym);
                  const mapped = hasVMapping(gym.scale);
                  const already = selectedKeys.includes(key);
                  if (!mapped) {
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          disabled={!configured}
                          onClick={() => startMapping(gym)}
                          className={cx(
                            "flex w-full min-h-14 items-center gap-3 rounded-lg px-2.5 py-2 text-left",
                            configured
                              ? "hover:bg-sky-50 active:bg-sky-100"
                              : "opacity-45",
                          )}
                        >
                          <CountryStamp country={gym.country} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold leading-tight">
                              {gym.name}
                            </span>
                            <span className="mt-0.5 block truncate text-sm text-ink-soft">
                              No V mapping yet
                            </span>
                          </span>
                          <span className="inline-flex shrink-0 items-center rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                            Add mapping
                          </span>
                        </button>
                      </li>
                    );
                  }
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={already}
                        onClick={() => onPick(gym)}
                        className={cx(
                          "flex w-full min-h-14 items-center gap-3 rounded-lg px-2.5 py-2 text-left",
                          already
                            ? "opacity-45"
                            : "hover:bg-sky-50 active:bg-sky-100",
                        )}
                      >
                        <CountryStamp country={gym.country} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold leading-tight">
                            {gym.name}
                          </span>
                          <span className="mt-0.5 block truncate text-sm text-ink-soft">
                            {already
                              ? "Already in the table"
                              : `${gradeSystemLabel(gym.scale!.kind)} · ${countryCode(gym.country) || gym.country}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
          </div>
          {mappingGym ? (
            <>
              <div className="hide-scroll min-h-0 flex-1 overflow-y-auto pb-2">
                <ScaleSetup
                  scale={scaleDraft}
                  onChange={setScaleDraft}
                  intro="Save how this place grades so it can sit next to V on the chart."
                />
              </div>
              <div className="flex shrink-0 gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={leaveMapping}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={!canSave || pending}
                  onClick={saveMapping}
                  className="flex-1"
                >
                  <ActionButtonLabel
                    pending={pending}
                    idle="Save mapping"
                    busy="Saving…"
                  />
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SportChart() {
  return (
    <Card className="overflow-hidden !p-0">
      <table className="w-full table-fixed border-collapse text-center">
        <caption className="sr-only">YDS compared with French sport grades</caption>
        <thead>
          <tr className="bg-sky-50 text-ink">
            <th scope="col" className="px-3 py-2.5 wide:px-6">
              <span className="grade-text text-sm">YDS</span>
              <span className="label-micro mt-0.5 block tracking-wider">
                Sport
              </span>
            </th>
            <th scope="col" className="px-3 py-2.5 wide:px-6">
              <span className="grade-text text-sm">French</span>
              <span className="label-micro mt-0.5 block tracking-wider">
                Sport
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {SPORT_GRADE_COMPARISON.map((row) => (
            <tr key={row.yds} className="border-t border-sky-100 bg-surface">
              <th scope="row" className="bg-sky-50/80 px-3 py-2.5 text-ink wide:px-6">
                <span className="grade-text text-sm">{row.yds}</span>
              </th>
              <td className="grade-text px-3 py-2.5 text-sm text-ink wide:px-6">
                {row.french}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function compareKey(gym: Pick<CatalogGym, "name" | "country">): string {
  return gymSlug(gym.name, gym.country);
}

function gymColumnCells(scale: GradeScale) {
  const cells = new Map<
    string,
    { bands: GradeBand[]; rowSpan: number; hidden: boolean }
  >();
  const rows = V_GRADES.map((v) => ({
    v,
    bands: bandsForVGrade(scale, v),
  }));
  const keyOf = (bands: GradeBand[]) => bands.map((band) => band.label).join("\0");

  let i = 0;
  while (i < rows.length) {
    const { v, bands } = rows[i];
    if (bands.length === 0) {
      cells.set(v, { bands, rowSpan: 1, hidden: false });
      i += 1;
      continue;
    }
    const key = keyOf(bands);
    let span = 1;
    while (i + span < rows.length && keyOf(rows[i + span].bands) === key) {
      span += 1;
    }
    cells.set(v, { bands, rowSpan: span, hidden: false });
    for (let extra = 1; extra < span; extra += 1) {
      cells.set(rows[i + extra].v, { bands, rowSpan: 0, hidden: true });
    }
    i += span;
  }
  return cells;
}

function defaultCompareKeys(visits: GymGroup[], comparable: Set<string>): string[] {
  const keys: string[] = [];
  for (const gym of visits) {
    const key = gymSlug(gym.name, gym.country);
    if (!comparable.has(key) || keys.includes(key)) continue;
    keys.push(key);
  }
  return keys;
}

function readCompareKeys(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return null;
  }
}

function bestSendV(visits: GymVisit[]): string | undefined {
  if (visits.length === 0) return undefined;
  const best = [...visits].sort(compareSendRank)[0];
  return (
    canonicalVGrade(best.v_equiv) ??
    (best.grade_system === "v" ? canonicalVGrade(best.highest_grade) : undefined) ??
    vEquivFor(best.grade_system, best.highest_grade)
  );
}
