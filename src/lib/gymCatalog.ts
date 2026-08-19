import { COLOR_GRADES, numberRange } from "./grades";
import type { CatalogGym, GradeBand, GradeScale, GymOutlet } from "./types";

function vBands(
  labels: string[],
  startV = 1,
): GradeBand[] {
  return labels.map((label, index) => ({
    label,
    v_equiv: `V${Math.min(16, startV + index)}`,
  }));
}

function numberBands(from: number, to: number, startV = 1): GradeBand[] {
  return vBands(numberRange(from, to), startV);
}

function colorBands(
  names: { label: string; v: number }[],
): GradeBand[] {
  return names.map((item) => ({
    label: item.label,
    color: COLOR_GRADES.find((c) => c.label === item.label)?.color,
    v_equiv: `V${item.v}`,
  }));
}

export const KNOWN_GYMS: CatalogGym[] = [
  {
    name: "Boulder Planet",
    country: "Singapore",
    outlets: [
      { name: "Sembawang", city: "Singapore" },
      { name: "Tai Seng", city: "Singapore" },
    ],
    scale: { kind: "number", bands: numberBands(4, 12, 1) },
  },
  {
    name: "BFF Climbing",
    country: "Singapore",
    outlets: [{ name: "BFF", city: "Singapore" }],
    scale: {
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
  },
  {
    name: "Boulder+",
    country: "Singapore",
    outlets: [{ name: "Boulder+", city: "Singapore" }],
    scale: {
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
  },
  {
    name: "Lighthouse",
    country: "Singapore",
    outlets: [{ name: "Lighthouse", city: "Singapore" }],
    scale: { kind: "number", bands: numberBands(1, 9, 1) },
  },
  {
    name: "Fit Bloc",
    country: "Singapore",
    outlets: [{ name: "Fit Bloc", city: "Singapore" }],
    scale: { kind: "number", bands: numberBands(1, 8, 1) },
  },
  {
    name: "Ground Up",
    country: "Singapore",
    outlets: [{ name: "Ground Up", city: "Singapore" }],
    scale: {
      kind: "v",
      bands: ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8"].map((label) => ({
        label,
        v_equiv: label,
      })),
    },
  },
  {
    name: "Boruda",
    country: "Singapore",
    outlets: [{ name: "Boruda", city: "Singapore" }],
    scale: {
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
    },
  },
  {
    name: "Climba",
    country: "Singapore",
    outlets: [{ name: "Climba", city: "Singapore" }],
    scale: {
      kind: "color",
      bands: colorBands([
        { label: "Blue", v: 2 },
        { label: "Yellow", v: 4 },
        { label: "Red", v: 6 },
      ]),
    },
  },
];

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
  filters?: { country?: string; city?: string },
): CatalogGym[] {
  const q = query.trim().toLowerCase();
  const country = filters?.country?.trim().toLowerCase();
  const city = filters?.city?.trim().toLowerCase();

  let list = KNOWN_GYMS;
  if (country) {
    list = list.filter((gym) => gym.country.toLowerCase() === country);
  }
  if (city && city !== country) {
    list = list.filter((gym) =>
      gym.outlets.some((outlet) => outlet.city.toLowerCase().includes(city)),
    );
  }

  if (!q) return list.slice(0, 8);
  return list
    .filter(
      (gym) =>
        gym.name.toLowerCase().includes(q) ||
        gym.country.toLowerCase().includes(q) ||
        gym.outlets.some(
          (outlet) =>
            outlet.name.toLowerCase().includes(q) ||
            outlet.city.toLowerCase().includes(q),
        ),
    )
    .slice(0, 8);
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

export function mergeOutlets(
  ...lists: GymOutlet[][]
): GymOutlet[] {
  const map = new Map<string, GymOutlet>();
  for (const list of lists) {
    for (const outlet of list) {
      const key = outlet.name.trim().toLowerCase();
      if (!key || map.has(key)) continue;
      map.set(key, {
        name: outlet.name.trim(),
        city: outlet.city.trim(),
      });
    }
  }
  return [...map.values()];
}
