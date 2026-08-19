"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSiteUrl } from "@/lib/site-url";
import type { GradeScale, GradeSystem, GymVisitInput } from "@/lib/types";
import { isHouseSystem, normalizeBandVRange, normalizeVEquiv } from "@/lib/grades";
import {
  createVisit,
  deleteVisit,
  ensureOwnProfile,
  updateVisit,
} from "@/lib/visits";
import {
  emailToUsername,
  normalizeEmail,
  normalizeUsername,
  parseLoginIdentifier,
  usernameToEmail,
} from "@/lib/username";

export type ActionResult = {
  ok: boolean;
  error?: string;
  /** Signup succeeded; user must click the verification email before signing in. */
  needsVerification?: boolean;
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

function parseEmail(formData: FormData): string | ActionResult {
  try {
    return normalizeEmail(String(formData.get("email") ?? ""));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid email",
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

function mapAuthError(message: string, context: "signup" | "login" = "login"): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("user already exists")) {
    return context === "signup"
      ? "That email is already registered. Try signing in, or use a different email."
      : "That account already exists. Try signing in instead.";
  }
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "Wrong username/email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the verification link.";
  }
  if (lower.includes("permission denied")) {
    return "Database permissions are missing. Re-run supabase/schema.sql in the Supabase SQL Editor.";
  }
  return message;
}

async function isUsernameFree(
  supabase: Awaited<ReturnType<typeof createClient>>,
  username: string,
): Promise<{ ok: true; available: boolean } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("is_username_available", {
    candidate: username,
  });

  if (!error) {
    return { ok: true, available: data !== false };
  }

  const admin = createAdminClient();
  if (admin) {
    const { data: row, error: adminError } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (adminError) {
      return { ok: false, error: mapAuthError(adminError.message, "signup") };
    }
    return { ok: true, available: !row };
  }

  return {
    ok: false,
    error:
      "Could not check username availability. Run supabase/email-auth.sql in the Supabase SQL Editor.",
  };
}

async function resolveAuthEmailForLogin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  identifier: ReturnType<typeof parseLoginIdentifier>,
): Promise<string> {
  if (identifier.kind === "email") {
    return identifier.email;
  }

  const { data, error } = await supabase.rpc("resolve_login_email", {
    identifier: identifier.username,
  });

  if (!error && typeof data === "string" && data.includes("@")) {
    return data;
  }

  const admin = createAdminClient();
  if (admin) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("username", identifier.username)
      .maybeSingle();

    if (profile?.id) {
      const { data: userData } = await admin.auth.admin.getUserById(profile.id);
      if (userData.user?.email) return userData.user.email;
    }
  }

  // Legacy accounts created as username@chalk.local before real-email signup.
  return usernameToEmail(identifier.username);
}

export async function createAccountAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const configured = requireConfigured();
  if (configured) return configured;

  const parsedUsername = parseUsername(formData);
  if (typeof parsedUsername !== "string") return parsedUsername;

  const parsedEmail = parseEmail(formData);
  if (typeof parsedEmail !== "string") return parsedEmail;

  const parsedPassword = parsePassword(formData);
  if (typeof parsedPassword !== "string") return parsedPassword;

  try {
    const supabase = await createClient();

    const availability = await isUsernameFree(supabase, parsedUsername);
    if (!availability.ok) {
      return { ok: false, error: availability.error };
    }
    if (!availability.available) {
      return {
        ok: false,
        error: "That username is already taken. Try another.",
      };
    }

    const siteUrl = await getSiteUrl();
    const { data, error } = await supabase.auth.signUp({
      email: parsedEmail,
      password: parsedPassword,
      options: {
        data: { username: parsedUsername },
        emailRedirectTo: `${siteUrl}/auth/confirm?next=/passport`,
      },
    });

    if (error) {
      return { ok: false, error: mapAuthError(error.message, "signup") };
    }

    if (!data.user) {
      return { ok: false, error: "Could not create account." };
    }

    // When Confirm email is on, there is no session yet — profile is still
    // created by the auth trigger. If confirmation is off, we get a session.
    if (!data.session) {
      return { ok: true, needsVerification: true };
    }

    await ensureOwnProfile(
      supabase,
      data.user.id,
      parsedUsername,
      parsedEmail,
    );
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

  let identifier: ReturnType<typeof parseLoginIdentifier>;
  try {
    identifier = parseLoginIdentifier(String(formData.get("identifier") ?? ""));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid username or email",
    };
  }

  const parsedPassword = parsePassword(formData);
  if (typeof parsedPassword !== "string") return parsedPassword;

  try {
    const supabase = await createClient();
    const email = await resolveAuthEmailForLogin(supabase, identifier);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: parsedPassword,
    });

    if (error) {
      return { ok: false, error: mapAuthError(error.message, "login") };
    }

    if (data.user) {
      const username =
        (typeof data.user.user_metadata?.username === "string"
          ? data.user.user_metadata.username
          : undefined) ||
        (identifier.kind === "username" ? identifier.username : undefined) ||
        emailToUsername(data.user.email);

      if (username) {
        await ensureOwnProfile(
          supabase,
          data.user.id,
          username,
          data.user.email ?? undefined,
        );
      }
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
          .map((band) => {
            const range = normalizeBandVRange(band.v_equiv, band.v_max);
            return {
              label: String(band.label).slice(0, 40),
              ...range,
              color: band.color ? String(band.color).slice(0, 16) : undefined,
            };
          }),
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
