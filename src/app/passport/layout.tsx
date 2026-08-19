import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PassportShell } from "@/components/passport/PassportShell";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { CatalogGym, GymVisit } from "@/lib/types";
import { listCatalogGyms, listVisitsForProfile } from "@/lib/visits";

export const dynamic = "force-dynamic";

export default async function PassportLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/");

  const configured = isSupabaseConfigured();
  let visits: GymVisit[] = [];
  let catalogGyms: CatalogGym[] = [];
  let loadError: string | null = null;

  if (configured) {
    try {
      visits = await listVisitsForProfile(session.id);
      catalogGyms = await listCatalogGyms();
    } catch (error) {
      loadError =
        error instanceof Error
          ? error.message
          : "Couldn't load your stamps right now. Try again in a moment.";
    }
  }

  return (
    <PassportShell
      username={session.username}
      visits={visits}
      catalogGyms={catalogGyms}
      configured={configured}
      loadError={loadError}
    >
      {children}
    </PassportShell>
  );
}
