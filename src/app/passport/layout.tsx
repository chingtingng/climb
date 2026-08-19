import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { PassportShell } from "@/components/passport/PassportShell";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { CatalogGym, GymVisit } from "@/lib/types";
import { mergeCatalogGyms } from "@/lib/gymCatalog";
import { listVisitsForProfile, loadPassportCatalog } from "@/lib/visits";

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

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
      catalogGyms = await loadPassportCatalog(session.id);
    } catch (error) {
      loadError =
        error instanceof Error
          ? error.message
          : "Couldn't load your stamps right now. Try again in a moment.";
      catalogGyms = mergeCatalogGyms([]);
    }
  } else {
    catalogGyms = mergeCatalogGyms([]);
  }

  return (
    <div className={`${dmSerif.variable} ${dmSans.variable}`}>
      <PassportShell
        username={session.username}
        visits={visits}
        catalogGyms={catalogGyms}
        configured={configured}
        loadError={loadError}
      >
        {children}
      </PassportShell>
    </div>
  );
}
