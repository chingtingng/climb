import { COLOR_GRADES, numberRange } from "./grades";
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

function colorBands(names: { label: string; v: number }[]): GradeBand[] {
  return names.map((item) => ({
    label: item.label,
    color: COLOR_GRADES.find((c) => c.label === item.label)?.color,
    v_equiv: `V${item.v}`,
  }));
}

const BOULDER_PLANET_SCALE: GradeScale = {
  kind: "number",
  bands: numberBands(4, 12, 1),
};

type OutletSpec = [outlet: string, city: string, aliases?: string[]];

function gym(
  name: string,
  country: string,
  outlets: OutletSpec[],
  scale: GradeScale | null = null,
): CatalogGym {
  return {
    name,
    country,
    outlets: outlets.map(([outlet, city, aliases]) => ({
      name: outlet,
      city,
      ...(aliases?.length ? { aliases } : {}),
    })),
    scale,
  };
}

/**
 * Indoor climbing / bouldering gyms.
 * Outlet `name` is what the gym calls that location (Bugis, not Bugis+).
 * `city` is the neighbourhood; aliases keep older mall labels matching.
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
    ["Bugis", "Bugis", ["Bugis+"]],
    ["Rochor", "Rochor", ["Tekka Place"]],
    ["Downtown", "Downtown", ["Downtown Gallery"]],
    ["Tai Seng", "Tai Seng"],
  ]),
  gym(
    "Boulder+",
    "Singapore",
    [
      ["Aperia", "Kallang", ["Aperia Mall"]],
      ["Chevrons", "Jurong East", ["The Chevrons"]],
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
      ["Bendemeer", "Bendemeer", ["CT Hub", "CT Hub 2"]],
      ["Tampines Yoha", "Tampines", ["yo:HA Commercial", "Yoha"]],
      ["Tampines Hub", "Tampines", ["Our Tampines Hub"]],
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
  gym("Climb Central", "Singapore", [
    ["The Kallang", "Kallang", ["Kallang Wave Mall"]],
    ["Funan", "Funan", ["Funan Mall"]],
    ["Novena", "Novena", ["Novena Square"]],
    ["SAFRA Choa Chu Kang", "Choa Chu Kang", ["SAFRA CCK"]],
  ]),
  gym(
    "Fit Bloc",
    "Singapore",
    [
      ["Kent Ridge", "Kent Ridge", ["Oasis"]],
      ["Depot Heights", "Depot Heights", ["Depot Heights Shopping Centre"]],
      ["Telok Ayer", "Telok Ayer", ["MND Building"]],
    ],
    { kind: "number", bands: numberBands(1, 8, 1) },
  ),
  gym("Kinetics Climbing", "Singapore", [["Serangoon", "Serangoon"]]),
  gym("Lighthouse", "Singapore", [["Pasir Panjang", "Pasir Panjang"]], {
    kind: "number",
    bands: numberBands(1, 9, 1),
  }),
  gym("Climba", "Singapore", [["Robinson", "CBD", ["Robinson Centre"]]], {
    kind: "color",
    bands: colorBands([
      { label: "Blue", v: 2 },
      { label: "Yellow", v: 4 },
      { label: "Red", v: 6 },
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
  gym("OYEYO Boulder Home", "Singapore", [["Mackenzie", "Rochor", ["Mackenzie Road"]]]),
  gym("ClimbUp", "Singapore", [["Katong", "Katong", ["i12 Katong"]]]),
  gym("Z-Vertigo", "Singapore", [["Bukit Timah", "Bukit Timah", ["Bukit Timah Shopping Centre"]]]),
  gym("Outpost Climbing", "Singapore", [["Lavender", "Lavender", ["Crawford Lane"]]]),
  gym("Upwall Climbing", "Singapore", [["Downtown East", "Pasir Ris"]]),
  gym("Project Send", "Singapore", [["Esplanade", "Esplanade", ["Esplanade Mall"]]]),
  gym("Climb@T3", "Singapore", [["T3", "Changi", ["Changi Airport T3", "Changi Airport Terminal 3"]]]),
  gym("The Cliff", "Singapore", [["Snow City", "Jurong East"]]),
  gym("SAFRA Yishun", "Singapore", [["Yishun", "Yishun", ["Adventure Centre"]]]),
  gym("Boruda", "Singapore", [["Boruda", "Singapore"]], {
    kind: "custom",
    bands: [
      { label: "7Q", v_equiv: "V1" },
      { label: "6Q", v_equiv: "V2" },
      { label: "5Q", v_equiv: "V3" },
      { label: "4Q", v_equiv: "V4" },
      { label: "3Q", v_equiv: "V5" },
      { label: "2Q", v_equiv: "V6" },
      { label: "1Q", v_equiv: "V7" },
      { label: "1D", v_equiv: "V8" },
      { label: "2D", v_equiv: "V9" },
    ],
  }),
];

function gymKey(gym: Pick<CatalogGym, "name" | "country">): string {
  return `${gym.name.trim().toLowerCase()}\u001f${gym.country.trim().toLowerCase()}`;
}

export function mergeCatalogGyms(dbGyms: CatalogGym[]): CatalogGym[] {
  const map = new Map<string, CatalogGym>();
  for (const item of KNOWN_GYMS) {
    map.set(gymKey(item), { ...item, outlets: [...item.outlets] });
  }
  for (const item of dbGyms) {
    const key = gymKey(item);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }
    map.set(key, {
      ...existing,
      id: item.id ?? existing.id,
      scale: item.scale?.bands.length ? item.scale : existing.scale,
      outlets: mergeOutlets(existing.outlets, item.outlets),
    });
  }
  return [...map.values()].sort((a, b) => {
    if (a.country !== b.country) {
      if (a.country === "Singapore") return -1;
      if (b.country === "Singapore") return 1;
      return a.country.localeCompare(b.country);
    }
    return a.name.localeCompare(b.name);
  });
}

export function catalogCountries(gyms: CatalogGym[]): string[] {
  return unique(gyms.map((gym) => gym.country));
}

/** Singapore is a city-state — outlet already names the neighbourhood. */
export function skipsCityStep(country: string): boolean {
  return country.trim().toLowerCase() === "singapore";
}

export function gymsInCountry(gyms: CatalogGym[], country: string): CatalogGym[] {
  const c = country.trim().toLowerCase();
  return gyms.filter((gym) => gym.country.toLowerCase() === c);
}

export function catalogCities(gyms: CatalogGym[], country: string): string[] {
  const c = country.trim().toLowerCase();
  return unique(
    gyms.flatMap((gym) =>
      gym.country.toLowerCase() === c ? gym.outlets.map((outlet) => outlet.city) : [],
    ),
  );
}

export function gymsInCity(
  gyms: CatalogGym[],
  country: string,
  city: string,
): CatalogGym[] {
  const c = country.trim().toLowerCase();
  const place = city.trim().toLowerCase();
  return gyms.filter(
    (gym) =>
      gym.country.toLowerCase() === c &&
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
  const c = country?.trim().toLowerCase();
  return KNOWN_GYMS.find((gym) => {
    if (gym.name.toLowerCase() !== n) return false;
    if (c && gym.country.toLowerCase() !== c) return false;
    return true;
  });
}

export function searchKnownGyms(
  query: string,
  gyms: CatalogGym[] = KNOWN_GYMS,
  filters?: { country?: string; city?: string },
): CatalogGym[] {
  const q = query.trim().toLowerCase();
  const country = filters?.country?.trim().toLowerCase();
  const city = filters?.city?.trim().toLowerCase();

  const filtered = gyms.filter((gym) => {
    if (country && gym.country.toLowerCase() !== country) return false;
    if (city && !gym.outlets.some((outlet) => outlet.city.toLowerCase() === city)) {
      return false;
    }
    if (!q) return true;
    return (
      gym.name.toLowerCase().includes(q) ||
      gym.country.toLowerCase().includes(q) ||
      gym.outlets.some(
        (outlet) =>
          outlet.name.toLowerCase().includes(q) ||
          outlet.city.toLowerCase().includes(q) ||
          (outlet.aliases ?? []).some((alias) => alias.toLowerCase().includes(q)),
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
  return { kind, bands: [] };
}

export function mergeOutlets(...lists: GymOutlet[][]): GymOutlet[] {
  const aliasToCanonical = new Map<string, string>();

  for (const list of lists) {
    for (const outlet of list) {
      const canonical = outlet.name.trim();
      if (!canonical) continue;
      const existing = aliasToCanonical.get(normalizeKey(canonical));
      if (existing && existing.toLowerCase() !== canonical.toLowerCase()) {
        continue;
      }
      if (!existing) aliasToCanonical.set(normalizeKey(canonical), canonical);
      for (const alias of outlet.aliases ?? []) {
        const trimmed = alias.trim();
        if (!trimmed) continue;
        if (!aliasToCanonical.has(normalizeKey(trimmed))) {
          aliasToCanonical.set(normalizeKey(trimmed), canonical);
        }
      }
    }
  }

  const map = new Map<string, GymOutlet>();
  for (const list of lists) {
    for (const outlet of list) {
      const raw = outlet.name.trim();
      if (!raw) continue;
      const canonical = aliasToCanonical.get(normalizeKey(raw)) ?? raw;
      const key = normalizeKey(canonical);
      const prev = map.get(key);
      const aliases = unique([
        ...(prev?.aliases ?? []),
        ...(outlet.aliases ?? []),
        raw !== canonical ? raw : "",
      ]).filter((alias) => alias.toLowerCase() !== canonical.toLowerCase());
      map.set(key, {
        id: prev?.id ?? outlet.id,
        name: prev?.name ?? canonical,
        city: (prev?.city || outlet.city).trim(),
        ...(aliases.length ? { aliases } : {}),
      });
    }
  }
  return [...map.values()];
}

/** Map a typed or stored label onto the gym's own outlet name. */
export function resolveCatalogOutlet(gym: CatalogGym, name: string): GymOutlet {
  const n = name.trim().toLowerCase();
  const match = gym.outlets.find(
    (outlet) =>
      outlet.name.toLowerCase() === n ||
      (outlet.aliases ?? []).some((alias) => alias.toLowerCase() === n),
  );
  return match ?? { name: name.trim(), city: name.trim() };
}

export function canonicalOutletName(
  gymName: string,
  country: string,
  outletName: string,
): string {
  const known = findKnownGym(gymName, country);
  if (!known || !outletName.trim()) return outletName;
  return resolveCatalogOutlet(known, outletName).name || outletName;
}

export function outletLookupNames(outlet: Pick<GymOutlet, "name" | "aliases">): string[] {
  return [outlet.name, ...(outlet.aliases ?? [])].map((item) => item.trim()).filter(Boolean);
}

export function findOutletByLabel(outlets: GymOutlet[], name: string): GymOutlet | undefined {
  const n = name.trim().toLowerCase();
  return outlets.find(
    (outlet) =>
      outlet.name.toLowerCase() === n ||
      (outlet.aliases ?? []).some((alias) => alias.toLowerCase() === n),
  );
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
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
