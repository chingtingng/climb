import { countryCode, countryMeta, countryName } from "./countries";
import { catalogCity, skipsCityStep } from "./gymCatalog";
import { displayGrade, gradeSortValue } from "./grades";
import { normalizePlaceKind } from "./placeKinds";
import type {
  CatalogGym,
  GradeSystem,
  GymGroup,
  GymVisit,
  PassportStats,
  PlaceKind,
} from "./types";

export function gymSlug(name: string, country: string): string {
  return `${slugPart(name)}--${slugPart(country)}`;
}

export function legacyGymSlug(name: string, city: string, country: string): string {
  return [name, city, country].map((part) => slugPart(part)).join("--");
}

function slugPart(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "x"
  );
}

export function gymKey(name: string, country: string): string {
  return [name, country].map((part) => part.trim().toLowerCase()).join("\u001f");
}

export function visitOutlet(visit: GymVisit): string {
  return visit.outlet?.trim() || visit.city;
}

export function formatVisitPlace(visit: GymVisit): string {
  const outlet = visitOutlet(visit);
  const country = countryCode(visit.country) || visit.country.trim();
  if (outlet.toLowerCase() === visit.country.trim().toLowerCase()) {
    return country;
  }
  if (outlet.toLowerCase() === visit.city.trim().toLowerCase()) {
    return `${visit.city} · ${country}`;
  }
  return `${outlet} · ${country}`;
}

export function groupVisitsByGym(
  visits: GymVisit[],
  catalogGyms: CatalogGym[] = [],
): GymGroup[] {
  const map = new Map<string, GymVisit[]>();
  const labels = new Map<string, { gymId: string; name: string; country: string }>();
  const kindByKey = new Map<string, ReturnType<typeof normalizePlaceKind>>();
  for (const gym of catalogGyms) {
    kindByKey.set(gymKey(gym.name, gym.country), normalizePlaceKind(gym.place_kind));
    if (gym.id) kindByKey.set(gym.id, normalizePlaceKind(gym.place_kind));
  }

  for (const visit of visits) {
    const key = visit.gym_id || gymKey(visit.gym_name, visit.country);
    const list = map.get(key);
    if (list) {
      list.push(visit);
    } else {
      map.set(key, [visit]);
      labels.set(key, {
        gymId: visit.gym_id,
        name: visit.gym_name,
        country: visit.country,
      });
    }
  }

  const gyms: GymGroup[] = [];
  for (const [key, gymVisits] of map) {
    const label = labels.get(key)!;
    const sorted = [...gymVisits].sort((a, b) => {
      if (a.visited_on === b.visited_on) {
        return b.created_at.localeCompare(a.created_at);
      }
      return b.visited_on.localeCompare(a.visited_on);
    });
    const best = [...gymVisits].sort(
      (a, b) =>
        gradeSortValue(b.grade_system, b.highest_grade, b.v_equiv) -
        gradeSortValue(a.grade_system, a.highest_grade, a.v_equiv),
    )[0];

    const outlets: string[] = [];
    const seen = new Set<string>();
    const gymName = label.name.trim().toLowerCase();
    for (const visit of sorted) {
      const outlet = visitOutlet(visit);
      const outletKey = outlet.toLowerCase();
      if (!outletKey || outletKey === gymName || seen.has(outletKey)) continue;
      seen.add(outletKey);
      outlets.push(outlet);
    }

    const place_kind =
      kindByKey.get(label.gymId) ??
      kindByKey.get(gymKey(label.name, label.country)) ??
      "gym";

    gyms.push({
      slug: gymSlug(label.name, label.country),
      gymId: label.gymId,
      name: label.name,
      // Outlet label for display (e.g. Sunway Square), not gym_outlets.city.
      city: sorted[0] ? visitOutlet(sorted[0]) : "",
      country: label.country,
      place_kind,
      outlets,
      visits: sorted,
      visitCount: sorted.length,
      lastVisited: sorted[0]?.visited_on ?? "",
      bestGrade: best?.highest_grade ?? "",
      bestGradeSystem: best?.grade_system ?? "v",
      bestVEquiv: best?.v_equiv ?? null,
    });
  }

  return gyms.sort((a, b) => b.lastVisited.localeCompare(a.lastVisited));
}

export function findGymBySlug(gyms: GymGroup[], slug: string): GymGroup | undefined {
  const exact = gyms.find((gym) => gym.slug === slug);
  if (exact) return exact;
  return gyms.find((gym) =>
    gym.visits.some(
      (visit) => legacyGymSlug(visit.gym_name, visit.city, visit.country) === slug,
    ),
  );
}

export function computeStats(visits: GymVisit[], gyms: GymGroup[]): PassportStats {
  const cities = new Set(
    visits.map((visit) => {
      const city = visitCityLabel(visit);
      return `${city.toLowerCase()}\u001f${visit.country.trim().toLowerCase()}`;
    }),
  );
  const countries = new Set(gyms.map((gym) => gym.country.trim().toLowerCase()));

  const bestVisit = [...visits].sort(
    (a, b) =>
      gradeSortValue(b.grade_system, b.highest_grade, b.v_equiv) -
      gradeSortValue(a.grade_system, a.highest_grade, a.v_equiv),
  )[0];

  const mostVisitedGym =
    [...gyms].sort((a, b) => {
      if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
      return b.lastVisited.localeCompare(a.lastVisited);
    })[0] ?? null;

  const cityCounts = new Map<
    string,
    { label: string; country: string; count: number; last: string; gyms: Set<string> }
  >();
  for (const visit of visits) {
    const cityLabel = visitCityLabel(visit);
    const key = `${cityLabel.toLowerCase()}\u001f${visit.country.trim().toLowerCase()}`;
    const current = cityCounts.get(key);
    const gymId = visit.gym_id || visit.gym_name.trim().toLowerCase();
    if (current) {
      current.count += 1;
      current.gyms.add(gymId);
      if (visit.visited_on > current.last) current.last = visit.visited_on;
    } else {
      cityCounts.set(key, {
        label: cityLabel,
        country: visit.country.trim(),
        count: 1,
        last: visit.visited_on,
        gyms: new Set([gymId]),
      });
    }
  }

  const favourite =
    [...cityCounts.values()].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.last.localeCompare(a.last);
    })[0] ?? null;

  const favouriteCity = favourite
    ? {
        name: favourite.label,
        country: favourite.country,
        gymCount: favourite.gyms.size,
        sessionCount: favourite.count,
      }
    : null;

  return {
    gyms: gyms.length,
    cities: cities.size,
    countries: countries.size,
    bestSend: bestVisit
      ? displayGrade(
          bestVisit.grade_system,
          bestVisit.highest_grade,
          bestVisit.v_equiv,
        ).grade
      : null,
    mostVisitedGym,
    favouriteCity,
  };
}

export function uniqueCountries(gyms: GymGroup[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const gym of gyms) {
    const meta = countryMeta(gym.country);
    const key = meta.iso2 || gym.country.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(gym.country);
  }
  return ordered;
}

export function formatGymPlace(gym: GymGroup): string {
  const country = countryCode(gym.country) || gym.country.trim();
  if (gym.outlets.length > 1) {
    return `${gym.outlets.join(" · ")} · ${country}`;
  }
  if (gym.city) return `${gym.city} · ${country}`;
  return country;
}


/** A gym branch the user has actually visited. */
export type VisitedOutlet = {
  key: string;
  slug: string;
  placeKey: string;
  gymName: string;
  place_kind: PlaceKind;
  country: string;
  city: string;
  outlet: string;
  visitCount: number;
  lastVisited: string;
  bestGrade: string;
  bestGradeSystem: GradeSystem;
  bestVEquiv?: string | null;
};

/** A brand / crag — Fit Bloc, BFF Climb, Gua Damai XPark. */
export type LocationPlaceGroup = {
  key: string;
  slug: string;
  name: string;
  place_kind: PlaceKind;
  country: string;
  outlets: VisitedOutlet[];
  visitCount: number;
  lastVisited: string;
  bestGrade: string;
  bestGradeSystem: GradeSystem;
  bestVEquiv?: string | null;
};

export type LocationCityGroup = {
  key: string;
  city: string;
  country: string;
  places: LocationPlaceGroup[];
  visitCount: number;
  lastVisited: string;
};

export type LocationCountryGroup = {
  key: string;
  country: string;
  /** Singapore is a city-state — neighbourhoods are outlets, not cities. */
  skipCity: boolean;
  cities: LocationCityGroup[];
  places: LocationPlaceGroup[];
  visitCount: number;
  lastVisited: string;
};

function locationCountryKey(country: string): string {
  const meta = countryMeta(country);
  return meta.iso2 || country.trim().toLowerCase();
}

function countriesMatch(a: string, b: string): boolean {
  const left = countryMeta(a);
  const right = countryMeta(b);
  if (left.iso2 && right.iso2) return left.iso2 === right.iso2;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function visitCityLabel(visit: GymVisit): string {
  return catalogCity(visit.country, visit.city.trim() || visit.country.trim());
}

function maxDate(left: string, right: string): string {
  return right > left ? right : left;
}

function betterVisit(left: GymVisit, right: GymVisit): GymVisit {
  return gradeSortValue(right.grade_system, right.highest_grade, right.v_equiv) >
    gradeSortValue(left.grade_system, left.highest_grade, left.v_equiv)
    ? right
    : left;
}

function rollupLastVisited(items: { lastVisited: string }[]): string {
  return items.reduce((last, item) => maxDate(last, item.lastVisited), "");
}

function rollupVisitCount(items: { visitCount: number }[]): number {
  return items.reduce((total, item) => total + item.visitCount, 0);
}

function countLabel(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function sortOutlets(outlets: VisitedOutlet[]): VisitedOutlet[] {
  return [...outlets].sort((a, b) => a.outlet.localeCompare(b.outlet));
}

function sortPlaces(places: LocationPlaceGroup[]): LocationPlaceGroup[] {
  return [...places].sort((a, b) => a.name.localeCompare(b.name));
}

function bestFromOutlets(outlets: VisitedOutlet[]): VisitedOutlet {
  return [...outlets].sort(
    (a, b) =>
      gradeSortValue(b.bestGradeSystem, b.bestGrade, b.bestVEquiv) -
      gradeSortValue(a.bestGradeSystem, a.bestGrade, a.bestVEquiv),
  )[0];
}

function withPlaceRollup(
  place: Omit<
    LocationPlaceGroup,
    "visitCount" | "lastVisited" | "bestGrade" | "bestGradeSystem" | "bestVEquiv"
  > &
    Partial<
      Pick<
        LocationPlaceGroup,
        "visitCount" | "lastVisited" | "bestGrade" | "bestGradeSystem" | "bestVEquiv"
      >
    >,
): LocationPlaceGroup {
  const outlets = sortOutlets(place.outlets);
  const best = bestFromOutlets(outlets);
  return {
    ...place,
    outlets,
    visitCount: rollupVisitCount(outlets),
    lastVisited: rollupLastVisited(outlets),
    bestGrade: best?.bestGrade ?? "",
    bestGradeSystem: best?.bestGradeSystem ?? "v",
    bestVEquiv: best?.bestVEquiv ?? null,
  };
}

function withCityRollup(
  city: Omit<LocationCityGroup, "visitCount" | "lastVisited"> &
    Partial<Pick<LocationCityGroup, "visitCount" | "lastVisited">>,
): LocationCityGroup {
  const places = sortPlaces(city.places.map((place) => withPlaceRollup(place)));
  return {
    ...city,
    places,
    visitCount: rollupVisitCount(places),
    lastVisited: rollupLastVisited(places),
  };
}

function mergePlaces(places: LocationPlaceGroup[]): LocationPlaceGroup[] {
  const map = new Map<string, LocationPlaceGroup>();
  for (const place of places) {
    const current = map.get(place.key);
    if (!current) {
      map.set(place.key, withPlaceRollup({ ...place, outlets: [...place.outlets] }));
      continue;
    }
    const seen = new Set(current.outlets.map((outlet) => outlet.key));
    const outlets = [...current.outlets];
    for (const outlet of place.outlets) {
      if (seen.has(outlet.key)) continue;
      seen.add(outlet.key);
      outlets.push(outlet);
    }
    map.set(place.key, withPlaceRollup({ ...current, outlets }));
  }
  return sortPlaces([...map.values()]);
}

function placesFromOutlets(outlets: VisitedOutlet[]): LocationPlaceGroup[] {
  const map = new Map<string, VisitedOutlet[]>();
  for (const outlet of outlets) {
    const list = map.get(outlet.placeKey);
    if (list) list.push(outlet);
    else map.set(outlet.placeKey, [outlet]);
  }
  return [...map.values()].map((group) => {
    const first = group[0];
    return withPlaceRollup({
      key: first.placeKey,
      slug: first.slug,
      name: first.gymName,
      place_kind: first.place_kind,
      country: first.country,
      outlets: group,
    });
  });
}

function withCountryRollup(
  country: Omit<LocationCountryGroup, "visitCount" | "lastVisited" | "places" | "skipCity"> &
    Partial<Pick<LocationCountryGroup, "visitCount" | "lastVisited" | "places" | "skipCity">>,
): LocationCountryGroup {
  const skipCity = skipsCityStep(country.country);
  const cities = skipCity
    ? []
    : [...country.cities].sort((a, b) => a.city.localeCompare(b.city));
  const places = mergePlaces(
    country.places ?? cities.flatMap((city) => city.places),
  );
  return {
    ...country,
    skipCity,
    cities,
    places,
    visitCount: rollupVisitCount(places),
    lastVisited: rollupLastVisited(places),
  };
}

/** Group visited outlets by country → city → place, A–Z. */
export function groupVisitsByLocation(
  visits: GymVisit[],
  gyms: GymGroup[] = [],
): LocationCountryGroup[] {
  const gymById = new Map<string, GymGroup>();
  const gymByKey = new Map<string, GymGroup>();
  for (const gym of gyms) {
    if (gym.gymId) gymById.set(gym.gymId, gym);
    gymByKey.set(gymKey(gym.name, gym.country), gym);
  }

  type OutletBucket = {
    key: string;
    placeKey: string;
    slug: string;
    gymName: string;
    place_kind: PlaceKind;
    country: string;
    city: string;
    outlet: string;
    visits: GymVisit[];
    best: GymVisit;
  };

  const outlets = new Map<string, OutletBucket>();

  for (const visit of visits) {
    const gym =
      (visit.gym_id ? gymById.get(visit.gym_id) : undefined) ??
      gymByKey.get(gymKey(visit.gym_name, visit.country));
    const city = visitCityLabel(visit);
    const outlet = visitOutlet(visit);
    const placeKey = visit.gym_id || gymKey(visit.gym_name, visit.country);
    const key =
      visit.outlet_id ||
      `${placeKey}\u001f${outlet.toLowerCase()}\u001f${city.toLowerCase()}`;
    const current = outlets.get(key);
    if (current) {
      current.visits.push(visit);
      current.best = betterVisit(current.best, visit);
      continue;
    }
    outlets.set(key, {
      key,
      placeKey,
      slug: gym?.slug ?? gymSlug(visit.gym_name, visit.country),
      gymName: gym?.name ?? visit.gym_name,
      place_kind: gym?.place_kind ?? "gym",
      country: gym?.country ?? visit.country,
      city,
      outlet,
      visits: [visit],
      best: visit,
    });
  }

  const countries = new Map<
    string,
    {
      country: string;
      cities: Map<string, { city: string; outlets: VisitedOutlet[] }>;
      outlets: VisitedOutlet[];
    }
  >();

  for (const bucket of outlets.values()) {
    const visited: VisitedOutlet = {
      key: bucket.key,
      slug: bucket.slug,
      placeKey: bucket.placeKey,
      gymName: bucket.gymName,
      place_kind: bucket.place_kind,
      country: bucket.country,
      city: bucket.city,
      outlet: bucket.outlet,
      visitCount: bucket.visits.length,
      lastVisited: bucket.visits.reduce(
        (last, visit) => maxDate(last, visit.visited_on),
        "",
      ),
      bestGrade: bucket.best.highest_grade,
      bestGradeSystem: bucket.best.grade_system,
      bestVEquiv: bucket.best.v_equiv ?? null,
    };

    const countryKey = locationCountryKey(bucket.country);
    let country = countries.get(countryKey);
    if (!country) {
      country = { country: bucket.country, cities: new Map(), outlets: [] };
      countries.set(countryKey, country);
    }
    country.outlets.push(visited);

    const cityKey = bucket.city.trim().toLowerCase();
    let city = country.cities.get(cityKey);
    if (!city) {
      city = { city: bucket.city, outlets: [] };
      country.cities.set(cityKey, city);
    }
    city.outlets.push(visited);
  }

  return [...countries.entries()]
    .map(([key, country]) =>
      withCountryRollup({
        key,
        country: country.country,
        cities: [...country.cities.entries()].map(([cityKey, city]) =>
          withCityRollup({
            key: `${key}\u001f${cityKey}`,
            city: city.city,
            country: country.country,
            places: placesFromOutlets(city.outlets),
          }),
        ),
        places: placesFromOutlets(country.outlets),
      }),
    )
    .sort((a, b) =>
      (countryName(a.country) || a.country).localeCompare(
        countryName(b.country) || b.country,
      ),
    );
}

function countryMatchesQuery(country: string, query: string): boolean {
  return countrySearchText(country).includes(query);
}

function countrySearchText(country: string): string {
  const meta = countryMeta(country);
  return `${country} ${meta.name} ${meta.code} ${meta.iso2} ${meta.iso3}`.toLowerCase();
}

function outletMatchesQuery(outlet: VisitedOutlet, query: string): boolean {
  return `${outlet.gymName} ${outlet.outlet} ${outlet.city}`.toLowerCase().includes(query);
}

function filterPlaces(
  places: LocationPlaceGroup[],
  query: string,
  keepAll: boolean,
): LocationPlaceGroup[] {
  if (keepAll) return places;
  const next: LocationPlaceGroup[] = [];
  for (const place of places) {
    if (place.name.toLowerCase().includes(query)) {
      next.push(place);
      continue;
    }
    const outlets = place.outlets.filter((outlet) => outletMatchesQuery(outlet, query));
    if (outlets.length === 0) continue;
    next.push(withPlaceRollup({ ...place, outlets }));
  }
  return next;
}

/** Keep countries / cities / places that match a search or country chip. */
export function filterLocationGroups(
  groups: LocationCountryGroup[],
  query: string,
  countryFilter = "All",
): LocationCountryGroup[] {
  const q = query.trim().toLowerCase();
  const filtered: LocationCountryGroup[] = [];

  for (const group of groups) {
    if (countryFilter !== "All" && !countriesMatch(group.country, countryFilter)) {
      continue;
    }
    if (!q) {
      filtered.push(group);
      continue;
    }

    const countryHit = countryMatchesQuery(group.country, q);
    const places = filterPlaces(group.places, q, countryHit);
    const cities: LocationCityGroup[] = [];
    for (const city of group.cities) {
      if (countryHit || city.city.toLowerCase().includes(q)) {
        cities.push(city);
        continue;
      }
      const cityPlaces = filterPlaces(city.places, q, false);
      if (cityPlaces.length === 0) continue;
      cities.push(withCityRollup({ ...city, places: cityPlaces }));
    }
    if (places.length === 0 && cities.length === 0) continue;
    filtered.push(
      withCountryRollup({
        ...group,
        places: places.length > 0 ? places : cities.flatMap((city) => city.places),
        cities,
      }),
    );
  }

  return filtered;
}

export function locationGroupCounts(groups: LocationCountryGroup[]) {
  let cities = 0;
  let places = 0;
  let outlets = 0;
  for (const group of groups) {
    if (!group.skipCity) cities += group.cities.length;
    places += group.places.length;
    for (const place of group.places) outlets += place.outlets.length;
  }
  return { countries: groups.length, cities, places, outlets };
}

/** True when this brand has more than one visited branch. */
export function placeHasOutlets(place: LocationPlaceGroup): boolean {
  return place.outlets.length > 1;
}

export function countryLocationSummary(group: LocationCountryGroup): string {
  const parts: string[] = [];
  if (!group.skipCity) {
    parts.push(countLabel(group.cities.length, "city", "cities"));
  }
  parts.push(countLabel(group.places.length, "place", "places"));
  parts.push(countLabel(group.visitCount, "visit", "visits"));
  return parts.join(" · ");
}

export function cityLocationSummary(city: LocationCityGroup): string {
  const outlets = city.places.reduce((total, place) => total + place.outlets.length, 0);
  return [
    countLabel(city.places.length, "place", "places"),
    countLabel(outlets, "outlet", "outlets"),
    countLabel(city.visitCount, "visit", "visits"),
  ].join(" · ");
}

export function placeLocationSummary(place: LocationPlaceGroup): string {
  const parts: string[] = [];
  if (placeHasOutlets(place)) {
    parts.push(countLabel(place.outlets.length, "outlet", "outlets"));
  }
  parts.push(countLabel(place.visitCount, "visit", "visits"));
  return parts.join(" · ");
}

export function formatPlaceLocation(
  place: LocationPlaceGroup,
  opts: { includeCity?: boolean } = {},
): string {
  const only = place.outlets[0];
  if (!only || placeHasOutlets(place)) return "";
  const gym = place.name.trim();
  const branch = only.outlet.trim();
  const city = only.city.trim();
  const bits: string[] = [];
  if (branch && branch.toLowerCase() !== gym.toLowerCase()) bits.push(branch);
  if (
    opts.includeCity &&
    city &&
    city.toLowerCase() !== gym.toLowerCase() &&
    city.toLowerCase() !== branch.toLowerCase()
  ) {
    bits.push(city);
  }
  return bits.join(" · ");
}

export function formatOutletLocation(
  outlet: VisitedOutlet,
  opts: { includeCity?: boolean; includeOutlet?: boolean } = {},
): string {
  const gym = outlet.gymName.trim();
  const branch = outlet.outlet.trim();
  const city = outlet.city.trim();
  const branchKey = branch.toLowerCase();
  const gymLower = gym.toLowerCase();
  const cityKey = city.toLowerCase();
  const bits: string[] = [];
  const branchIsGym = Boolean(branch) && branchKey === gymLower;
  const branchIsCity = Boolean(branch) && Boolean(city) && branchKey === cityKey;
  if (
    opts.includeOutlet !== false &&
    branch &&
    !branchIsGym &&
    (opts.includeCity || !branchIsCity)
  ) {
    bits.push(branch);
  }
  if (opts.includeCity && city && !branchIsCity && cityKey !== gymLower) {
    bits.push(city);
  }
  return bits.join(" · ");
}
