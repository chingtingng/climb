import { formatGrade, gradeSortValue } from "./grades";
import type { GymGroup, GymVisit, PassportStats } from "./types";

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
  if (outlet.toLowerCase() === visit.country.trim().toLowerCase()) {
    return visit.country;
  }
  if (outlet.toLowerCase() === visit.city.trim().toLowerCase()) {
    return `${visit.city} · ${visit.country}`;
  }
  return `${outlet} · ${visit.country}`;
}

export function groupVisitsByGym(visits: GymVisit[]): GymGroup[] {
  const map = new Map<string, GymVisit[]>();
  const labels = new Map<string, { gymId: string; name: string; country: string }>();

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
    for (const visit of sorted) {
      const outlet = visitOutlet(visit);
      const outletKey = outlet.toLowerCase();
      if (seen.has(outletKey)) continue;
      seen.add(outletKey);
      outlets.push(outlet);
    }

    gyms.push({
      slug: gymSlug(label.name, label.country),
      gymId: label.gymId,
      name: label.name,
      city: sorted[0] ? visitOutlet(sorted[0]) : "",
      country: label.country,
      outlets,
      visits: sorted,
      visitCount: sorted.length,
      lastVisited: sorted[0]?.visited_on ?? "",
      bestGrade: best?.highest_grade ?? "",
      bestGradeSystem: best?.grade_system ?? "v",
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
    visits.map((visit) => `${visit.city.trim().toLowerCase()}\u001f${visit.country.trim().toLowerCase()}`),
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

  const cityCounts = new Map<string, { label: string; count: number; last: string }>();
  for (const visit of visits) {
    const key = `${visit.city.trim().toLowerCase()}\u001f${visit.country.trim().toLowerCase()}`;
    const current = cityCounts.get(key);
    if (current) {
      current.count += 1;
      if (visit.visited_on > current.last) current.last = visit.visited_on;
    } else {
      cityCounts.set(key, {
        label: visit.city,
        count: 1,
        last: visit.visited_on,
      });
    }
  }

  const favouriteCity =
    [...cityCounts.values()].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.last.localeCompare(a.last);
    })[0]?.label ?? null;

  return {
    gyms: gyms.length,
    cities: cities.size,
    countries: countries.size,
    bestSend: bestVisit
      ? formatGrade(bestVisit.grade_system, bestVisit.highest_grade)
      : null,
    mostVisitedGym,
    favouriteCity,
  };
}

export function uniqueCountries(gyms: GymGroup[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const gym of gyms) {
    const key = gym.country.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(gym.country);
  }
  return ordered;
}

export function formatGymPlace(gym: GymGroup): string {
  if (gym.outlets.length > 1) {
    return `${gym.outlets.join(" · ")} · ${gym.country}`;
  }
  if (gym.city) return `${gym.city} · ${gym.country}`;
  return gym.country;
}
