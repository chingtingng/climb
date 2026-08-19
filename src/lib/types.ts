export type GradeSystem = "v" | "font" | "french";

export type Profile = {
  id: string;
  username: string;
  created_at: string;
};

export type GymVisit = {
  id: string;
  profile_id: string;
  gym_name: string;
  country: string;
  city: string;
  grade_system: GradeSystem;
  highest_grade: string;
  notes: string | null;
  visited_on: string;
  created_at: string;
  updated_at: string;
};

export type GymVisitInput = {
  gym_name: string;
  country: string;
  city: string;
  grade_system: GradeSystem;
  highest_grade: string;
  notes?: string;
  visited_on: string;
};

/** A gym is the unique (name + city + country) group of visits. */
export type GymGroup = {
  slug: string;
  name: string;
  city: string;
  country: string;
  visits: GymVisit[];
  visitCount: number;
  lastVisited: string;
  bestGrade: string;
  bestGradeSystem: GradeSystem;
};

export type PassportStats = {
  gyms: number;
  cities: number;
  countries: number;
  bestSend: string | null;
  mostVisitedGym: GymGroup | null;
  favouriteCity: string | null;
};
