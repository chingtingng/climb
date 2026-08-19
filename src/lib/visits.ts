import { createClient } from "@/lib/supabase/server";
import { findKnownGym } from "./gymCatalog";
import type {
  CatalogGym,
  GymOutlet,
  GymVisit,
  GymVisitInput,
  Profile,
} from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

const CHART_BUCKET = "gym-grade-charts";
const MAX_CHART_BYTES = 8 * 1024 * 1024;

function mapDbError(message: string): Error {
  if (/permission denied/i.test(message)) {
    return new Error(
      "Database permissions are missing. Re-run supabase/schema.sql in the Supabase SQL Editor.",
    );
  }
  if (/grade_system|gym_visits_grade/i.test(message)) {
    return new Error(
      "This grade system needs a database update. Re-run supabase/schema.sql in the Supabase SQL Editor.",
    );
  }
  if (/gyms|gym_outlets|gym_grade_scales/i.test(message) && /does not exist|schema cache/i.test(message)) {
    return new Error(
      "Gym catalog tables are missing. Re-run supabase/schema.sql in the Supabase SQL Editor.",
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

export async function listVisitsForProfile(
  profileId: string,
): Promise<GymVisit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gym_visits")
    .select("*")
    .eq("profile_id", profileId)
    .order("visited_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw mapDbError(error.message);
  return (data as GymVisit[]) ?? [];
}

export async function listCatalogGyms(): Promise<CatalogGym[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gyms")
      .select(
        "name, country, gym_outlets(name, city), gym_grade_scales(kind, bands, chart_path)",
      )
      .order("name");

    if (error) return [];

    return (data ?? []).map((row) => {
      const scaleRow = Array.isArray(row.gym_grade_scales)
        ? row.gym_grade_scales[0]
        : row.gym_grade_scales;
      const outlets = Array.isArray(row.gym_outlets) ? row.gym_outlets : [];
      return {
        name: row.name as string,
        country: row.country as string,
        outlets: outlets.map((outlet: GymOutlet) => ({
          name: outlet.name,
          city: outlet.city,
        })),
        scale: scaleRow
          ? {
              kind: scaleRow.kind,
              bands: scaleRow.bands ?? [],
              chartPath: scaleRow.chart_path,
            }
          : null,
      } satisfies CatalogGym;
    });
  } catch {
    return [];
  }
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
  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) return null;
    throw mapDbError(error.message);
  }
  return data;
}

async function ensureGymCatalog(
  supabase: SupabaseClient,
  profileId: string,
  input: GymVisitInput,
): Promise<{ gymId: string | null; outletId: string | null }> {
  const known = findKnownGym(input.gym_name, input.country);
  const scale = input.scale ?? known?.scale ?? null;
  const outletName = (input.outlet?.trim() || input.city).trim();

  try {
    let gym = await findGymRow(supabase, input.gym_name, input.country);
    if (!gym) {
      const inserted = await supabase
        .from("gyms")
        .insert({
          name: input.gym_name.trim(),
          country: input.country.trim(),
          created_by: profileId,
        })
        .select("id")
        .single();

      if (inserted.error) {
        if (/duplicate|unique/i.test(inserted.error.message)) {
          gym = await findGymRow(supabase, input.gym_name, input.country);
        } else if (/does not exist|schema cache/i.test(inserted.error.message)) {
          return { gymId: null, outletId: null };
        } else {
          throw mapDbError(inserted.error.message);
        }
      } else {
        gym = inserted.data;
      }
    }

    if (!gym) return { gymId: null, outletId: null };

    let outletId: string | null = null;
    const existingOutlet = await supabase
      .from("gym_outlets")
      .select("id")
      .eq("gym_id", gym.id)
      .ilike("name", escapeIlike(outletName))
      .maybeSingle();

    if (existingOutlet.data) {
      outletId = existingOutlet.data.id;
    } else if (!existingOutlet.error || !/does not exist|schema cache/i.test(existingOutlet.error.message)) {
      const createdOutlet = await supabase
        .from("gym_outlets")
        .insert({
          gym_id: gym.id,
          name: outletName,
          city: input.city.trim(),
          created_by: profileId,
        })
        .select("id")
        .single();
      if (!createdOutlet.error) outletId = createdOutlet.data.id;
    }

    if (known?.outlets) {
      for (const outlet of known.outlets) {
        const found = await supabase
          .from("gym_outlets")
          .select("id")
          .eq("gym_id", gym.id)
          .ilike("name", escapeIlike(outlet.name))
          .maybeSingle();
        if (!found.data) {
          await supabase.from("gym_outlets").insert({
            gym_id: gym.id,
            name: outlet.name,
            city: outlet.city,
            created_by: profileId,
          });
        }
      }
    }

    if (scale) {
      const existingScale = await supabase
        .from("gym_grade_scales")
        .select("id")
        .eq("gym_id", gym.id)
        .maybeSingle();

      if (!existingScale.data) {
        let chartPath: string | null = scale.chartPath ?? null;
        if (input.chartFile) {
          chartPath = await uploadGradeChart(supabase, profileId, gym.id, input.chartFile);
        }
        await supabase.from("gym_grade_scales").insert({
          gym_id: gym.id,
          kind: scale.kind,
          bands: scale.bands,
          chart_path: chartPath,
          created_by: profileId,
        });
      }
    }

    return { gymId: gym.id, outletId };
  } catch (error) {
    if (error instanceof Error && /catalog tables are missing/i.test(error.message)) {
      return { gymId: null, outletId: null };
    }
    throw error;
  }
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

async function resolveGymIdentity(
  profileId: string,
  input: Pick<GymVisitInput, "gym_name" | "city" | "country" | "outlet">,
): Promise<Pick<GymVisitInput, "gym_name" | "city" | "country" | "outlet">> {
  const supabase = await createClient();
  let query = supabase
    .from("gym_visits")
    .select("gym_name, city, country, outlet")
    .eq("profile_id", profileId)
    .ilike("gym_name", escapeIlike(input.gym_name.trim()))
    .ilike("country", escapeIlike(input.country.trim()));

  const outlet = input.outlet?.trim();
  if (outlet) {
    query = query.or(`outlet.ilike.${escapeIlike(outlet)},city.ilike.${escapeIlike(outlet)}`);
  } else {
    query = query.ilike("city", escapeIlike(input.city.trim()));
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw mapDbError(error.message);
  if (data) {
    return {
      gym_name: data.gym_name,
      city: data.city,
      country: data.country,
      outlet: data.outlet || outlet || data.city,
    };
  }

  return {
    gym_name: input.gym_name.trim(),
    city: input.city.trim(),
    country: input.country.trim(),
    outlet: outlet || input.city.trim(),
  };
}

export async function createVisit(
  profileId: string,
  input: GymVisitInput,
): Promise<GymVisit> {
  const gym = await resolveGymIdentity(profileId, input);
  const supabase = await createClient();
  const catalog = await ensureGymCatalog(supabase, profileId, {
    ...input,
    gym_name: gym.gym_name,
    city: gym.city,
    country: gym.country,
    outlet: gym.outlet,
  });

  const row: Record<string, unknown> = {
    profile_id: profileId,
    gym_name: gym.gym_name,
    country: gym.country,
    city: gym.city,
    outlet: gym.outlet || null,
    grade_system: input.grade_system,
    highest_grade: input.highest_grade.trim(),
    v_equiv: input.v_equiv?.trim() || null,
    notes: input.notes?.trim() || null,
    visited_on: input.visited_on,
  };
  if (catalog.gymId) row.gym_id = catalog.gymId;
  if (catalog.outletId) row.outlet_id = catalog.outletId;

  const { data, error } = await supabase
    .from("gym_visits")
    .insert(row)
    .select("*")
    .single();

  if (error) throw mapDbError(error.message);
  return data as GymVisit;
}

export async function updateVisit(
  profileId: string,
  visitId: string,
  input: GymVisitInput,
): Promise<GymVisit> {
  const gym = await resolveGymIdentity(profileId, input);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gym_visits")
    .update({
      gym_name: gym.gym_name,
      country: gym.country,
      city: gym.city,
      outlet: gym.outlet || null,
      grade_system: input.grade_system,
      highest_grade: input.highest_grade.trim(),
      v_equiv: input.v_equiv?.trim() || null,
      notes: input.notes?.trim() || null,
      visited_on: input.visited_on,
    })
    .eq("id", visitId)
    .eq("profile_id", profileId)
    .select("*")
    .single();

  if (error) throw mapDbError(error.message);
  return data as GymVisit;
}

export async function deleteVisit(
  profileId: string,
  visitId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("gym_visits")
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
