"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { GradeScale, GradeSystem, GymVisitInput } from "@/lib/types";
import { isHouseSystem, normalizeVEquiv } from "@/lib/grades";
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
  const outlet = String(formData.get("outlet") ?? "").trim();
  const gym_idRaw = String(formData.get("gym_id") ?? "").trim();
  const outlet_idRaw = String(formData.get("outlet_id") ?? "").trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const gym_id = uuid.test(gym_idRaw) ? gym_idRaw : "";
  const outlet_id = uuid.test(outlet_idRaw) ? outlet_idRaw : "";
  const grade_system = String(formData.get("grade_system") ?? "") as GradeSystem;
  const highest_grade = String(formData.get("highest_grade") ?? "").trim();
  const v_equiv = String(formData.get("v_equiv") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const visited_on = String(formData.get("visited_on") ?? "").trim();
  const isNew = String(formData.get("is_new_gym") ?? "") === "1";
  const hasCatalogScale = String(formData.get("has_catalog_scale") ?? "") === "1";
  const chart = formData.get("grade_chart");
  const chartFile = chart instanceof File && chart.size > 0 ? chart : null;

  if (!gym_name || !country || !city || !highest_grade || !visited_on) {
    return "Please fill in gym, place, grade, and date.";
  }

  if (!["v", "font", "french", "number", "color", "custom"].includes(grade_system)) {
    return "Pick a valid grade system.";
  }

  if (notes.length > 400) {
    return "Keep notes under 400 characters.";
  }

  if (highest_grade.length > 40) {
    return "That grade is too long.";
  }

  let scale: GradeScale | undefined;
  const scaleJson = String(formData.get("scale_json") ?? "").trim();
  if (scaleJson) {
    try {
      const parsed = JSON.parse(scaleJson) as GradeScale;
      if (!parsed?.kind || !Array.isArray(parsed.bands)) {
        return "Couldn’t read that gym’s grade mapping.";
      }
      scale = {
        kind: parsed.kind,
        bands: parsed.bands
          .filter((band) => band?.label)
          .map((band) => ({
            label: String(band.label).slice(0, 40),
            v_equiv: normalizeVEquiv(band.v_equiv),
            color: band.color ? String(band.color).slice(0, 16) : undefined,
          })),
      };
    } catch {
      return "Couldn’t read that gym’s grade mapping.";
    }
  }

  if (isNew && !hasCatalogScale && isHouseSystem(grade_system)) {
    if (!scale || scale.bands.length < 1) {
      return "Add this gym’s grades so the next visit can reuse them.";
    }
    if (!chartFile) {
      return "Add a photo of this gym’s grade chart so others can use the same scale.";
    }
  }

  return {
    gym_name,
    country,
    city,
    outlet: outlet || undefined,
    gym_id: gym_id || undefined,
    outlet_id: outlet_id || undefined,
    grade_system,
    highest_grade,
    v_equiv: normalizeVEquiv(v_equiv),
    notes: notes || undefined,
    visited_on,
    scale,
    chartFile,
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
      error: error instanceof Error ? error.message : "Could not save that stamp.",
    };
  }

  revalidatePassport();
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
      error: error instanceof Error ? error.message : "Could not update that stamp.",
    };
  }

  revalidatePassport();
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
      error: error instanceof Error ? error.message : "Could not remove that stamp.",
    };
  }

  revalidatePassport();
  return { ok: true };
}

function revalidatePassport() {
  revalidatePath("/passport", "layout");
}
