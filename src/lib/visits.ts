import { getSupabaseAdmin } from "./supabase";
import type { GymVisit, GymVisitInput, Profile } from "./types";

export async function ensureProfile(username: string): Promise<Profile> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);
  if (existing) return existing as Profile;

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({ username })
    .select("*")
    .single();

  if (insertError) throw new Error(insertError.message);
  return created as Profile;
}

export async function getProfileByUsername(
  username: string,
): Promise<Profile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Profile | null) ?? null;
}

export async function listVisitsForProfile(
  profileId: string,
): Promise<GymVisit[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("gym_visits")
    .select("*")
    .eq("profile_id", profileId)
    .order("visited_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as GymVisit[]) ?? [];
}

export async function createVisit(
  profileId: string,
  input: GymVisitInput,
): Promise<GymVisit> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("gym_visits")
    .insert({
      profile_id: profileId,
      gym_name: input.gym_name.trim(),
      country: input.country.trim(),
      city: input.city.trim(),
      grade_system: input.grade_system,
      highest_grade: input.highest_grade.trim(),
      notes: input.notes?.trim() || null,
      visited_on: input.visited_on,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as GymVisit;
}

export async function updateVisit(
  profileId: string,
  visitId: string,
  input: GymVisitInput,
): Promise<GymVisit> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("gym_visits")
    .update({
      gym_name: input.gym_name.trim(),
      country: input.country.trim(),
      city: input.city.trim(),
      grade_system: input.grade_system,
      highest_grade: input.highest_grade.trim(),
      notes: input.notes?.trim() || null,
      visited_on: input.visited_on,
    })
    .eq("id", visitId)
    .eq("profile_id", profileId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as GymVisit;
}

export async function deleteVisit(
  profileId: string,
  visitId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("gym_visits")
    .delete()
    .eq("id", visitId)
    .eq("profile_id", profileId);

  if (error) throw new Error(error.message);
}
