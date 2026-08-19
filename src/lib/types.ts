export type GradeSystem = "v" | "font" | "french" | "number" | "color" | "custom";

export type GradeBand = {
  label: string;
  /** Low end of the V mapping (or the only grade when not a range). */
  v_equiv?: string;
  /** High end when this house grade spans a V range (e.g. V3–V4). */
  v_max?: string;
  color?: string;
};

export type GradeScale = {
  kind: GradeSystem;
  bands: GradeBand[];
  chartPath?: string | null;
};

export type GymOutlet = {
  id?: string;
  name: string;
  city: string;
};

export type Profile = {
  id: string;
  username: string;
  created_at: string;
};

export type GymVisit = {
  id: string;
  profile_id: string;
  gym_id: string;
  outlet_id: string;
  gym_name: string;
  country: string;
  city: string;
  outlet?: string | null;
  grade_system: GradeSystem;
  highest_grade: string;
  v_equiv?: string | null;
  notes: string | null;
  visited_on: string;
  created_at: string;
  updated_at: string;
};

export type GymVisitInput = {
  gym_name: string;
  country: string;
  city: string;
  outlet?: string;
  /** When set with outlet_id, save path can skip name-based catalog resolution. */
  gym_id?: string;
  outlet_id?: string;
  grade_system: GradeSystem;
  highest_grade: string;
  v_equiv?: string;
  notes?: string;
  visited_on: string;
  scale?: GradeScale;
  chartFile?: File | null;
};

/** A gym brand — possibly with several outlets. */
export type GymGroup = {
  slug: string;
  gymId: string;
  name: string;
  city: string;
  country: string;
  outlets: string[];
  visits: GymVisit[];
  visitCount: number;
  lastVisited: string;
  bestGrade: string;
  bestGradeSystem: GradeSystem;
};

export type CatalogGym = {
  id?: string;
  name: string;
  country: string;
  outlets: GymOutlet[];
  scale: GradeScale | null;
};

export type FavouriteCity = {
  name: string;
  country: string;
  gymCount: number;
  sessionCount: number;
};

export type PassportStats = {
  gyms: number;
  cities: number;
  countries: number;
  bestSend: string | null;
  mostVisitedGym: GymGroup | null;
  favouriteCity: FavouriteCity | null;
};
