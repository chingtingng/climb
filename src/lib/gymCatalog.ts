import {
  COLOR_GRADES,
  FRENCH_GRADES,
  FONT_GRADES,
  YDS_GRADES,
  isGradeSystem,
  numberRange,
} from "./grades";
import { countryMeta } from "./countries";
import {
  CLIMBING_TYPES,
  DEFAULT_CLIMBING_TYPES,
  isClimbingType,
  normalizeClimbingTypes,
  type ClimbingType,
} from "./climbingTypes";
import { normalizePlaceKind, type PlaceKind } from "./placeKinds";
import type { CatalogGym, CatalogStatus, GradeBand, GradeScale, GymOutlet } from "./types";

function vBands(labels: string[], startV = 1): GradeBand[] {
  return labels.map((label, index) => ({
    label,
    v_equiv: `V${Math.min(16, startV + index)}`,
  }));
}

function numberBands(from: number, to: number, startV = 1): GradeBand[] {
  return vBands(numberRange(from, to), startV);
}

function colorBands(names: { label: string; v: number | string }[]): GradeBand[] {
  return names.map((item) => ({
    label: item.label,
    color: COLOR_GRADES.find((c) => c.label === item.label)?.color,
    v_equiv: typeof item.v === "number" ? `V${item.v}` : item.v,
  }));
}

/** Boulder Planet house numbers 1–12 → approximate V (4≈V1 … 12≈V9). */
const BOULDER_PLANET_SCALE: GradeScale = {
  kind: "number",
  bands: [
    { label: "1", v_equiv: "VB" },
    { label: "2", v_equiv: "VB" },
    { label: "3", v_equiv: "V0" },
    ...numberBands(4, 12, 1),
  ],
};

const BOULDER_ONLY: ClimbingType[] = ["bouldering"];
const ROPE_ONLY: ClimbingType[] = ["top_rope", "lead"];
const BOULDER_AND_ROPE: ClimbingType[] = ["bouldering", "top_rope"];
const FULL_WALL: ClimbingType[] = ["bouldering", "top_rope", "lead"];

/** Camp5 tag colours sampled from camp5.com V-Scale / F-Scale charts. */
const CAMP5_PINK = "#e00070";
const CAMP5_BLUE = "#00a0e0";
const CAMP5_YELLOW = "#f0d000";
const CAMP5_ORANGE = "#f06020";
const CAMP5_GREEN = "#00a050";
const CAMP5_PURPLE = "#a02080";
const CAMP5_RED = "#e01020";

/** Boulder colour circuit — overlapping V ranges (pink VB–V1, blue V0–V2, …). */
const CAMP5_BOULDER_SCALE: GradeScale = {
  kind: "color",
  bands: [
    { label: "Pink", color: CAMP5_PINK, v_equiv: "VB", v_max: "V1" },
    { label: "Blue", color: CAMP5_BLUE, v_equiv: "V0", v_max: "V2" },
    { label: "Yellow", color: CAMP5_YELLOW, v_equiv: "V1", v_max: "V3" },
    { label: "Orange", color: CAMP5_ORANGE, v_equiv: "V2", v_max: "V4" },
    { label: "Green", color: CAMP5_GREEN, v_equiv: "V3", v_max: "V5" },
    { label: "Purple", color: CAMP5_PURPLE, v_equiv: "V4", v_max: "V6" },
    { label: "Red", color: CAMP5_RED, v_equiv: "V5", v_max: "V7" },
  ],
};

/**
 * Rope colour circuit (top-rope / lead). Posted as French ranges on the F-scale
 * chart; V is the passport spine (community approx).
 */
const CAMP5_ROPE_SCALE: GradeScale = {
  kind: "color",
  bands: [
    { label: "Pink", color: CAMP5_PINK, v_equiv: "VB", hint: "4a–5a" },
    { label: "Blue", color: CAMP5_BLUE, v_equiv: "VB", v_max: "V0", hint: "5a–6a" },
    { label: "Yellow", color: CAMP5_YELLOW, v_equiv: "VB", v_max: "V1", hint: "5c–6b" },
    { label: "Orange", color: CAMP5_ORANGE, v_equiv: "V0", v_max: "V2", hint: "6a–6c" },
    { label: "Green", color: CAMP5_GREEN, v_equiv: "V1", v_max: "V3", hint: "6b–7a" },
    { label: "Purple", color: CAMP5_PURPLE, v_equiv: "V2", v_max: "V4", hint: "6c–7b" },
    { label: "Red", color: CAMP5_RED, v_equiv: "V3", v_max: "V7", hint: "7a–8a" },
  ],
};

/** BFF house numbers 1–15; two grades per V step, 15≈V8. */
const BFF_BOULDER_SCALE: GradeScale = {
  kind: "number",
  bands: [
    { label: "1", v_equiv: "V1" },
    { label: "2", v_equiv: "V1" },
    { label: "3", v_equiv: "V2" },
    { label: "4", v_equiv: "V2" },
    { label: "5", v_equiv: "V3" },
    { label: "6", v_equiv: "V3" },
    { label: "7", v_equiv: "V4" },
    { label: "8", v_equiv: "V4" },
    { label: "9", v_equiv: "V5" },
    { label: "10", v_equiv: "V5" },
    { label: "11", v_equiv: "V6" },
    { label: "12", v_equiv: "V6" },
    { label: "13", v_equiv: "V7" },
    { label: "14", v_equiv: "V7" },
    { label: "15", v_equiv: "V8" },
  ],
};

/** BFF Tampines Hub top-rope wall — French, no lead. */
const BFF_ROPE_SCALE: GradeScale = {
  kind: "french",
  bands: FRENCH_GRADES.slice(
    FRENCH_GRADES.indexOf("4a"),
    FRENCH_GRADES.indexOf("7c+") + 1,
  ).map((label) => ({ label })),
};

function gym(
  name: string,
  country: string,
  outlets: Array<[outlet: string, city: string, climbing_types?: ClimbingType[]]>,
  scale: GradeScale | null = null,
  climbing_types: ClimbingType[] = BOULDER_ONLY,
  place_kind: PlaceKind = "gym",
): CatalogGym {
  return {
    name,
    country,
    place_kind,
    climbing_types: normalizeClimbingTypes(climbing_types),
    outlets: outlets.map(([outlet, city, types]) => ({
      name: outlet,
      city: catalogCity(country, city),
      ...(types && types.length
        ? { climbing_types: normalizeClimbingTypes(types) }
        : {}),
    })),
    scale,
  };
}

/**
 * Climbing places used to seed `gyms` / `gym_outlets` in Supabase.
 * Keep in sync with supabase/schema.sql. The stamp picker reads the database.
 * Outlet `name` is what the gym calls that location (Bugis, Bendemeer).
 * Outlet `city` is the city. Singapore is a city-state, so city is always Singapore.
 * Seeded catalog rows are place_kind `gym` (artificial).
 */
export const KNOWN_GYMS: CatalogGym[] = [
  gym(
    "Boulder Planet",
    "Singapore",
    [
      ["Sembawang", "Singapore"],
      ["Tai Seng", "Singapore"],
    ],
    BOULDER_PLANET_SCALE,
  ),
  gym("Boulder Planet", "Indonesia", [["Central Park", "Jakarta"]], BOULDER_PLANET_SCALE),
  gym(
    "Boulder Planet",
    "Thailand",
    [["Future Park Rangsit", "Bangkok"]],
    BOULDER_PLANET_SCALE,
  ),
  gym(
    "Boulder Movement",
    "Singapore",
    [
      ["Bugis", "Singapore"],
      ["Rochor", "Singapore"],
      ["Downtown", "Singapore"],
      ["Tai Seng", "Singapore"],
    ],
    {
      kind: "custom",
      bands: [
        ...Array.from({ length: 20 }, (_, index) => ({ label: String(index + 1) })),
        ...[1, 2, 3, 4, 5].map((n) => ({ label: `Flux ${n}` })),
      ],
    },
  ),
  gym(
    "Boulder+",
    "Singapore",
    [
      ["Aperia", "Singapore"],
      ["Chevrons", "Singapore"],
    ],
    {
      kind: "color",
      bands: colorBands([
        { label: "White", v: 1 },
        { label: "Yellow", v: 2 },
        { label: "Red", v: 3 },
        { label: "Blue", v: 4 },
        { label: "Purple", v: 5 },
        { label: "Green", v: 6 },
        { label: "Pink", v: 7 },
        { label: "Black", v: 8 },
      ]),
    },
  ),
  {
    ...gym(
      "BFF Climb",
      "Singapore",
      [
        ["Bendemeer", "Singapore", BOULDER_AND_ROPE],
        ["Tampines Yoha", "Singapore", BOULDER_ONLY],
        ["Tampines Hub", "Singapore", BOULDER_AND_ROPE],
      ],
      BFF_BOULDER_SCALE,
      BOULDER_AND_ROPE,
    ),
    scales: {
      bouldering: BFF_BOULDER_SCALE,
      top_rope: BFF_ROPE_SCALE,
    },
  },
  gym(
    "Climb Central",
    "Singapore",
    [
      ["The Kallang", "Singapore"],
      ["Funan", "Singapore"],
      ["Novena", "Singapore"],
      ["SAFRA Choa Chu Kang", "Singapore"],
    ],
    null,
    FULL_WALL,
  ),
  gym(
    "Fit Bloc",
    "Singapore",
    [
      ["Kent Ridge", "Singapore"],
      ["Depot Heights", "Singapore"],
      ["Telok Ayer", "Singapore"],
    ],
    {
      kind: "custom",
      bands: ["0 bar", "1 bar", "2 bar", "3 bar", "4 bar", "5 bar"].map((label) => ({
        label,
      })),
    },
    BOULDER_AND_ROPE,
  ),
  gym(
    "Kinetics Climbing",
    "Singapore",
    [["Serangoon", "Singapore"]],
    {
      kind: "v",
      bands: ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8"].map((label) => ({
        label,
        v_equiv: label,
      })),
    },
    BOULDER_AND_ROPE,
  ),
  gym("Lighthouse", "Singapore", [["Pasir Panjang", "Singapore"]], {
    kind: "number",
    bands: numberBands(1, 9, 1),
  }),
  gym("Climba", "Singapore", [["Robinson", "Singapore"]], {
    kind: "color",
    bands: [
      { label: "Blue", color: COLOR_GRADES.find((c) => c.label === "Blue")?.color, v_equiv: "V1", v_max: "V2" },
      { label: "Yellow", color: COLOR_GRADES.find((c) => c.label === "Yellow")?.color, v_equiv: "V3", v_max: "V4" },
      { label: "Red", color: COLOR_GRADES.find((c) => c.label === "Red")?.color, v_equiv: "V5", v_max: "V6" },
    ],
  }),
  gym("Ark Bloc", "Singapore", [["Punggol", "Singapore"]]),
  gym(
    "Ground Up",
    "Singapore",
    [["Tessensohn", "Singapore"]],
    {
      kind: "v",
      bands: ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8"].map((label) => ({
        label,
        v_equiv: label,
      })),
    },
    FULL_WALL,
  ),
  gym("OYEYO Boulder Home", "Singapore", [["Mackenzie", "Singapore"]]),
  gym("ClimbUp", "Singapore", [["Katong", "Singapore"]], null, FULL_WALL),
  gym("Z-Vertigo", "Singapore", [["Bukit Timah", "Singapore"]]),
  gym("Outpost Climbing", "Singapore", [["Lavender", "Singapore"]], null, FULL_WALL),
  gym("Upwall Climbing", "Singapore", [["Downtown East", "Singapore"]], null, ROPE_ONLY),
  gym(
    "Climb@T3",
    "Singapore",
    [["T3", "Singapore"]],
    {
      kind: "french",
      bands: FRENCH_GRADES.slice(0, FRENCH_GRADES.indexOf("6c+") + 1).map((label) => ({
        label,
      })),
    },
    BOULDER_AND_ROPE,
  ),
  gym("SAFRA Yishun", "Singapore", [["Yishun", "Singapore"]], null, FULL_WALL),
  gym("Adventure HQ", "Singapore", [["Khatib", "Singapore"]], null, BOULDER_AND_ROPE),
  {
    ...gym(
      "Camp5",
      "Malaysia",
      [
        ["1Utama", "Kuala Lumpur"],
        ["Eco City", "Kuala Lumpur"],
        ["Jumpa", "Kuala Lumpur"],
        ["KL East", "Kuala Lumpur"],
        ["Paradigm", "Johor Bahru"],
      ],
      CAMP5_BOULDER_SCALE,
      FULL_WALL,
    ),
    scales: {
      bouldering: CAMP5_BOULDER_SCALE,
      top_rope: CAMP5_ROPE_SCALE,
      lead: CAMP5_ROPE_SCALE,
    },
  },
];

const CLOSED_GYMS = new Set([
  "boruda",
  "the cliff",
  "project send",
  "boulder world",
  "onsight",
  "onsight climbing gym",
  "origin boulder",
  "the rock school",
  "clip n climb",
  "clip 'n climb",
]);

function gymKey(gym: Pick<CatalogGym, "name" | "country">): string {
  return `${gym.name.trim().toLowerCase()}\u001f${gym.country.trim().toLowerCase()}`;
}

export function normalizeCatalogStatus(
  value: string | null | undefined,
): CatalogStatus {
  if (value === "pending" || value === "rejected") return value;
  return "published";
}

export function isUnverifiedPlace(
  status: CatalogStatus | null | undefined,
): boolean {
  return status === "pending";
}

export function isClosedGym(name: string): boolean {
  return CLOSED_GYMS.has(name.trim().toLowerCase());
}

/** Drop leftover rows where the outlet was stored as the gym name. */
export function visibleOutlets(gym: Pick<CatalogGym, "name" | "outlets">): GymOutlet[] {
  const gymName = gym.name.trim().toLowerCase();
  return mergeOutlets(
    gym.outlets.filter((outlet) => outlet.name.trim().toLowerCase() !== gymName),
  );
}

export function hasMultipleOutlets(gym: Pick<CatalogGym, "name" | "outlets">): boolean {
  return visibleOutlets(gym).length > 1;
}

export function catalogGymSubtitle(
  gym: Pick<CatalogGym, "name" | "outlets">,
  city?: string,
): string {
  const outlets = city?.trim()
    ? outletsInCity({ outlets: visibleOutlets(gym) }, city)
    : visibleOutlets(gym);
  return outlets.length > 1 ? outlets.map((outlet) => outlet.name).join(" · ") : "";
}

export function mergeCatalogGyms(dbGyms: CatalogGym[]): CatalogGym[] {
  const map = new Map<string, CatalogGym>();

  for (const item of dbGyms) {
    if (isClosedGym(item.name)) continue;
    const known = findKnownGym(item.name, item.country);
    const fromDb = normalizeClimbingTypes(item.climbing_types);
    const fromKnown = normalizeClimbingTypes(known?.climbing_types);
    const climbing_types =
      fromKnown.length > 0
        ? fromKnown
        : fromDb.length > 0
          ? fromDb
          : DEFAULT_CLIMBING_TYPES;
    map.set(gymKey(item), {
      ...item,
      status: normalizeCatalogStatus(item.status),
      place_kind: normalizePlaceKind(item.place_kind ?? known?.place_kind),
      climbing_types,
      scale: item.scale?.bands.length
        ? item.scale
        : known?.scale ?? known?.scales?.bouldering ?? null,
      scales: mergeTypeScales(item.scales, known?.scales),
      outlets: visibleOutlets({
        name: item.name,
        outlets: known ? mergeOutlets(known.outlets, item.outlets) : item.outlets,
      }).filter((outlet) => outlet.status !== "rejected"),
    });
  }

  for (const item of KNOWN_GYMS) {
    if (isClosedGym(item.name) || map.has(gymKey(item))) continue;
    const climbing_types = normalizeClimbingTypes(item.climbing_types);
    map.set(gymKey(item), {
      ...item,
      status: "published",
      place_kind: normalizePlaceKind(item.place_kind),
      climbing_types: climbing_types.length > 0 ? climbing_types : DEFAULT_CLIMBING_TYPES,
      outlets: visibleOutlets(item),
      scales: item.scales,
    });
  }

  return [...map.values()].sort((a, b) => {
    if (a.country !== b.country) {
      const aSg = countryMeta(a.country).iso2 === "SG";
      const bSg = countryMeta(b.country).iso2 === "SG";
      if (aSg !== bSg) return aSg ? -1 : 1;
      return a.country.localeCompare(b.country);
    }
    return a.name.localeCompare(b.name);
  });
}

export function catalogCountries(gyms: CatalogGym[]): string[] {
  return unique(gyms.map((gym) => countryMeta(gym.country).name || gym.country));
}

/** Singapore is a city-state — outlet already names the neighbourhood. */
export function skipsCityStep(country: string): boolean {
  return countryMeta(country).iso2 === "SG";
}

/** City stored on an outlet. Singapore is the city, not the neighbourhood. */
export function catalogCity(country: string, city: string): string {
  return skipsCityStep(country) ? "Singapore" : city.trim();
}

export function sameCountry(a: string, b: string): boolean {
  const left = countryMeta(a);
  const right = countryMeta(b);
  if (left.iso2 && right.iso2) return left.iso2 === right.iso2;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function gymsInCountry(gyms: CatalogGym[], country: string): CatalogGym[] {
  return gyms.filter((gym) => sameCountry(gym.country, country));
}

/** Cities that have catalog places in this country — outlet `city`, never outlet name. */
export function catalogCities(gyms: CatalogGym[], country: string): string[] {
  return unique(
    gyms.flatMap((gym) =>
      sameCountry(gym.country, country) ? gym.outlets.map((outlet) => outlet.city) : [],
    ),
  );
}

export function gymsInCity(
  gyms: CatalogGym[],
  country: string,
  city: string,
): CatalogGym[] {
  const place = city.trim().toLowerCase();
  return gyms.filter(
    (gym) =>
      sameCountry(gym.country, country) &&
      gym.outlets.some((outlet) => outlet.city.toLowerCase() === place),
  );
}

export function outletsInCity(
  gym: Pick<CatalogGym, "outlets">,
  city: string,
): GymOutlet[] {
  const place = city.trim().toLowerCase();
  const matches = gym.outlets.filter((outlet) => outlet.city.toLowerCase() === place);
  return matches.length > 0 ? matches : gym.outlets;
}

export function scaleForClimb(
  gym: Pick<CatalogGym, "scale" | "scales"> | null | undefined,
  climbType?: ClimbingType | null,
): GradeScale | null {
  if (!gym) return null;
  if (climbType && gym.scales?.[climbType]?.bands.length) {
    return gym.scales[climbType] ?? null;
  }
  if (climbType && climbType !== "bouldering") {
    const rope = gym.scales?.top_rope ?? gym.scales?.lead;
    if (rope?.bands.length) return rope;
  }
  return gym.scale?.bands.length ? gym.scale : null;
}

/** Outlet override when present; otherwise the gym’s union of types. */
export function typesForOutlet(
  gym:
    | {
        climbing_types?: ClimbingType[] | null;
        outlets?: GymOutlet[] | null;
      }
    | null
    | undefined,
  outletName?: string | null,
): ClimbingType[] {
  const gymTypes = normalizeClimbingTypes(gym?.climbing_types);
  const fallback = gymTypes.length > 0 ? gymTypes : DEFAULT_CLIMBING_TYPES;
  if (!outletName?.trim() || !gym?.outlets?.length) return fallback;
  const outlet = gym.outlets.find(
    (item) => item.name.trim().toLowerCase() === outletName.trim().toLowerCase(),
  );
  const outletTypes = normalizeClimbingTypes(outlet?.climbing_types);
  return outletTypes.length > 0 ? outletTypes : fallback;
}

export function parseGymScaleRows(
  raw: unknown,
): { scale: GradeScale | null; scales?: Partial<Record<ClimbingType, GradeScale>> } {
  const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const scales: Partial<Record<ClimbingType, GradeScale>> = {};
  let fallback: GradeScale | null = null;

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as { kind?: string; bands?: GradeScale["bands"]; climbing_type?: string | null };
    const kind = isGradeSystem(String(item.kind ?? "")) ? (item.kind as GradeScale["kind"]) : "custom";
    const scale: GradeScale = { kind, bands: item.bands ?? [] };
    if (!scale.bands.length) continue;
    if (item.climbing_type && isClimbingType(item.climbing_type)) {
      scales[item.climbing_type] = scale;
    } else {
      fallback = scale;
    }
  }

  const typed = Object.values(scales).some((item) => item?.bands.length) ? scales : undefined;
  const scale =
    fallback ??
    typed?.bouldering ??
    typed?.top_rope ??
    typed?.lead ??
    null;
  return { scale, scales: typed };
}

export function knownScaleSeed(
  gym: CatalogGym,
): Array<{ climbing_type: ClimbingType | null; scale: GradeScale }> {
  if (gym.scales) {
    return CLIMBING_TYPES.flatMap((type) => {
      const scale = gym.scales?.[type];
      return scale?.bands.length ? [{ climbing_type: type, scale }] : [];
    });
  }
  return gym.scale?.bands.length ? [{ climbing_type: null, scale: gym.scale }] : [];
}

function mergeTypeScales(
  fromDb?: Partial<Record<ClimbingType, GradeScale>>,
  fromKnown?: Partial<Record<ClimbingType, GradeScale>>,
): Partial<Record<ClimbingType, GradeScale>> | undefined {
  const merged: Partial<Record<ClimbingType, GradeScale>> = {};
  for (const type of CLIMBING_TYPES) {
    const db = fromDb?.[type];
    const known = fromKnown?.[type];
    if (db?.bands.length) merged[type] = db;
    else if (known?.bands.length) merged[type] = known;
  }
  return Object.values(merged).some((item) => item?.bands.length) ? merged : undefined;
}

export function findKnownGym(name: string, country?: string): CatalogGym | undefined {
  const n = name.trim().toLowerCase();
  return KNOWN_GYMS.find((gym) => {
    if (gym.name.toLowerCase() !== n) return false;
    if (country && !sameCountry(gym.country, country)) return false;
    return true;
  });
}

export function searchKnownGyms(
  query: string,
  gyms: CatalogGym[] = KNOWN_GYMS,
  filters?: { country?: string; city?: string },
): CatalogGym[] {
  const q = query.trim().toLowerCase();
  const country = filters?.country?.trim();
  const city = filters?.city?.trim().toLowerCase();

  const filtered = gyms.filter((gym) => {
    if (country && !sameCountry(gym.country, country)) return false;
    if (city && !gym.outlets.some((outlet) => outlet.city.toLowerCase() === city)) {
      return false;
    }
    if (!q) return true;
    return (
      gym.name.toLowerCase().includes(q) ||
      gym.country.toLowerCase().includes(q) ||
      countryMeta(gym.country).name.toLowerCase().includes(q) ||
      countryMeta(gym.country).code.toLowerCase().includes(q) ||
      gym.outlets.some(
        (outlet) =>
          outlet.name.toLowerCase().includes(q) ||
          outlet.city.toLowerCase().includes(q),
      )
    );
  });

  return q ? filtered.slice(0, 12) : filtered.slice(0, 10);
}

export function defaultScaleFor(
  kind: GradeScale["kind"],
  from = 1,
  to = 12,
): GradeScale {
  if (kind === "number") {
    return { kind, bands: numberBands(from, to, 1) };
  }
  if (kind === "color") {
    return {
      kind,
      bands: COLOR_GRADES.slice(0, 8).map((item, index) => ({
        label: item.label,
        color: item.color,
        v_equiv: `V${index + 1}`,
      })),
    };
  }
  if (kind === "custom") {
    return { kind, bands: [] };
  }
  if (kind === "v") {
    return {
      kind,
      bands: ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9"].map(
        (label) => ({ label, v_equiv: label }),
      ),
    };
  }
  if (kind === "font") {
    return {
      kind,
      bands: FONT_GRADES.map((label) => ({ label })),
    };
  }
  if (kind === "french") {
    return {
      kind,
      bands: FRENCH_GRADES.map((label) => ({ label })),
    };
  }
  if (kind === "yds") {
    return {
      kind,
      bands: YDS_GRADES.map((label) => ({ label })),
    };
  }
  return { kind, bands: [] };
}

export function mergeOutlets(...lists: GymOutlet[][]): GymOutlet[] {
  const map = new Map<string, GymOutlet>();
  for (const list of lists) {
    for (const outlet of list) {
      const key = outlet.name.trim().toLowerCase();
      if (!key) continue;
      const prev = map.get(key);
      map.set(key, {
        id: prev?.id ?? outlet.id,
        name: prev?.name ?? outlet.name.trim(),
        city: (prev?.city || outlet.city).trim(),
        status: prev?.status ?? outlet.status,
        climbing_types: (() => {
          const next = normalizeClimbingTypes(outlet.climbing_types);
          const prior = normalizeClimbingTypes(prev?.climbing_types);
          const types = next.length > 0 ? next : prior;
          return types.length > 0 ? types : undefined;
        })(),
      });
    }
  }
  return [...map.values()];
}

function unique(values: string[]): string[] {
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
  return ordered.sort((a, b) => a.localeCompare(b));
}
