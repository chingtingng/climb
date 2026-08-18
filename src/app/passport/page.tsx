import { redirect } from "next/navigation";
import { PassportApp } from "@/components/PassportApp";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listVisitsForProfile } from "@/lib/visits";

export default async function PassportPage() {
  const session = await getSessionUser();
  if (!session) redirect("/");

  const configured = isSupabaseConfigured();
  const visits = configured ? await listVisitsForProfile(session.id) : [];

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
