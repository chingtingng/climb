import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_CLIMBING_TYPES,
  isClimbingType,
  normalizeClimbingTypes,
  type ClimbingType,
} from "./climbingTypes";
import { countryMeta } from "./countries";
import {
  catalogCity,
  catalogIdentityKey,
  collapseCatalogLabel,
  findKnownGym,
  isClosedGym,
  KNOWN_GYMS,
  knownScaleSeed,
  mergeCatalogGyms,
  normalizeCatalogStatus,
  parseGymScaleRows,
  sameCatalogName,
  sameCountry,
  visibleOutlets,
} from "./gymCatalog";
import { isGradeSystem } from "./grades";
import { normalizePlaceKind } from "./placeKinds";
import {
  GYM_REPORT_DETAILS_MAX,
  GYM_REPORT_DETAILS_MIN_OTHER,
  GymReportBlockedError,
  isGymReportReason,
  isGymReportSource,
  type GymReportEligibility,
  type GymReportInput,
} from "./gymReports";
import type {
  CatalogGym,
  CatalogStatus,
  GradeScale,
  GradeSystem,
  GymOutlet,
  GymVisit,
  GymVisitInput,
  PlaceKind,
  Profile,
} from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseVisitMediaUrl, visitMediaLinkFromStored } from "./visitMedia";

const VISIT_SELECT = `
  id,
  profile_id,
  gym_id,
  outlet_id,
  climbing_type,
  grade_system,
  highest_grade,
  v_equiv,
  notes,
  video_path,
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
  climbing_type?: string | null;
  grade_system: string;
  highest_grade: string;
  v_equiv: string | null;
  notes: string | null;
  video_path?: string | null;
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
    gym_name: gym?.name ?? "Unknown place",
    outlet: outlet?.name ?? "",
    city: outlet?.city ?? "",
    country: gym?.country ?? "",
    climbing_type:
      row.climbing_type && isClimbingType(row.climbing_type)
        ? row.climbing_type
        : "bouldering",
    grade_system: isGradeSystem(row.grade_system) ? row.grade_system : "custom",
    highest_grade: row.highest_grade,
    v_equiv: row.v_equiv,
    notes: row.notes,
    video_path: row.video_path ?? null,
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
  if (/row-level security/i.test(message)) {
    return new Error("This place isn’t available to stamp right now.");
  }
  if (/permission denied/i.test(message)) {
    return new Error(
      "Database permissions are missing. Re-run supabase/schema.sql in the Supabase SQL Editor.",
    );
  }
  if (/grade_system|gym_grade_scales_kind|visits_grade/i.test(message)) {
    return new Error(
      "The passport tables are out of date. Paste the whole supabase/schema.sql file into the Supabase SQL Editor and run it.",
    );
  }
  if (isMissingRelation(message) || /climbing_type|climbing_types/i.test(message)) {
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
  email?: string | null,
): Promise<Profile> {
  const base = { id: userId, username };
  const withEmail =
    email && email.trim()
      ? { ...base, email: email.trim().toLowerCase() }
      : base;

  const first = await supabase
    .from("profiles")
    .upsert(withEmail, { onConflict: "id" })
    .select("*")
    .single();

  // Retry without email if the column is missing on a stale schema.
  if (
    first.error &&
    withEmail !== base &&
    /email|schema cache|PGRST204/i.test(first.error.message)
  ) {
    const retry = await supabase
      .from("profiles")
      .upsert(base, { onConflict: "id" })
      .select("*")
      .single();
    if (retry.error) throw mapDbError(retry.error.message);
    return retry.data as Profile;
  }

  if (first.error) throw mapDbError(first.error.message);
  return first.data as Profile;
}

export async function listVisitsForProfile(profileId: string): Promise<GymVisit[]> {
  const supabase = await createClient();
  const primary = await supabase
    .from("visits")
    .select(VISIT_SELECT)
    .eq("profile_id", profileId)
    .order("visited_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (
    primary.error &&
    /video_path|schema cache|PGRST204|column/i.test(primary.error.message)
  ) {
    const legacy = await supabase
      .from("visits")
      .select(
        `
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
`,
      )
      .eq("profile_id", profileId)
      .order("visited_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (legacy.error) throw mapDbError(legacy.error.message);
    return ((legacy.data ?? []) as VisitRow[]).map(rowToVisit);
  }

  if (primary.error) throw mapDbError(primary.error.message);
  return ((primary.data ?? []) as VisitRow[]).map(rowToVisit);
}

async function fetchCatalogGyms(supabase: SupabaseClient): Promise<CatalogGym[]> {
  const full = await supabase
    .from("gyms")
    .select(
      "id, name, country, place_kind, climbing_types, status, gym_outlets(id, name, city, status, climbing_types), gym_grade_scales(kind, bands, climbing_type)",
    )
    .in("status", ["pending", "published"])
    .order("name");

  let rows: Array<Record<string, unknown>> | null = full.data as Array<Record<string, unknown>> | null;
  let error = full.error;

  if (error && /climbing_type|schema cache|PGRST204|column/i.test(error.message)) {
    const withoutType = await supabase
      .from("gyms")
      .select(
        "id, name, country, place_kind, climbing_types, status, gym_outlets(id, name, city, status), gym_grade_scales(kind, bands)",
      )
      .in("status", ["pending", "published"])
      .order("name");
    rows = withoutType.data as Array<Record<string, unknown>> | null;
    error = withoutType.error;
  }

  if (error && /status|schema cache|PGRST204|column/i.test(error.message)) {
    const withoutStatus = await supabase
      .from("gyms")
      .select(
        "id, name, country, place_kind, climbing_types, gym_outlets(id, name, city), gym_grade_scales(kind, bands)",
      )
      .order("name");
    rows = withoutStatus.data as Array<Record<string, unknown>> | null;
    error = withoutStatus.error;
  }

  if (error && /place_kind|schema cache|PGRST204|column/i.test(error.message)) {
    const withoutKind = await supabase
      .from("gyms")
      .select(
        "id, name, country, climbing_types, gym_outlets(id, name, city), gym_grade_scales(kind, bands)",
      )
      .order("name");
    rows = withoutKind.data as Array<Record<string, unknown>> | null;
    error = withoutKind.error;
  }

  if (error && /climbing_types|schema cache|PGRST204|column/i.test(error.message)) {
    const bare = await supabase
      .from("gyms")
      .select(
        "id, name, country, gym_outlets(id, name, city), gym_grade_scales(kind, bands)",
      )
      .order("name");
    rows = bare.data as Array<Record<string, unknown>> | null;
    error = bare.error;
  }

  if (error) throw mapDbError(error.message);

  return (rows ?? []).flatMap((row) => {
    const gymStatus = normalizeCatalogStatus(
      "status" in row ? (row.status as string | null) : "published",
    );
    if (gymStatus === "rejected") return [];

    const scaleRaw = row.gym_grade_scales;
    const { scale, scales } = parseGymScaleRows(scaleRaw);
    const outlets = Array.isArray(row.gym_outlets) ? row.gym_outlets : [];
    const climbing_types = normalizeClimbingTypes(
      "climbing_types" in row ? (row.climbing_types as string[] | null) : null,
    );
    return [
      {
        id: row.id as string,
        name: row.name as string,
        country: row.country as string,
        status: gymStatus,
        place_kind: normalizePlaceKind(
          "place_kind" in row ? (row.place_kind as string | null) : null,
        ),
        climbing_types: climbing_types.length > 0 ? climbing_types : DEFAULT_CLIMBING_TYPES,
        outlets: (outlets as Array<GymOutlet & { status?: string; climbing_types?: string[] }>).flatMap(
          (outlet) => {
          const status = normalizeCatalogStatus(outlet.status);
          if (status === "rejected") return [];
          const outletTypes = normalizeClimbingTypes(
            "climbing_types" in outlet ? outlet.climbing_types : null,
          );
          return [
            {
              id: outlet.id,
              name: outlet.name,
              city: outlet.city,
              status,
              ...(outletTypes.length > 0 ? { climbing_types: outletTypes } : {}),
            },
          ];
        },
        ),
        scale,
        scales,
      } satisfies CatalogGym,
    ];
  });
}

export async function listCatalogGyms(): Promise<CatalogGym[]> {
  return fetchCatalogGyms(await createClient());
}

function catalogKey(name: string, country: string): string {
  return catalogIdentityKey(name, country);
}

/** Insert any seed gyms/outlets that are not in Supabase yet, then return the picker catalog. */
export async function loadPassportCatalog(profileId: string): Promise<CatalogGym[]> {
  const supabase = await createClient();
  let gyms = await fetchCatalogGyms(supabase);
  const have = new Set(gyms.map((gym) => catalogKey(gym.name, gym.country)));
  const missingGyms = KNOWN_GYMS.filter(
    (gym) => !isClosedGym(gym.name) && !have.has(catalogKey(gym.name, gym.country)),
  );

  if (missingGyms.length > 0) {
    const inserted = await supabase.from("gyms").insert(
      missingGyms.map((gym) => ({
        name: gym.name,
        country: gym.country,
        place_kind: normalizePlaceKind(gym.place_kind),
        climbing_types: normalizeClimbingTypes(gym.climbing_types).length
          ? normalizeClimbingTypes(gym.climbing_types)
          : DEFAULT_CLIMBING_TYPES,
        status: "published" as const,
        created_by: profileId,
      })),
    );
    if (inserted.error && !/duplicate|unique/i.test(inserted.error.message)) {
      // Retry without newer catalog columns if the schema is stale.
      if (/status|place_kind|climbing_types|schema cache|PGRST204|column/i.test(inserted.error.message)) {
        const retry = await supabase.from("gyms").insert(
          missingGyms.map((gym) => ({
            name: gym.name,
            country: gym.country,
            created_by: profileId,
          })),
        );
        if (retry.error && !/duplicate|unique/i.test(retry.error.message)) {
          throw mapDbError(retry.error.message);
        }
      } else {
        throw mapDbError(inserted.error.message);
      }
    }
    gyms = await fetchCatalogGyms(supabase);
  }

  const outletRows: {
    gym_id: string;
    name: string;
    city: string;
    climbing_types: ClimbingType[] | null;
    status: CatalogStatus;
    created_by: string;
  }[] = [];
  const scaleRows: {
    gym_id: string;
    kind: GradeSystem;
    bands: GradeScale["bands"];
    climbing_type: string | null;
    created_by: string;
  }[] = [];

  for (const known of KNOWN_GYMS) {
    if (isClosedGym(known.name)) continue;
    const dbGym = gyms.find(
      (gym) =>
        sameCatalogName(gym.name, known.name) &&
        sameCountry(gym.country, known.country),
    );
    if (!dbGym?.id) continue;

    for (const outlet of visibleOutlets(known)) {
      const exists = dbGym.outlets.some((item) =>
        sameCatalogName(item.name, outlet.name),
      );
      if (!exists) {
        const outletTypes = normalizeClimbingTypes(outlet.climbing_types);
        outletRows.push({
          gym_id: dbGym.id,
          name: outlet.name,
          city: outlet.city,
          climbing_types: outletTypes.length > 0 ? outletTypes : null,
          status: "published",
          created_by: profileId,
        });
      }
    }

    for (const seed of knownScaleSeed(known)) {
      const have = seed.climbing_type
        ? dbGym.scales?.[seed.climbing_type]?.bands.length
        : dbGym.scale?.bands.length;
      if (have) continue;
      scaleRows.push({
        gym_id: dbGym.id,
        kind: seed.scale.kind,
        bands: seed.scale.bands,
        climbing_type: seed.climbing_type,
        created_by: profileId,
      });
    }
  }

  if (outletRows.length > 0) {
    const inserted = await supabase.from("gym_outlets").insert(outletRows);
    if (inserted.error && !/duplicate|unique/i.test(inserted.error.message)) {
      if (/status|climbing_types|schema cache|PGRST204|column/i.test(inserted.error.message)) {
        const retry = await supabase.from("gym_outlets").insert(
          outletRows.map(({ status: _status, climbing_types: _types, ...row }) => row),
        );
        if (retry.error && !/duplicate|unique/i.test(retry.error.message)) {
          throw mapDbError(retry.error.message);
        }
      } else {
        throw mapDbError(inserted.error.message);
      }
    }
  }
  if (scaleRows.length > 0) {
    const inserted = await supabase.from("gym_grade_scales").insert(scaleRows);
    if (inserted.error && /climbing_type|schema cache|PGRST204|column/i.test(inserted.error.message)) {
      const retry = await supabase.from("gym_grade_scales").insert(
        scaleRows.map(({ climbing_type: _climbing_type, ...row }) => row),
      );
      if (retry.error && !/duplicate|unique/i.test(retry.error.message)) {
        throw mapDbError(retry.error.message);
      }
    } else if (inserted.error && !/duplicate|unique/i.test(inserted.error.message)) {
      throw mapDbError(inserted.error.message);
    }
  }

  if (outletRows.length > 0 || scaleRows.length > 0) {
    gyms = await fetchCatalogGyms(supabase);
  }

  return mergeCatalogGyms(gyms);
}

type GymCatalogRow = {
  id: string;
  status?: string | null;
  gym_outlets:
    | { id: string; name: string; city: string; status?: string | null }[]
    | { id: string; name: string; city: string; status?: string | null }
    | null;
};

async function findGymCatalogRow(
  supabase: SupabaseClient,
  name: string,
  country: string,
): Promise<GymCatalogRow | null> {
  const gymName = collapseCatalogLabel(name);
  const gymCountry = collapseCatalogLabel(country);
  const live = await supabase
    .from("gyms")
    .select("id, status, gym_outlets(id, name, city, status)")
    .ilike("name", escapeIlike(gymName))
    .ilike("country", escapeIlike(gymCountry))
    .in("status", ["pending", "published"])
    .limit(1)
    .maybeSingle();
  if (!live.error) return live.data as GymCatalogRow | null;
  if (!/status|schema cache|PGRST204|column/i.test(live.error.message)) {
    throw mapDbError(live.error.message);
  }

  const { data, error } = await supabase
    .from("gyms")
    .select("id, gym_outlets(id, name, city)")
    .ilike("name", escapeIlike(gymName))
    .ilike("country", escapeIlike(gymCountry))
    .limit(1)
    .maybeSingle();
  if (error) throw mapDbError(error.message);
  return data as GymCatalogRow | null;
}

function outletList(
  value: GymCatalogRow["gym_outlets"],
): { id: string; name: string; city: string; status?: string | null }[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

const HIDDEN_PLACE =
  "This place was hidden from the catalog. Your existing stamps are still on your passport.";

const TAKEN_PLACE =
  "That name is already used in this country. Pick the existing place, or send Help if it should come back.";

function assertLiveCatalogStatus(status: string | null | undefined) {
  if (normalizeCatalogStatus(status) === "rejected") {
    throw new Error(HIDDEN_PLACE);
  }
}

async function ensureGymCatalog(
  supabase: SupabaseClient,
  profileId: string,
  input: GymVisitInput,
): Promise<{ gymId: string; outletId: string }> {
  const known = findKnownGym(input.gym_name, input.country);
  const gymName = collapseCatalogLabel(known?.name ?? input.gym_name);
  const resolvedCountry = countryMeta(known?.country ?? input.country);
  const country = collapseCatalogLabel(
    resolvedCountry.name || (known?.country ?? input.country),
  );
  const climbingTypes = normalizeClimbingTypes(
    input.climbing_types ?? known?.climbing_types,
  );
  const resolvedClimbingTypes =
    climbingTypes.length > 0 ? climbingTypes : DEFAULT_CLIMBING_TYPES;
  const placeKind: PlaceKind = normalizePlaceKind(
    input.place_kind ?? known?.place_kind,
  );
  const knownOutlets = known ? visibleOutlets(known) : [];
  const typedOutlet = collapseCatalogLabel(input.outlet || input.city || "");
  const dummyOutlet = sameCatalogName(typedOutlet, gymName);
  const resolvedOutlet =
    knownOutlets.length === 1
      ? knownOutlets[0]
      : knownOutlets.find((outlet) => sameCatalogName(outlet.name, typedOutlet));
  const outletName = collapseCatalogLabel(
    resolvedOutlet?.name ||
      (dummyOutlet ? knownOutlets[0]?.name : typedOutlet) ||
      "Main",
  );
  const city = catalogCity(
    country,
    collapseCatalogLabel(resolvedOutlet?.city || input.city || outletName),
  );

  // Fast path: client already resolved catalog IDs (still verify FK pairing).
  if (input.gym_id && input.outlet_id) {
    const { data: linked, error: linkedError } = await supabase
      .from("gym_outlets")
      .select("id, gym_id, status, gyms(status)")
      .eq("id", input.outlet_id)
      .eq("gym_id", input.gym_id)
      .maybeSingle();
    if (linkedError && /status|schema cache|PGRST204|column/i.test(linkedError.message)) {
      const fallback = await supabase
        .from("gym_outlets")
        .select("id, gym_id")
        .eq("id", input.outlet_id)
        .eq("gym_id", input.gym_id)
        .maybeSingle();
      if (fallback.error) throw mapDbError(fallback.error.message);
      if (fallback.data) {
        return { gymId: fallback.data.gym_id, outletId: fallback.data.id };
      }
    } else if (linkedError) {
      throw mapDbError(linkedError.message);
    } else if (linked) {
      const gymStatus = unwrapOne(
        linked.gyms as { status?: string } | { status?: string }[] | null,
      );
      assertLiveCatalogStatus(linked.status as string | null | undefined);
      assertLiveCatalogStatus(gymStatus?.status);
      return { gymId: linked.gym_id, outletId: linked.id };
    }
  }

  let gym = await findGymCatalogRow(supabase, gymName, country);
  if (gym) assertLiveCatalogStatus(gym.status);
  if (!gym) {
    const gymStatus: CatalogStatus = known ? "published" : "pending";
    const inserted = await supabase
      .from("gyms")
      .insert({
        name: gymName,
        country,
        place_kind: placeKind,
        climbing_types: resolvedClimbingTypes,
        status: gymStatus,
        created_by: profileId,
      })
      .select("id, status, gym_outlets(id, name, city, status)")
      .single();

    if (inserted.error) {
      if (/status|place_kind|climbing_types|schema cache|PGRST204|column/i.test(inserted.error.message)) {
        const retry = await supabase
          .from("gyms")
          .insert({
            name: gymName,
            country,
            created_by: profileId,
          })
          .select("id, gym_outlets(id, name, city)")
          .single();
        if (retry.error) {
          if (/duplicate|unique/i.test(retry.error.message)) {
            gym = await findGymCatalogRow(supabase, gymName, country);
            if (!gym) throw new Error(TAKEN_PLACE);
          } else {
            throw mapDbError(retry.error.message);
          }
        } else {
          gym = retry.data as GymCatalogRow;
        }
      } else if (/duplicate|unique/i.test(inserted.error.message)) {
        gym = await findGymCatalogRow(supabase, gymName, country);
        if (!gym) throw new Error(TAKEN_PLACE);
      } else {
        throw mapDbError(inserted.error.message);
      }
    } else {
      gym = inserted.data as GymCatalogRow;
    }
  }

  if (!gym) {
    throw new Error("Couldn't save that place. Please try again.");
  }

  // Only ensure the outlet used for this visit. Sibling seed outlets are
  // backfilled by loadPassportCatalog on passport load, not on every stamp.
  const outlets = outletList(gym.gym_outlets);
  let outlet =
    outlets.find(
      (row) =>
        sameCatalogName(row.name, outletName) &&
        normalizeCatalogStatus(row.status) !== "rejected",
    ) ?? null;

  if (!outlet) {
    const seedOutlet = knownOutlets.some((item) =>
      sameCatalogName(item.name, outletName),
    );
    const outletStatus: CatalogStatus = seedOutlet ? "published" : "pending";
    const createdOutlet = await supabase
      .from("gym_outlets")
      .insert({
        gym_id: gym.id,
        name: outletName,
        city,
        climbing_types: (() => {
          const types = normalizeClimbingTypes(resolvedOutlet?.climbing_types);
          return types.length > 0 ? types : null;
        })(),
        status: outletStatus,
        created_by: profileId,
      })
      .select("id")
      .single();

    if (createdOutlet.error) {
      if (/status|schema cache|PGRST204|column/i.test(createdOutlet.error.message)) {
        const retry = await supabase
          .from("gym_outlets")
          .insert({
            gym_id: gym.id,
            name: outletName,
            city,
            created_by: profileId,
          })
          .select("id")
          .single();
        if (retry.error) {
          if (/duplicate|unique/i.test(retry.error.message)) {
            const { data: raced, error } = await supabase
              .from("gym_outlets")
              .select("id")
              .eq("gym_id", gym.id)
              .ilike("name", escapeIlike(outletName))
              .maybeSingle();
            if (error) throw mapDbError(error.message);
            if (!raced) throw new Error(TAKEN_PLACE);
            outlet = { id: raced.id, name: outletName, city };
          } else {
            throw mapDbError(retry.error.message);
          }
        } else {
          outlet = { id: retry.data.id, name: outletName, city, status: outletStatus };
        }
      } else if (/duplicate|unique/i.test(createdOutlet.error.message)) {
        const { data: raced, error } = await supabase
          .from("gym_outlets")
          .select("id")
          .eq("gym_id", gym.id)
          .ilike("name", escapeIlike(outletName))
          .maybeSingle();
        if (error) throw mapDbError(error.message);
        if (!raced) throw new Error(TAKEN_PLACE);
        outlet = { id: raced.id, name: outletName, city };
      } else {
        throw mapDbError(createdOutlet.error.message);
      }
    } else {
      outlet = {
        id: createdOutlet.data.id,
        name: outletName,
        city,
        status: outletStatus,
      };
    }
  }

  if (!outlet) {
    throw new Error("Couldn't save that place location. Please try again.");
  }

  assertLiveCatalogStatus(outlet.status);

  // Grade scale is committed after the visit insert succeeds (see createVisit /
  // updateVisit) so abandoned drafts never land in the catalog.
  return { gymId: gym.id, outletId: outlet.id };
}

async function ensureGradeScale(
  supabase: SupabaseClient,
  profileId: string,
  gymId: string,
  scale: GradeScale,
  alreadyPresent: boolean,
): Promise<void> {
  if (alreadyPresent) return;

  const { error } = await supabase.from("gym_grade_scales").insert({
    gym_id: gymId,
    kind: scale.kind,
    bands: scale.bands,
    created_by: profileId,
  });
  if (error && !/duplicate|unique/i.test(error.message)) {
    throw mapDbError(error.message);
  }
}

/** Save a V mapping for a catalog place that does not have one yet. */
export async function saveGymGradeMapping(
  profileId: string,
  input: {
    gym_id?: string;
    gym_name: string;
    country: string;
    city?: string;
    outlet?: string;
    outlet_id?: string;
    place_kind?: PlaceKind;
    climbing_types?: GymVisitInput["climbing_types"];
    scale: GradeScale;
  },
): Promise<GradeScale> {
  const supabase = await createClient();
  const city = (input.city?.trim() || input.outlet?.trim() || input.country).trim();
  const catalog = await ensureGymCatalog(supabase, profileId, {
    gym_name: input.gym_name,
    country: input.country,
    city,
    outlet: input.outlet,
    gym_id: input.gym_id,
    outlet_id: input.outlet_id,
    climbing_types: input.climbing_types,
    place_kind: input.place_kind,
    climbing_type: input.climbing_types?.[0] ?? "bouldering",
    grade_system: input.scale.kind,
    highest_grade: input.scale.bands[0]?.label || input.scale.kind,
    visited_on: new Date().toISOString().slice(0, 10),
  });

  const { data: existing, error: existingError } = await supabase
    .from("gym_grade_scales")
    .select("id")
    .eq("gym_id", catalog.gymId)
    .limit(1);
  if (existingError) throw mapDbError(existingError.message);

  if (!existing?.[0]?.id) {
    await ensureGradeScale(
      supabase,
      profileId,
      catalog.gymId,
      input.scale,
      false,
    );
    return input.scale;
  }

  const { data: updated, error: updateError } = await supabase
    .from("gym_grade_scales")
    .update({
      kind: input.scale.kind,
      bands: input.scale.bands,
    })
    .eq("id", existing[0].id)
    .select("id")
    .maybeSingle();
  if (updateError) throw mapDbError(updateError.message);
  if (!updated?.id) {
    throw new Error(
      "This place already has a grade chart you can’t edit. Try another gym.",
    );
  }
  return input.scale;
}

export async function createVisit(
  profileId: string,
  input: GymVisitInput,
): Promise<GymVisit> {
  const supabase = await createClient();
  // Resolve gym/outlet without writing the grade scale yet.
  const catalog = await ensureGymCatalog(supabase, profileId, {
    ...input,
    scale: undefined,
  });
  const video_path = storedVisitClipUrl(input.video_path);

  const { data, error } = await supabase
    .from("visits")
    .insert({
      profile_id: profileId,
      gym_id: catalog.gymId,
      outlet_id: catalog.outletId,
      climbing_type: input.climbing_type,
      grade_system: input.grade_system,
      highest_grade: input.highest_grade.trim(),
      v_equiv: input.v_equiv?.trim() || null,
      notes: input.notes?.trim() || null,
      video_path,
      visited_on: input.visited_on,
    })
    .select(VISIT_SELECT)
    .single();

  if (error && /climbing_type/i.test(error.message)) {
    throw new Error(
      "The passport tables are out of date. Paste the whole supabase/schema.sql file into the Supabase SQL Editor and run it.",
    );
  }

  if (error && /grade_system|gym_grade_scales_kind/i.test(error.message)) {
    throw new Error(
      "The passport tables are out of date. Paste the whole supabase/schema.sql file into the Supabase SQL Editor and run it.",
    );
  }

  if (error && /video_path|schema cache|PGRST204|column/i.test(error.message)) {
    if (video_path) {
      throw new Error(
        "The passport tables are out of date. Paste the whole supabase/schema.sql file into the Supabase SQL Editor and run it.",
      );
    }
    const retry = await supabase
      .from("visits")
      .insert({
        profile_id: profileId,
        gym_id: catalog.gymId,
        outlet_id: catalog.outletId,
        climbing_type: input.climbing_type,
        grade_system: input.grade_system,
        highest_grade: input.highest_grade.trim(),
        v_equiv: input.v_equiv?.trim() || null,
        notes: input.notes?.trim() || null,
        visited_on: input.visited_on,
      })
      .select(
        `
  id,
  profile_id,
  gym_id,
  outlet_id,
  climbing_type,
  grade_system,
  highest_grade,
  v_equiv,
  notes,
  visited_on,
  created_at,
  updated_at,
  gyms!gym_id ( name, country ),
  gym_outlets!outlet_id ( name, city )
`,
      )
      .single();
    if (retry.error) throw mapDbError(retry.error.message);
    await commitGradeScaleIfNeeded(supabase, profileId, catalog.gymId, input);
    return rowToVisit(retry.data as VisitRow);
  }

  if (error) throw mapDbError(error.message);
  await commitGradeScaleIfNeeded(supabase, profileId, catalog.gymId, input);
  return rowToVisit(data as VisitRow);
}

async function commitGradeScaleIfNeeded(
  supabase: SupabaseClient,
  profileId: string,
  gymId: string,
  input: GymVisitInput,
): Promise<void> {
  if (!input.scale) return;
  const { data, error } = await supabase
    .from("gym_grade_scales")
    .select("id")
    .eq("gym_id", gymId)
    .limit(1);
  if (error) throw mapDbError(error.message);
  await ensureGradeScale(
    supabase,
    profileId,
    gymId,
    input.scale,
    Boolean(data?.[0]?.id),
  );
}

export async function updateVisit(
  profileId: string,
  visitId: string,
  input: GymVisitInput,
): Promise<GymVisit> {
  const supabase = await createClient();
  const catalog = await ensureGymCatalog(supabase, profileId, {
    ...input,
    scale: undefined,
  });
  const existing = await fetchVisitClipUrl(supabase, profileId, visitId);
  const video_path = nextVisitClipUrl(existing, input);

  const { data, error } = await supabase
    .from("visits")
    .update({
      gym_id: catalog.gymId,
      outlet_id: catalog.outletId,
      climbing_type: input.climbing_type,
      grade_system: input.grade_system,
      highest_grade: input.highest_grade.trim(),
      v_equiv: input.v_equiv?.trim() || null,
      notes: input.notes?.trim() || null,
      video_path,
      visited_on: input.visited_on,
    })
    .eq("id", visitId)
    .eq("profile_id", profileId)
    .select(VISIT_SELECT)
    .single();

  if (error && /climbing_type/i.test(error.message)) {
    throw new Error(
      "The passport tables are out of date. Paste the whole supabase/schema.sql file into the Supabase SQL Editor and run it.",
    );
  }
  if (error && /grade_system|gym_grade_scales_kind/i.test(error.message)) {
    throw new Error(
      "The passport tables are out of date. Paste the whole supabase/schema.sql file into the Supabase SQL Editor and run it.",
    );
  }
  if (error && /video_path|schema cache|PGRST204|column/i.test(error.message)) {
    if (video_path) {
      throw new Error(
        "The passport tables are out of date. Paste the whole supabase/schema.sql file into the Supabase SQL Editor and run it.",
      );
    }
    const retry = await supabase
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
      .select(
        `
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
`,
      )
      .single();
    if (retry.error) throw mapDbError(retry.error.message);
    await commitGradeScaleIfNeeded(supabase, profileId, catalog.gymId, input);
    return rowToVisit(retry.data as VisitRow);
  }

  if (error) throw mapDbError(error.message);
  await commitGradeScaleIfNeeded(supabase, profileId, catalog.gymId, input);
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

export async function getGymReportEligibility(
  profileId: string,
  gymId: string,
): Promise<GymReportEligibility> {
  const supabase = await createClient();
  const [gymResult, reportResult] = await Promise.all([
    supabase.from("gyms").select("id, status, created_by").eq("id", gymId).maybeSingle(),
    supabase
      .from("gym_reports")
      .select("id")
      .eq("gym_id", gymId)
      .eq("profile_id", profileId)
      .maybeSingle(),
  ]);

  if (gymResult.error) throw mapDbError(gymResult.error.message);
  if (reportResult.error) throw mapDbError(reportResult.error.message);

  if (!gymResult.data || normalizeCatalogStatus(gymResult.data.status) === "rejected") {
    return { status: "unavailable" };
  }
  if (reportResult.data) return { status: "already_reported" };
  if (gymResult.data.created_by === profileId) return { status: "own_gym" };

  return { status: "eligible" };
}

export async function reportCatalogGym(
  profileId: string,
  input: GymReportInput,
): Promise<void> {
  if (!isGymReportReason(input.reason)) {
    throw new Error("Pick what’s off with this listing.");
  }
  const source = input.source ?? "log_sheet";
  if (!isGymReportSource(source)) {
    throw new Error("Could not send that report.");
  }

  const details = input.details?.trim() ?? "";
  if (input.reason === "other" && details.length < GYM_REPORT_DETAILS_MIN_OTHER) {
    throw new Error("Tell us what’s off in a sentence or two.");
  }
  if (details.length > GYM_REPORT_DETAILS_MAX) {
    throw new Error("Keep that note under 500 characters.");
  }

  const eligibility = await getGymReportEligibility(profileId, input.gymId);
  if (eligibility.status !== "eligible") {
    throw new GymReportBlockedError(eligibility.status);
  }

  const supabase = await createClient();
  const outletId = input.outletId?.trim() || null;
  if (outletId) {
    const outlet = await supabase
      .from("gym_outlets")
      .select("id")
      .eq("id", outletId)
      .eq("gym_id", input.gymId)
      .maybeSingle();
    if (outlet.error) throw mapDbError(outlet.error.message);
    if (!outlet.data) throw new Error("That outlet isn’t part of this place.");
  }

  const { error } = await supabase.from("gym_reports").insert({
    gym_id: input.gymId,
    profile_id: profileId,
    reason: input.reason,
    details: details || null,
    outlet_id: outletId,
    source,
  });
  if (!error) return;
  if (/duplicate|unique/i.test(error.message)) {
    throw new GymReportBlockedError("already_reported");
  }
  if (/reason|outlet_id|source|schema cache|PGRST204|column/i.test(error.message)) {
    throw new Error(
      "The passport tables are out of date. Paste the whole supabase/schema.sql file into the Supabase SQL Editor and run it.",
    );
  }
  if (/row-level security|permission denied/i.test(error.message)) {
    const retry = await getGymReportEligibility(profileId, input.gymId);
    if (retry.status !== "eligible") {
      throw new GymReportBlockedError(retry.status);
    }
    throw new Error("Could not send that report.");
  }
  throw mapDbError(error.message);
}

function storedVisitClipUrl(path: string | null | undefined): string | null {
  const parsed = parseVisitMediaUrl(path ?? "");
  if (!parsed) return null;
  if ("error" in parsed) throw new Error(parsed.error);
  return parsed.url;
}

async function fetchVisitClipUrl(
  supabase: SupabaseClient,
  profileId: string,
  visitId: string,
): Promise<string | null> {
  const current = await supabase
    .from("visits")
    .select("video_path")
    .eq("id", visitId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (
    current.error &&
    /video_path|schema cache|PGRST204|column/i.test(current.error.message)
  ) {
    return null;
  }
  if (current.error) throw mapDbError(current.error.message);
  if (!current.data) throw new Error("Couldn't find that stamp.");
  return visitMediaLinkFromStored((current.data.video_path as string | null) ?? null)?.url ?? null;
}

function nextVisitClipUrl(
  existing: string | null,
  input: GymVisitInput,
): string | null {
  const clip = storedVisitClipUrl(input.video_path);
  if (clip) return clip;
  if (input.clear_media) return null;
  return existing;
}
