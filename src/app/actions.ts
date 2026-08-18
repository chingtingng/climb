"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { GradeSystem, GymVisitInput } from "@/lib/types";
import {
  createVisit,
  deleteVisit,
  ensureOwnProfile,
  updateVisit,
} from "@/lib/visits";
import { normalizeUsername, usernameToEmail } from "@/lib/username";

export type ActionResult = {
  ok: boolean;
  error?: string;
};

function requireConfigured(): ActionResult | null {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then run supabase/schema.sql.",
    };
  }
  return null;
}

function parseUsername(formData: FormData): string | ActionResult {
  try {
    return normalizeUsername(String(formData.get("username") ?? ""));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid username",
    };
  }
}

function parsePassword(formData: FormData): string | ActionResult {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  return password;
}

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered")) {
    return "That username is already taken. Try signing in instead.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Wrong username or password.";
  }
  if (lower.includes("permission denied")) {
    return "Database permissions are missing. Re-run supabase/schema.sql in the Supabase SQL Editor.";
  }
  return message;
}

export async function createAccountAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const configured = requireConfigured();
  if (configured) return configured;

  const parsedUsername = parseUsername(formData);
  if (typeof parsedUsername !== "string") return parsedUsername;

  const parsedPassword = parsePassword(formData);
  if (typeof parsedPassword !== "string") return parsedPassword;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(parsedUsername),
      password: parsedPassword,
      options: {
        data: { username: parsedUsername },
      },
    });

    if (error) {
      return { ok: false, error: mapAuthError(error.message) };
    }

    if (!data.session || !data.user) {
      return {
        ok: false,
        error:
          "Account created, but email confirmation is still on in Supabase. Turn off Confirm email under Authentication → Providers → Email, then sign in.",
      };
    }

    await ensureOwnProfile(supabase, data.user.id, parsedUsername);
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

  const parsedUsername = parseUsername(formData);
  if (typeof parsedUsername !== "string") return parsedUsername;

  const parsedPassword = parsePassword(formData);
  if (typeof parsedPassword !== "string") return parsedPassword;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(parsedUsername),
      password: parsedPassword,
    });

    if (error) {
      return { ok: false, error: mapAuthError(error.message) };
    }

    if (data.user) {
      await ensureOwnProfile(supabase, data.user.id, parsedUsername);
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not sign in",
    };
  }

  redirect("/passport");
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
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
  const session = await getSessionUser();
  if (!session) return { error: "Please sign in first." as const };
  return { session };
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
    await createVisit(auth.session.id, parsed);
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
    await updateVisit(auth.session.id, visitId, parsed);
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
    await deleteVisit(auth.session.id, visitId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not delete visit",
    };
  }

  revalidatePath("/passport");
  return { ok: true };
}
