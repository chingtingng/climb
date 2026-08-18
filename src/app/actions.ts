"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearSessionCookie,
  isValidUsername,
  normalizeUsername,
  readSession,
  setSessionCookie,
} from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { GradeSystem, GymVisitInput } from "@/lib/types";
import {
  createProfile,
  createVisit,
  deleteVisit,
  getProfileByUsername,
  listVisitsForProfile,
  updateVisit,
} from "@/lib/visits";

export type ActionResult = {
  ok: boolean;
  error?: string;
};

function requireConfigured(): ActionResult | null {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        "Supabase is not configured yet. Add your project env vars and run supabase/schema.sql.",
    };
  }
  return null;
}

function parseUsername(formData: FormData): string | ActionResult {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  if (!isValidUsername(username)) {
    return {
      ok: false,
      error: "Use 2–32 characters: lowercase letters, numbers, . or _",
    };
  }
  return username;
}

export async function createAccountAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const configured = requireConfigured();
  if (configured) return configured;

  const parsed = parseUsername(formData);
  if (typeof parsed !== "string") return parsed;

  try {
    await createProfile(parsed);
    await setSessionCookie(parsed);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not create account",
    };
  }

  redirect("/passport");
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const configured = requireConfigured();
  if (configured) return configured;

  const parsed = parseUsername(formData);
  if (typeof parsed !== "string") return parsed;

  try {
    const profile = await getProfileByUsername(parsed);
    if (!profile) {
      return {
        ok: false,
        error: "No account with that username. Create one first.",
      };
    }
    await setSessionCookie(parsed);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not sign in",
    };
  }

  redirect("/passport");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}

export async function getCurrentUserVisits() {
  const session = await readSession();
  if (!session) return null;
  if (!isSupabaseConfigured()) return { username: session.username, visits: [] };

  const profile = await getProfileByUsername(session.username);
  if (!profile) return { username: session.username, visits: [] };

  const visits = await listVisitsForProfile(profile.id);
  return { username: session.username, profileId: profile.id, visits };
}

function parseVisitInput(formData: FormData): GymVisitInput | string {
  const gym_name = String(formData.get("gym_name") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const grade_system = String(formData.get("grade_system") ?? "") as GradeSystem;
  const highest_grade = String(formData.get("highest_grade") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const visited_on = String(formData.get("visited_on") ?? "").trim();

  if (!gym_name || !country || !city || !highest_grade || !visited_on) {
    return "Please fill in gym, place, grade, and date.";
  }

  if (!["v", "font", "french"].includes(grade_system)) {
    return "Pick a valid grade system.";
  }

  return {
    gym_name,
    country,
    city,
    grade_system,
    highest_grade,
    notes: notes || undefined,
    visited_on,
  };
}

async function requireSessionProfile() {
  const session = await readSession();
  if (!session) return { error: "Please sign in first." as const };

  const profile = await getProfileByUsername(session.username);
  if (!profile) return { error: "Account not found. Create an account first." as const };

  return { session, profile };
}

export async function addVisitAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const configured = requireConfigured();
  if (configured) return configured;

  const auth = await requireSessionProfile();
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = parseVisitInput(formData);
  if (typeof parsed === "string") return { ok: false, error: parsed };

  try {
    await createVisit(auth.profile.id, parsed);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save visit",
    };
  }

  revalidatePath("/passport");
  return { ok: true };
}

export async function updateVisitAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const configured = requireConfigured();
  if (configured) return configured;

  const auth = await requireSessionProfile();
  if ("error" in auth) return { ok: false, error: auth.error };

  const visitId = String(formData.get("visit_id") ?? "");
  if (!visitId) return { ok: false, error: "Missing visit id." };

  const parsed = parseVisitInput(formData);
  if (typeof parsed === "string") return { ok: false, error: parsed };

  try {
    await updateVisit(auth.profile.id, visitId, parsed);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update visit",
    };
  }

  revalidatePath("/passport");
  return { ok: true };
}

export async function deleteVisitAction(visitId: string): Promise<ActionResult> {
  const configured = requireConfigured();
  if (configured) return configured;

  const auth = await requireSessionProfile();
  if ("error" in auth) return { ok: false, error: auth.error };

  try {
    await deleteVisit(auth.profile.id, visitId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not delete visit",
    };
  }

  revalidatePath("/passport");
  return { ok: true };
}
