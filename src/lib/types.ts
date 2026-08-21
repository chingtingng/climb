import type { ClimbingType } from "./climbingTypes";
import type { PlaceKind } from "./placeKinds";

export type { ClimbingType, PlaceKind };

export type GradeSystem =
  | "v"
  | "font"
  | "french"
  | "yds"
  | "number"
  | "color"
  | "custom";

export type GradeBand = {
  label: string;
  /** Low end of the V mapping (or the only grade when not a range). */
  v_equiv?: string;
  /** High end when this house grade spans a V range (e.g. V3–V4). */
  v_max?: string;
  color?: string;
  /** Shown under the house grade when V isn’t the posted range (e.g. French 4a–5a). */
  hint?: string;
};

export type GradeScale = {
  kind: GradeSystem;
  bands: GradeBand[];
};

export type CatalogStatus = "pending" | "published" | "rejected";

export type GymOutlet = {
  id?: string;
  name: string;
  city: string;
  /** When set, this location’s disciplines (subset of the gym). Null/omit = inherit gym. */
  climbing_types?: ClimbingType[];
  /** Omitted on seeded client-only rows — treat as published. */
  status?: CatalogStatus;
};

export type Profile = {
  id: string;
  username: string;
  email?: string | null;
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
  climbing_type: ClimbingType;
  grade_system: GradeSystem;
  highest_grade: string;
  v_equiv?: string | null;
  notes: string | null;
  /** Public TikTok / Instagram / YouTube URL. */
  video_path?: string | null;
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
  /** Types this place offers — saved when creating / updating the catalog place. */
  climbing_types?: ClimbingType[];
  /** Gym (artificial) or Rock (natural stone). Saved on the catalog place. */
  place_kind?: PlaceKind;
  /** Discipline for this stamp. */
  climbing_type: ClimbingType;
  grade_system: GradeSystem;
  highest_grade: string;
  v_equiv?: string;
  notes?: string;
  visited_on: string;
  scale?: GradeScale;
  /** Public TikTok / Instagram / YouTube URL. */
  video_path?: string | null;
  /** When true on update, drop the stored clip link. */
  clear_media?: boolean;
};

/** A gym brand — possibly with several outlets. */
export type GymGroup = {
  slug: string;
  gymId: string;
  name: string;
  /** Latest visit's outlet label (mall / branch), not `gym_outlets.city`. */
  city: string;
  country: string;
  place_kind: PlaceKind;
  outlets: string[];
  visits: GymVisit[];
  visitCount: number;
  lastVisited: string;
  bestGrade: string;
  bestGradeSystem: GradeSystem;
  bestVEquiv?: string | null;
};

export type CatalogGym = {
  id?: string;
  name: string;
  country: string;
  /** Gym = artificial; Rock = natural stone. */
  place_kind: PlaceKind;
  /** Disciplines this brand offers (union). An outlet may narrow this. */
  climbing_types: ClimbingType[];
  /** Omitted on seeded client-only rows — treat as published. */
  status?: CatalogStatus;
  outlets: GymOutlet[];
  /** Default / only chart. Type-specific charts live on `scales`. */
  scale: GradeScale | null;
  /** When a gym posts different charts per discipline (Camp5 boulder vs rope). */
  scales?: Partial<Record<ClimbingType, GradeScale>>;
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
