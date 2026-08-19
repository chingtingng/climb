import { notFound } from "next/navigation";
import { GymDetailView } from "@/components/passport/GymDetailView";
import { GymsView } from "@/components/passport/GymsView";
import { HomeView } from "@/components/passport/HomeView";
import { PassportShell } from "@/components/passport/PassportShell";
import { ProfileView } from "@/components/passport/ProfileView";
import { mergeCatalogGyms } from "@/lib/gymCatalog";
import type { GymVisit } from "@/lib/types";

/** Local-only design harness: renders the signed-in screens with sample stamps. */
const SAMPLE: Array<Partial<GymVisit> & Pick<GymVisit, "gym_name" | "country" | "city" | "highest_grade" | "visited_on">> = [
  {
    gym_name: "Boulder Planet",
    country: "Singapore",
    city: "Singapore",
    outlet: "Sembawang",
    grade_system: "number",
    highest_grade: "8",
    v_equiv: "V4",
    visited_on: "2026-08-14",
    notes: "That blue slab was harder than it looked.",
  },
  {
    gym_name: "BFF Climbing",
    country: "Singapore",
    city: "Singapore",
    outlet: "Tai Seng",
    grade_system: "color",
    highest_grade: "Purple",
    v_equiv: "V5",
    visited_on: "2026-08-09",
    climbing_type: "top_rope",
  },
  {
    gym_name: "Fontainebleau",
    country: "France",
    city: "Fontainebleau",
    grade_system: "font",
    highest_grade: "6C",
    visited_on: "2026-07-28",
    notes: "Sandy landings, perfect friction at dawn.",
  },
  {
    gym_name: "Boulder Planet",
    country: "Singapore",
    city: "Singapore",
    outlet: "Tai Seng",
    grade_system: "number",
    highest_grade: "7",
    v_equiv: "V3",
    visited_on: "2026-07-19",
  },
  {
    gym_name: "The Castle",
    country: "United Kingdom",
    city: "London",
    grade_system: "french",
    highest_grade: "6b+",
    visited_on: "2026-06-30",
    climbing_type: "lead",
  },
  {
    gym_name: "Kletterzentrum",
    country: "Germany",
    city: "Munich",
    grade_system: "v",
    highest_grade: "V6",
    visited_on: "2026-06-12",
  },
];

const visits: GymVisit[] = SAMPLE.map((item, index) => ({
  id: `sample-${index}`,
  profile_id: "sample",
  gym_id: `gym-${item.gym_name.toLowerCase().replace(/\s+/g, "-")}`,
  outlet_id: `outlet-${index}`,
  climbing_type: "bouldering",
  grade_system: "v",
  v_equiv: null,
  notes: null,
  photo_path: null,
  video_path: null,
  created_at: `${item.visited_on}T10:00:00Z`,
  updated_at: `${item.visited_on}T10:00:00Z`,
  ...item,
}));

export default async function DesignPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { view } = await searchParams;

  return (
    <PassportShell
      username="chalkchingup"
      visits={view === "empty" ? [] : visits}
      catalogGyms={mergeCatalogGyms([])}
      configured
      loadError={null}
    >
      {view === "places" ? (
        <GymsView />
      ) : view === "profile" ? (
        <ProfileView />
      ) : view === "detail" ? (
        <GymDetailView slug="boulder-planet--singapore" />
      ) : (
        <HomeView />
      )}
    </PassportShell>
  );
}
