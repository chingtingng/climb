import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Permanently remove an Auth user, which cascades to `profiles` and `visits`.
 * Gym catalog rows stay (`created_by` is set null).
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

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(
      "Couldn't delete the account. Try again, or email us from Help.",
    );
  }
}
