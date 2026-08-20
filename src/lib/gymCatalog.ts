import {
  COLOR_GRADES,
  FRENCH_GRADES,
  FONT_GRADES,
  YDS_GRADES,
  numberRange,
} from "./grades";
import { countryMeta } from "./countries";
import {
  DEFAULT_CLIMBING_TYPES,
  normalizeClimbingTypes,
  type ClimbingType,
} from "./climbingTypes";
import { normalizePlaceKind, type PlaceKind } from "./placeKinds";
import type { CatalogGym, GradeBand, GradeScale, GymOutlet } from "./types";

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
const FULL_WALL: ClimbingType[] = ["bouldering", "top_rope", "lead"];

function gym(
  name: string,
  country: string,
  outlets: Array<[outlet: string, city: string]>,
  scale: GradeScale | null = null,
  climbing_types: ClimbingType[] = BOULDER_ONLY,
  place_kind: PlaceKind = "gym",
): CatalogGym {
  return {
    name,
    country,
    place_kind,
    climbing_types: normalizeClimbingTypes(climbing_types),
    outlets: outlets.map(([outlet, city]) => ({ name: outlet, city })),
    scale,
  };
}

/**
 * Climbing places used to seed `gyms` / `gym_outlets` in Supabase.
 * The stamp picker reads the database; add or remove places there (or in this seed).
 * Outlet `name` is what the gym calls that location (Bugis, Bendemeer).
 * Seeded catalog rows are place_kind `gym` (artificial).
 */
export const KNOWN_GYMS: CatalogGym[] = [
  gym(
    "Boulder Planet",
    "Singapore",
    [
      ["Sembawang", "Sembawang"],
      ["Tai Seng", "Tai Seng"],
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
  gym("Boulder Movement", "Singapore", [
    ["Bugis", "Bugis"],
    ["Rochor", "Rochor"],
    ["Downtown", "Downtown"],
    ["Tai Seng", "Tai Seng"],
  ]),
  gym(
    "Boulder+",
    "Singapore",
    [
      ["Aperia", "Kallang"],
      ["Chevrons", "Jurong East"],
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
  gym(
    "BFF Climbing",
    "Singapore",
    [
      ["Bendemeer", "Bendemeer"],
      ["Tampines Yoha", "Tampines"],
      ["Tampines Hub", "Tampines"],
    ],
    {
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
    },
  ),
  gym(
    "Climb Central",
    "Singapore",
    [
      ["The Kallang", "Kallang"],
      ["Funan", "Funan"],
      ["Novena", "Novena"],
      ["SAFRA Choa Chu Kang", "Choa Chu Kang"],
    ],
    null,
    FULL_WALL,
  ),
  gym(
    "Fit Bloc",
    "Singapore",
    [
      ["Kent Ridge", "Kent Ridge"],
      ["Depot Heights", "Depot Heights"],
      ["Telok Ayer", "Telok Ayer"],
    ],
    { kind: "number", bands: numberBands(1, 8, 1) },
    FULL_WALL,
  ),
  gym("Kinetics Climbing", "Singapore", [["Serangoon", "Serangoon"]], null, FULL_WALL),
  gym("Lighthouse", "Singapore", [["Pasir Panjang", "Pasir Panjang"]], {
    kind: "number",
    bands: numberBands(1, 9, 1),
  }),
  gym("Climba", "Singapore", [["Robinson", "CBD"]], {
    kind: "color",
    bands: colorBands([
      { label: "Blue", v: 1 },
      { label: "Yellow", v: 3 },
      { label: "Red", v: 7 },
    ]),
  }),
  gym("Ark Bloc", "Singapore", [["Punggol", "Punggol"]]),
  gym("Ground Up", "Singapore", [["Tessensohn", "Farrer Park"]], {
    kind: "v",
    bands: ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8"].map((label) => ({
      label,
      v_equiv: label,
    })),
  }),
  gym("OYEYO Boulder Home", "Singapore", [["Mackenzie", "Rochor"]]),
  gym("ClimbUp", "Singapore", [["Katong", "Katong"]], null, FULL_WALL),
  gym("Z-Vertigo", "Singapore", [["Bukit Timah", "Bukit Timah"]]),
  gym("Outpost Climbing", "Singapore", [["Lavender", "Lavender"]], null, FULL_WALL),
  gym("Upwall Climbing", "Singapore", [["Downtown East", "Pasir Ris"]], null, ROPE_ONLY),
  gym("Project Send", "Singapore", [["Esplanade", "Esplanade"]]),
  gym("Climb@T3", "Singapore", [["T3", "Changi"]], null, ROPE_ONLY),
  gym("SAFRA Yishun", "Singapore", [["Yishun", "Yishun"]], null, FULL_WALL),
];

const CLOSED_GYMS = new Set(["boruda", "the cliff"]);

function gymKey(gym: Pick<CatalogGym, "name" | "country">): string {
  return `${gym.name.trim().toLowerCase()}\u001f${gym.country.trim().toLowerCase()}`;
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

export function catalogGymSubtitle(gym: Pick<CatalogGym, "name" | "outlets">): string {
  const outlets = visibleOutlets(gym);
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
      fromDb.length > 0
        ? fromDb
        : fromKnown.length > 0
          ? fromKnown
          : DEFAULT_CLIMBING_TYPES;
    map.set(gymKey(item), {
      ...item,
      place_kind: normalizePlaceKind(item.place_kind ?? known?.place_kind),
      climbing_types,
      scale: item.scale?.bands.length ? item.scale : known?.scale ?? null,
      outlets: visibleOutlets({
        name: item.name,
        outlets: known ? mergeOutlets(known.outlets, item.outlets) : item.outlets,
      }),
    });
  }

  for (const item of KNOWN_GYMS) {
    if (isClosedGym(item.name) || map.has(gymKey(item))) continue;
    const climbing_types = normalizeClimbingTypes(item.climbing_types);
    map.set(gymKey(item), {
      ...item,
      place_kind: normalizePlaceKind(item.place_kind),
      climbing_types: climbing_types.length > 0 ? climbing_types : DEFAULT_CLIMBING_TYPES,
      outlets: visibleOutlets(item),
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

export function outletsInCity(gym: CatalogGym, city: string): GymOutlet[] {
  const place = city.trim().toLowerCase();
  const matches = gym.outlets.filter((outlet) => outlet.city.toLowerCase() === place);
  return matches.length > 0 ? matches : gym.outlets;
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
