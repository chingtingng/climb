import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const GRADE_CHART_BUCKET = "gym-grade-charts";

async function listObjectPaths(
  admin: SupabaseClient,
  prefix: string,
): Promise<string[]> {
  const { data, error } = await admin.storage
    .from(GRADE_CHART_BUCKET)
    .list(prefix, { limit: 1000, offset: 0 });
  if (error) {
    throw new Error("Couldn't list grade-chart files to delete.");
  }

  const paths: string[] = [];
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    // Storage folders have a null id; objects have a uuid.
    if (item.id === null) {
      paths.push(...(await listObjectPaths(admin, path)));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

async function deleteGradeChartFiles(admin: SupabaseClient, userId: string) {
  const paths = await listObjectPaths(admin, userId);
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { error } = await admin.storage.from(GRADE_CHART_BUCKET).remove(chunk);
    if (error) {
      throw new Error("Couldn't delete grade-chart files.");
    }
  }
}

/**
 * Permanently remove an Auth user, which cascades to `profiles` and `visits`.
 * Grade-chart objects under `{userId}/` are deleted first. Gym catalog rows
 * stay (`created_by` is set null).
 *
 * Requires `SUPABASE_SERVICE_ROLE_KEY` on the server.
 */
export async function deleteAccountForUser(userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error(
      "Account deletion isn't set up on the server yet. Email us from Help and we'll delete the account.",
    );
  }

  try {
    await deleteGradeChartFiles(admin, userId);
  } catch {
    // Prefer removing the login over leaving an orphaned account if Storage fails.
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(
      "Couldn't delete the account. Try again, or email us from Help.",
    );
  }
}
