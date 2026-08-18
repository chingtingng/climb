import { formatGrade, gradeSortValue } from "./grades";
import type { GymGroup, GymVisit, PassportStats } from "./types";

export function gymSlug(name: string, city: string, country: string): string {
  return [name, city, country]
    .map((part) => slugPart(part))
    .join("--");
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

export function gymKey(name: string, city: string, country: string): string {
  return [name, city, country].map((part) => part.trim().toLowerCase()).join("\u001f");
}

export function groupVisitsByGym(visits: GymVisit[]): GymGroup[] {
  const map = new Map<string, GymVisit[]>();
  const labels = new Map<string, { name: string; city: string; country: string }>();

  for (const visit of visits) {
    const key = gymKey(visit.gym_name, visit.city, visit.country);
    const list = map.get(key);
    if (list) {
      list.push(visit);
    } else {
      map.set(key, [visit]);
      labels.set(key, {
        name: visit.gym_name,
        city: visit.city,
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
        gradeSortValue(b.grade_system, b.highest_grade) -
        gradeSortValue(a.grade_system, a.highest_grade),
    )[0];

    gyms.push({
      slug: gymSlug(label.name, label.city, label.country),
      name: label.name,
      city: label.city,
      country: label.country,
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
  return gyms.find((gym) => gym.slug === slug);
}

export function computeStats(visits: GymVisit[], gyms: GymGroup[]): PassportStats {
  const cities = new Set(gyms.map((gym) => gymKey(gym.city, gym.country, "")));
  const countries = new Set(gyms.map((gym) => gym.country.trim().toLowerCase()));

  const bestVisit = [...visits].sort(
    (a, b) =>
      gradeSortValue(b.grade_system, b.highest_grade) -
      gradeSortValue(a.grade_system, a.highest_grade),
  )[0];

  const mostVisitedGym =
    [...gyms].sort((a, b) => {
      if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
      return b.lastVisited.localeCompare(a.lastVisited);
    })[0] ?? null;

  const cityCounts = new Map<string, { label: string; count: number; last: string }>();
  for (const gym of gyms) {
    const key = gymKey(gym.city, gym.country, "");
    const current = cityCounts.get(key);
    if (current) {
      current.count += gym.visitCount;
      if (gym.lastVisited > current.last) current.last = gym.lastVisited;
    } else {
      cityCounts.set(key, {
        label: gym.city,
        count: gym.visitCount,
        last: gym.lastVisited,
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
