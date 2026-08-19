import { createClient } from "@/lib/supabase/server";
import { findKnownGym, isClosedGym, KNOWN_GYMS, mergeCatalogGyms, visibleOutlets } from "./gymCatalog";
import { isGradeSystem } from "./grades";
import type {
  CatalogGym,
  GradeScale,
  GradeSystem,
  GymOutlet,
  GymVisit,
  GymVisitInput,
  Profile,
} from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

const CHART_BUCKET = "gym-grade-charts";
const MAX_CHART_BYTES = 8 * 1024 * 1024;

const VISIT_SELECT = `
  id,
  profile_id,
  gym_id,
  outlet_id,
  grade_system,
  highest_grade,
  v_equiv,
  notes,
  visited_on,
  created_at,
  updated_at,
  gyms!gym_id ( name, country ),
  gym_outlets!outlet_id ( name, city )
`;

type VisitRow = {
  id: string;
  profile_id: string;
  gym_id: string;
  outlet_id: string;
  grade_system: string;
  highest_grade: string;
  v_equiv: string | null;
  notes: string | null;
  visited_on: string;
  created_at: string;
  updated_at: string;
  gyms: { name: string; country: string } | { name: string; country: string }[] | null;
  gym_outlets: { name: string; city: string } | { name: string; city: string }[] | null;
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function rowToVisit(row: VisitRow): GymVisit {
  const gym = unwrapOne(row.gyms);
  const outlet = unwrapOne(row.gym_outlets);
  return {
    id: row.id,
    profile_id: row.profile_id,
    gym_id: row.gym_id,
    outlet_id: row.outlet_id,
    gym_name: gym?.name ?? "Unknown gym",
    outlet: outlet?.name ?? "",
    city: outlet?.city ?? "",
    country: gym?.country ?? "",
    grade_system: isGradeSystem(row.grade_system) ? row.grade_system : "custom",
    highest_grade: row.highest_grade,
    v_equiv: row.v_equiv,
    notes: row.notes,
    visited_on: row.visited_on,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function isMissingRelation(message: string) {
  return /does not exist|schema cache|could not find the table|could not find a relationship/i.test(
    message,
  );
}

function mapDbError(message: string): Error {
  if (/permission denied/i.test(message)) {
    return new Error(
      "Database permissions are missing. Re-run supabase/schema.sql in the Supabase SQL Editor.",
    );
  }
  if (isMissingRelation(message) || /grade_system|visits_grade/i.test(message)) {
    return new Error(
      "The passport tables are out of date. Paste the whole supabase/schema.sql file into the Supabase SQL Editor and run it.",
    );
  }
  if (/failed to fetch|network|timeout/i.test(message)) {
    return new Error("Couldn't reach the server. Check your connection and try again.");
  }
  return new Error("Something went wrong with your passport. Please try again.");
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function ensureOwnProfile(
  supabase: SupabaseClient,
  userId: string,
  username: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, username }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw mapDbError(error.message);
  return data as Profile;
}

export async function listVisitsForProfile(profileId: string): Promise<GymVisit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visits")
    .select(VISIT_SELECT)
    .eq("profile_id", profileId)
    .order("visited_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw mapDbError(error.message);
  return ((data ?? []) as VisitRow[]).map(rowToVisit);
}

export async function listCatalogGyms(): Promise<CatalogGym[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gyms")
    .select(
      "id, name, country, gym_outlets(id, name, city), gym_grade_scales(kind, bands, chart_path)",
    )
    .order("name");

  if (error) throw mapDbError(error.message);

  return (data ?? []).map((row) => {
    const scaleRow = Array.isArray(row.gym_grade_scales)
      ? row.gym_grade_scales[0]
      : row.gym_grade_scales;
    const outlets = Array.isArray(row.gym_outlets) ? row.gym_outlets : [];
    return {
      id: row.id as string,
      name: row.name as string,
      country: row.country as string,
      outlets: outlets.map((outlet: GymOutlet) => ({
        id: outlet.id,
        name: outlet.name,
        city: outlet.city,
      })),
      scale: scaleRow
        ? {
            kind: (isGradeSystem(scaleRow.kind) ? scaleRow.kind : "custom") as GradeSystem,
            bands: scaleRow.bands ?? [],
            chartPath: scaleRow.chart_path,
          }
        : null,
    } satisfies CatalogGym;
  });
}

function catalogKey(name: string, country: string): string {
  return `${name.trim().toLowerCase()}\u001f${country.trim().toLowerCase()}`;
}

/** Insert any seed gyms/outlets that are not in Supabase yet, then return the picker catalog. */
export async function loadPassportCatalog(profileId: string): Promise<CatalogGym[]> {
  const supabase = await createClient();
  let gyms = await listCatalogGyms();
  const have = new Set(gyms.map((gym) => catalogKey(gym.name, gym.country)));
  const missingGyms = KNOWN_GYMS.filter(
    (gym) => !isClosedGym(gym.name) && !have.has(catalogKey(gym.name, gym.country)),
  );

  if (missingGyms.length > 0) {
    const inserted = await supabase.from("gyms").insert(
      missingGyms.map((gym) => ({
        name: gym.name,
        country: gym.country,
        created_by: profileId,
      })),
    );
    if (inserted.error && !/duplicate|unique/i.test(inserted.error.message)) {
      throw mapDbError(inserted.error.message);
    }
    gyms = await listCatalogGyms();
  }

  const outletRows: { gym_id: string; name: string; city: string; created_by: string }[] = [];
  const scaleRows: {
    gym_id: string;
    kind: GradeSystem;
    bands: GradeScale["bands"];
    created_by: string;
  }[] = [];

  for (const known of KNOWN_GYMS) {
    if (isClosedGym(known.name)) continue;
    const dbGym = gyms.find(
      (gym) =>
        gym.name.toLowerCase() === known.name.toLowerCase() &&
        gym.country.toLowerCase() === known.country.toLowerCase(),
    );
    if (!dbGym?.id) continue;

    for (const outlet of visibleOutlets(known)) {
      const exists = dbGym.outlets.some(
        (item) => item.name.toLowerCase() === outlet.name.toLowerCase(),
      );
      if (!exists) {
        outletRows.push({
          gym_id: dbGym.id,
          name: outlet.name,
          city: outlet.city,
          created_by: profileId,
        });
      }
    }

    if (known.scale?.bands.length && !dbGym.scale?.bands.length) {
      scaleRows.push({
        gym_id: dbGym.id,
        kind: known.scale.kind,
        bands: known.scale.bands,
        created_by: profileId,
      });
    }
  }

  if (outletRows.length > 0) {
    const inserted = await supabase.from("gym_outlets").insert(outletRows);
    if (inserted.error && !/duplicate|unique/i.test(inserted.error.message)) {
      throw mapDbError(inserted.error.message);
    }
  }
  if (scaleRows.length > 0) {
    const inserted = await supabase.from("gym_grade_scales").insert(scaleRows);
    if (inserted.error && !/duplicate|unique/i.test(inserted.error.message)) {
      throw mapDbError(inserted.error.message);
    }
  }

  if (outletRows.length > 0 || scaleRows.length > 0) {
    gyms = await listCatalogGyms();
  }

  return mergeCatalogGyms(gyms);
}

async function findGymRow(
  supabase: SupabaseClient,
  name: string,
  country: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("gyms")
    .select("id")
    .ilike("name", escapeIlike(name.trim()))
    .ilike("country", escapeIlike(country.trim()))
    .limit(1)
    .maybeSingle();
  if (error) throw mapDbError(error.message);
  return data;
}

async function findOutletRow(
  supabase: SupabaseClient,
  gymId: string,
  outletName: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("gym_outlets")
    .select("id")
    .eq("gym_id", gymId)
    .ilike("name", escapeIlike(outletName.trim()))
    .maybeSingle();
  if (error) throw mapDbError(error.message);
  return data;
}

async function ensureGymCatalog(
  supabase: SupabaseClient,
  profileId: string,
  input: GymVisitInput,
): Promise<{ gymId: string; outletId: string }> {
  const known = findKnownGym(input.gym_name, input.country);
  const gymName = known?.name ?? input.gym_name.trim();
  const country = known?.country ?? input.country.trim();
  const scale = input.scale ?? known?.scale ?? null;
  const knownOutlets = known ? visibleOutlets(known) : [];
  const typedOutlet = (input.outlet?.trim() || input.city.trim() || "").trim();
  const dummyOutlet = typedOutlet.toLowerCase() === gymName.toLowerCase();
  const resolvedOutlet =
    knownOutlets.length === 1
      ? knownOutlets[0]
      : knownOutlets.find((outlet) => outlet.name.toLowerCase() === typedOutlet.toLowerCase());
  const outletName = (
    resolvedOutlet?.name ||
    (dummyOutlet ? knownOutlets[0]?.name : typedOutlet) ||
    "Main"
  ).trim();
  const city = (resolvedOutlet?.city || input.city.trim() || outletName).trim();

  let gym = await findGymRow(supabase, gymName, country);
  if (!gym) {
    const inserted = await supabase
      .from("gyms")
      .insert({
        name: gymName,
        country,
        created_by: profileId,
      })
      .select("id")
      .single();

    if (inserted.error) {
      if (/duplicate|unique/i.test(inserted.error.message)) {
        gym = await findGymRow(supabase, gymName, country);
      } else {
        throw mapDbError(inserted.error.message);
      }
    } else {
      gym = inserted.data;
    }
  }

  if (!gym) {
    throw new Error("Couldn't save that gym. Please try again.");
  }

  if (knownOutlets.length > 0) {
    for (const outlet of knownOutlets) {
      const found = await findOutletRow(supabase, gym.id, outlet.name);
      if (!found) {
        await supabase.from("gym_outlets").insert({
          gym_id: gym.id,
          name: outlet.name,
          city: outlet.city,
          created_by: profileId,
        });
      }
    }
  }

  let outlet = await findOutletRow(supabase, gym.id, outletName);
  if (!outlet) {
    const createdOutlet = await supabase
      .from("gym_outlets")
      .insert({
        gym_id: gym.id,
        name: outletName,
        city,
        created_by: profileId,
      })
      .select("id")
      .single();

    if (createdOutlet.error) {
      if (/duplicate|unique/i.test(createdOutlet.error.message)) {
        outlet = await findOutletRow(supabase, gym.id, outletName);
      } else {
        throw mapDbError(createdOutlet.error.message);
      }
    } else {
      outlet = createdOutlet.data;
    }
  }

  if (!outlet) {
    throw new Error("Couldn't save that gym location. Please try again.");
  }

  if (scale) {
    const existingScale = await supabase
      .from("gym_grade_scales")
      .select("id")
      .eq("gym_id", gym.id)
      .maybeSingle();

    if (existingScale.error) throw mapDbError(existingScale.error.message);

    if (!existingScale.data) {
      let chartPath: string | null = scale.chartPath ?? null;
      if (input.chartFile) {
        chartPath = await uploadGradeChart(supabase, profileId, gym.id, input.chartFile);
      }
      const { error } = await supabase.from("gym_grade_scales").insert({
        gym_id: gym.id,
        kind: scale.kind,
        bands: scale.bands,
        chart_path: chartPath,
        created_by: profileId,
      });
      if (error && !/duplicate|unique/i.test(error.message)) {
        throw mapDbError(error.message);
      }
    }
  }

  return { gymId: gym.id, outletId: outlet.id };
}

async function uploadGradeChart(
  supabase: SupabaseClient,
  profileId: string,
  gymId: string,
  file: File,
): Promise<string> {
  if (file.size > MAX_CHART_BYTES) {
    throw new Error("Please keep the grade chart photo under 8 MB.");
  }
  if (file.size === 0) {
    throw new Error("That photo looks empty. Try another one.");
  }

  const ext = extensionFor(file);
  const path = `${profileId}/${gymId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(CHART_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) {
    throw new Error(
      "Couldn't save the grade chart photo. Re-run supabase/schema.sql so the gym-grade-charts bucket exists, then try again.",
    );
  }
  return path;
}

function extensionFor(file: File): string {
  const type = file.type.toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("heic") || type.includes("heif")) return "heic";
  return "jpg";
}

export async function createVisit(
  profileId: string,
  input: GymVisitInput,
): Promise<GymVisit> {
  const supabase = await createClient();
  const catalog = await ensureGymCatalog(supabase, profileId, input);

  const { data, error } = await supabase
    .from("visits")
    .insert({
      profile_id: profileId,
      gym_id: catalog.gymId,
      outlet_id: catalog.outletId,
      grade_system: input.grade_system,
      highest_grade: input.highest_grade.trim(),
      v_equiv: input.v_equiv?.trim() || null,
      notes: input.notes?.trim() || null,
      visited_on: input.visited_on,
    })
    .select(VISIT_SELECT)
    .single();

  if (error) throw mapDbError(error.message);
  return rowToVisit(data as VisitRow);
}

export async function updateVisit(
  profileId: string,
  visitId: string,
  input: GymVisitInput,
): Promise<GymVisit> {
  const supabase = await createClient();
  const catalog = await ensureGymCatalog(supabase, profileId, input);

  const { data, error } = await supabase
    .from("visits")
    .update({
      gym_id: catalog.gymId,
      outlet_id: catalog.outletId,
      grade_system: input.grade_system,
      highest_grade: input.highest_grade.trim(),
      v_equiv: input.v_equiv?.trim() || null,
      notes: input.notes?.trim() || null,
      visited_on: input.visited_on,
    })
    .eq("id", visitId)
    .eq("profile_id", profileId)
    .select(VISIT_SELECT)
    .single();

  if (error) throw mapDbError(error.message);
  return rowToVisit(data as VisitRow);
}

export async function deleteVisit(profileId: string, visitId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("visits")
    .delete()
    .eq("id", visitId)
    .eq("profile_id", profileId);

  if (error) throw mapDbError(error.message);
}

export function chartPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${CHART_BUCKET}/${path}`;
}
