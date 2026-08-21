"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSiteUrl } from "@/lib/site-url";
import { parseVisitMediaUrl, resolveVisitMediaUrl, type VisitMediaLink } from "@/lib/visitMedia";
import type { GradeScale, GradeSystem, GymVisitInput } from "@/lib/types";
import {
  CLIMBING_TYPES,
  isClimbingType,
  normalizeClimbingTypes,
  type ClimbingType,
} from "@/lib/climbingTypes";
import {
  hasVMapping,
  isGradeSystem,
  isHouseSystem,
  normalizeBandVRange,
  normalizeVEquiv,
} from "@/lib/grades";
import { isPlaceKind, normalizePlaceKind } from "@/lib/placeKinds";
import { deleteAccountForUser } from "@/lib/account";
import {
  createVisit,
  deleteVisit,
  ensureOwnProfile,
  reportCatalogGym,
  saveGymGradeMapping,
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

const DUPLICATE_ACCOUNT_ERROR = "Username or email already in use.";

function usernameTakenError(username: string) {
  return `The username ${username} is not available.`;
}

export type UsernameCheckResult = {
  available: boolean | null;
  error?: string;
};

function mapAuthError(
  message: string,
  context: "signup" | "login" | "account" = "login",
): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("user already exists")) {
    return context === "signup"
      ? DUPLICATE_ACCOUNT_ERROR
      : "That account already exists. Try signing in instead.";
  }
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return context === "account"
      ? "Current password is incorrect."
      : "Wrong username/email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the verification link.";
  }
  if (lower.includes("different from the old password") || lower.includes("same as the old password")) {
    return "Pick a password that is different from the current one.";
  }
  if (lower.includes("permission denied")) {
    return "Database permissions are missing. Re-run supabase/schema.sql in the Supabase SQL Editor.";
  }
  if (lower.includes("duplicate") && lower.includes("username")) {
    return "That username is not available.";
  }
  return message;
}

async function verifyCurrentPassword(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string | null | undefined,
  password: string,
): Promise<ActionResult | null> {
  if (!password) {
    return { ok: false, error: "Enter your current password." };
  }
  if (!email?.includes("@")) {
    return {
      ok: false,
      error: "Could not verify your password. Try signing out and back in.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: "Current password is incorrect." };
  }
  return null;
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
      "Could not check username availability. Re-run supabase/schema.sql in the Supabase SQL Editor.",
  };
}

/** Live signup check — call after the user pauses typing. */
export async function checkUsernameAvailableAction(
  rawUsername: string,
): Promise<UsernameCheckResult> {
  if (!isSupabaseConfigured()) {
    return { available: null };
  }

  let username: string;
  try {
    username = normalizeUsername(rawUsername);
  } catch (error) {
    return {
      available: null,
      error: error instanceof Error ? error.message : "Invalid username",
    };
  }

  try {
    const supabase = await createClient();
    const availability = await isUsernameFree(supabase, username);
    if (!availability.ok) {
      // Don't block typing on infra issues — submit still re-checks.
      return { available: null };
    }

    return availability.available
      ? { available: true }
      : { available: false, error: usernameTakenError(username) };
  } catch {
    return { available: null };
  }
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
      return { ok: false, error: DUPLICATE_ACCOUNT_ERROR };
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

    // Existing email: Supabase returns a user with an empty identities list
    // (no new session, no confirmation email) to avoid leaking account existence.
    if (!data.session && (data.user.identities?.length ?? 0) === 0) {
      return { ok: false, error: DUPLICATE_ACCOUNT_ERROR };
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

export async function completeUsernameAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const configured = requireConfigured();
  if (configured) return configured;

  const parsedUsername = parseUsername(formData);
  if (typeof parsedUsername !== "string") return parsedUsername;

  const session = await getSessionUser();
  if (!session) {
    return { ok: false, error: "Please sign in first." };
  }
  if (session.username) redirect("/passport");

  try {
    const supabase = await createClient();
    const availability = await isUsernameFree(supabase, parsedUsername);
    if (!availability.ok) {
      return { ok: false, error: availability.error };
    }
    if (!availability.available) {
      return { ok: false, error: usernameTakenError(parsedUsername) };
    }

    const { error: metaError } = await supabase.auth.updateUser({
      data: { username: parsedUsername },
    });
    if (metaError) {
      return { ok: false, error: mapAuthError(metaError.message, "signup") };
    }

    await ensureOwnProfile(
      supabase,
      session.id,
      parsedUsername,
      session.email ?? undefined,
    );
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save username",
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

  let destination = "/passport";
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
        destination = "/passport";
      } else {
        destination = "/welcome";
      }
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not sign in",
    };
  }

  redirect(destination);
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

/** Permanently delete the signed-in Auth user and stamps. */
export async function deleteAccountAction(
  confirmation: string,
): Promise<ActionResult> {
  const configured = requireConfigured();
  if (configured) return configured;

  const auth = await requireSessionProfile();
  if ("error" in auth) return { ok: false, error: auth.error };

  let typed: string;
  try {
    typed = normalizeUsername(confirmation);
  } catch {
    return { ok: false, error: "Type your username to confirm." };
  }
  if (typed !== auth.session.username) {
    return { ok: false, error: "Type your username to confirm." };
  }

  try {
    await deleteAccountForUser(auth.session.id);
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Couldn't delete the account.",
    };
  }

  return { ok: true };
}

export async function changeUsernameAction(
  rawUsername: string,
): Promise<ActionResult> {
  const configured = requireConfigured();
  if (configured) return configured;

  const auth = await requireSessionProfile();
  if ("error" in auth) return { ok: false, error: auth.error };

  let username: string;
  try {
    username = normalizeUsername(rawUsername);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid username",
    };
  }

  if (username === auth.session.username) {
    return { ok: true };
  }

  try {
    const supabase = await createClient();
    const availability = await isUsernameFree(supabase, username);
    if (!availability.ok) {
      return { ok: false, error: availability.error };
    }
    if (!availability.available) {
      return { ok: false, error: usernameTakenError(username) };
    }

    await ensureOwnProfile(
      supabase,
      auth.session.id,
      username,
      auth.session.email ?? undefined,
    );

    const { error: metaError } = await supabase.auth.updateUser({
      data: { username },
    });
    if (metaError) {
      return { ok: false, error: mapAuthError(metaError.message, "account") };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/duplicate|unique/i.test(message)) {
      return { ok: false, error: usernameTakenError(username) };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save username",
    };
  }

  revalidatePassport();
  return { ok: true };
}

export async function changePasswordAction(
  currentPassword: string,
  nextPassword: string,
): Promise<ActionResult> {
  const configured = requireConfigured();
  if (configured) return configured;

  const auth = await requireSessionProfile();
  if ("error" in auth) return { ok: false, error: auth.error };

  if (nextPassword.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  if (nextPassword === currentPassword) {
    return { ok: false, error: "Pick a password that is different from the current one." };
  }

  try {
    const supabase = await createClient();
    const invalid = await verifyCurrentPassword(
      supabase,
      auth.session.email,
      currentPassword,
    );
    if (invalid) return invalid;

    const { error } = await supabase.auth.updateUser({ password: nextPassword });
    if (error) {
      return { ok: false, error: mapAuthError(error.message, "account") };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update password",
    };
  }

  return { ok: true };
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
  const media_url = String(
    formData.get("media_url") || formData.get("video_path") || "",
  ).trim();
  const clear_media = String(formData.get("clear_media") ?? "") === "1";
  const climbing_typeRaw = String(formData.get("climbing_type") ?? "").trim();
  const climbingTypesRaw = String(formData.get("climbing_types") ?? "").trim();
  const placeKindRaw = String(formData.get("place_kind") ?? "").trim();

  if (!gym_name || !country || !city || !highest_grade || !visited_on) {
    return "Please fill in place, grade, and date.";
  }

  if (!isGradeSystem(grade_system)) {
    return "Pick a valid grade system.";
  }

  const place_kind = placeKindRaw
    ? isPlaceKind(placeKindRaw)
      ? placeKindRaw
      : null
    : normalizePlaceKind(undefined);
  if (!place_kind) {
    return "Pick Gym or Rock for this place.";
  }

  let climbing_types = normalizeClimbingTypes(
    climbingTypesRaw
      ? climbingTypesRaw.split(",").map((item) => item.trim())
      : climbing_typeRaw
        ? [climbing_typeRaw]
        : [],
  );
  if (climbing_types.length === 0) {
    climbing_types = ["bouldering"];
  }

  const climbing_type: ClimbingType = isClimbingType(climbing_typeRaw)
    ? climbing_typeRaw
    : climbing_types[0];
  if (!climbing_types.includes(climbing_type)) {
    return "That climbing type isn’t offered at this place.";
  }
  if (!(CLIMBING_TYPES as readonly string[]).includes(climbing_type)) {
    return "Pick a valid climbing type.";
  }

  if (notes.length > 400) {
    return "Keep notes under 400 characters.";
  }

  if (highest_grade.length > 40) {
    return "That grade is too long.";
  }

  if (media_url) {
    const media = parseVisitMediaUrl(media_url);
    if (!media || "error" in media) {
      return media && "error" in media
        ? media.error
        : "Paste a public TikTok, Instagram, or YouTube link.";
    }
  }

  const scale = parseGradeScaleJson(String(formData.get("scale_json") ?? "").trim());
  if (typeof scale === "string") return scale;

  if (isNew && !hasCatalogScale && isHouseSystem(grade_system)) {
    if (!scale || scale.bands.length < 1) {
      return "Add this place’s grades so the next visit can reuse them.";
    }
  }

  return {
    gym_name,
    country,
    city,
    outlet: outlet || undefined,
    gym_id: gym_id || undefined,
    outlet_id: outlet_id || undefined,
    climbing_types,
    place_kind,
    climbing_type,
    grade_system,
    highest_grade,
    v_equiv: normalizeVEquiv(v_equiv),
    notes: notes || undefined,
    visited_on,
    scale,
    video_path: media_url || null,
    clear_media,
  };
}

function parseGradeScaleJson(raw: string): GradeScale | undefined | string {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as GradeScale;
    if (!parsed?.kind || !Array.isArray(parsed.bands) || !isGradeSystem(parsed.kind)) {
      return "Couldn’t read that place’s grade mapping.";
    }
    return {
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
    return "Couldn’t read that place’s grade mapping.";
  }
}

export type ResolveVisitMediaResult =
  | { ok: true; link: VisitMediaLink }
  | { ok: false; error: string };

/** Resolve a pasted share URL into a canonical embeddable clip (TikTok short links). */
export async function resolveVisitMediaAction(
  raw: string,
): Promise<ResolveVisitMediaResult> {
  const resolved = await resolveVisitMediaUrl(raw);
  if (resolved === null) {
    return { ok: false, error: "Paste a public TikTok, Instagram, or YouTube link." };
  }
  if ("error" in resolved) return { ok: false, error: resolved.error };
  return { ok: true, link: resolved };
}

async function withResolvedClip(
  input: GymVisitInput,
): Promise<GymVisitInput | string> {
  if (input.clear_media && !input.video_path) {
    return { ...input, video_path: null, clear_media: true };
  }
  if (!input.video_path) return { ...input, video_path: null };
  const resolved = await resolveVisitMediaUrl(input.video_path);
  if (resolved === null) return { ...input, video_path: null };
  if ("error" in resolved) return resolved.error;
  return { ...input, video_path: resolved.url, clear_media: false };
}

async function requireSessionProfile() {
  const session = await getSessionUser();
  if (!session) return { error: "Please sign in first." as const };
  if (!session.username) return { error: "Choose a username first." as const };
  return {
    session: {
      id: session.id,
      username: session.username,
      email: session.email,
    },
  };
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

  const withMedia = await withResolvedClip(parsed);
  if (typeof withMedia === "string") return { ok: false, error: withMedia };

  try {
    await createVisit(auth.session.id, withMedia);
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

  const withMedia = await withResolvedClip(parsed);
  if (typeof withMedia === "string") return { ok: false, error: withMedia };

  try {
    await updateVisit(auth.session.id, visitId, withMedia);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update that stamp.",
    };
  }

  revalidatePassport();
  return { ok: true };
}

export async function saveGymScaleAction(formData: FormData): Promise<ActionResult> {
  const configured = requireConfigured();
  if (configured) return configured;

  const auth = await requireSessionProfile();
  if ("error" in auth) return { ok: false, error: auth.error };

  const gym_name = String(formData.get("gym_name") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const outlet = String(formData.get("outlet") ?? "").trim();
  const gym_idRaw = String(formData.get("gym_id") ?? "").trim();
  const outlet_idRaw = String(formData.get("outlet_id") ?? "").trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const gym_id = uuid.test(gym_idRaw) ? gym_idRaw : "";
  const outlet_id = uuid.test(outlet_idRaw) ? outlet_idRaw : "";
  const placeKindRaw = String(formData.get("place_kind") ?? "").trim();
  const climbingTypesRaw = String(formData.get("climbing_types") ?? "").trim();

  if (!gym_name || !country) {
    return { ok: false, error: "Pick a place to map." };
  }

  const place_kind = placeKindRaw
    ? isPlaceKind(placeKindRaw)
      ? placeKindRaw
      : null
    : normalizePlaceKind(undefined);
  if (!place_kind) {
    return { ok: false, error: "Pick Gym or Rock for this place." };
  }

  const climbing_types = normalizeClimbingTypes(
    climbingTypesRaw ? climbingTypesRaw.split(",").map((item) => item.trim()) : [],
  );

  const scale = parseGradeScaleJson(String(formData.get("scale_json") ?? "").trim());
  if (typeof scale === "string") return { ok: false, error: scale };
  if (!scale || (isHouseSystem(scale.kind) && scale.bands.length < 1)) {
    return { ok: false, error: "Add this place’s grades so they can sit next to V." };
  }
  if (!hasVMapping(scale)) {
    return {
      ok: false,
      error: "Map at least one grade to V so this place can join the chart.",
    };
  }

  try {
    await saveGymGradeMapping(auth.session.id, {
      gym_id: gym_id || undefined,
      gym_name,
      country,
      city: city || undefined,
      outlet: outlet || undefined,
      outlet_id: outlet_id || undefined,
      place_kind,
      climbing_types: climbing_types.length > 0 ? climbing_types : undefined,
      scale,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save that mapping.",
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

export async function reportCatalogGymAction(gymId: string): Promise<ActionResult> {
  const configured = requireConfigured();
  if (configured) return configured;

  const auth = await requireSessionProfile();
  if ("error" in auth) return { ok: false, error: auth.error };

  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(gymId)) {
    return { ok: false, error: "Pick a place in the list first." };
  }

  try {
    await reportCatalogGym(auth.session.id, gymId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not send that report.",
    };
  }

  revalidatePassport();
  return { ok: true };
}

function revalidatePassport() {
  revalidatePath("/passport", "layout");
}
