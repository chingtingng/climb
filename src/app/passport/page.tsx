import { redirect } from "next/navigation";
import { PassportApp } from "@/components/PassportApp";
import { readSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getProfileByUsername, listVisitsForProfile } from "@/lib/visits";

export default async function PassportPage() {
  const session = await readSession();
  if (!session) redirect("/");

  const configured = isSupabaseConfigured();
  let visits = [] as Awaited<ReturnType<typeof listVisitsForProfile>>;

  if (configured) {
    const profile = await getProfileByUsername(session.username);
    if (profile) {
      visits = await listVisitsForProfile(profile.id);
    }
  }

  return (
    <main className="app-shell">
      <PassportApp
        username={session.username}
        visits={visits}
        configured={configured}
      />
    </main>
  );
}
