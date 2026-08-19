import { createClient } from "@/lib/supabase/server";
import type { GymVisit, GymVisitInput, Profile } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

function mapDbError(message: string): Error {
  if (/permission denied/i.test(message)) {
    return new Error(
      "Database permissions are missing. Re-run supabase/schema.sql in the Supabase SQL Editor.",
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

async function resolveGymIdentity(
  profileId: string,
  input: Pick<GymVisitInput, "gym_name" | "city" | "country">,
): Promise<Pick<GymVisitInput, "gym_name" | "city" | "country">> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gym_visits")
    .select("gym_name, city, country")
    .eq("profile_id", profileId)
    .ilike("gym_name", escapeIlike(input.gym_name.trim()))
    .ilike("city", escapeIlike(input.city.trim()))
    .ilike("country", escapeIlike(input.country.trim()))
    .limit(1)
    .maybeSingle();

  if (error) throw mapDbError(error.message);
  if (data) {
    return {
      gym_name: data.gym_name,
      city: data.city,
      country: data.country,
    };
  }

  return {
    gym_name: input.gym_name.trim(),
    city: input.city.trim(),
    country: input.country.trim(),
  };
}

export async function createVisit(
  profileId: string,
  input: GymVisitInput,
): Promise<GymVisit> {
  const gym = await resolveGymIdentity(profileId, input);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gym_visits")
    .insert({
      profile_id: profileId,
      gym_name: gym.gym_name,
      country: gym.country,
      city: gym.city,
      grade_system: input.grade_system,
      highest_grade: input.highest_grade.trim(),
      notes: input.notes?.trim() || null,
      visited_on: input.visited_on,
    })
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
      grade_system: input.grade_system,
      highest_grade: input.highest_grade.trim(),
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
