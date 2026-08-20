"use client";

import type { ReactNode } from "react";
import type { CatalogGym, GymVisit } from "@/lib/types";
import { LogVisitFab } from "@/components/ui/LogVisitFab";
import { BottomNav } from "./BottomNav";
import { LogGymSheet } from "./LogGymSheet";
import { EditVisitSheet } from "./EditVisitSheet";
import { PassportProvider } from "./PassportContext";

export function PassportShell({
  username,
  visits,
  catalogGyms,
  configured,
  loadError,
  children,
}: {
  username: string;
  visits: GymVisit[];
  catalogGyms: CatalogGym[];
  configured: boolean;
  loadError: string | null;
  children: ReactNode;
}) {
  return (
    <PassportProvider
      username={username}
      visits={visits}
      catalogGyms={catalogGyms}
      configured={configured}
      loadError={loadError}
    >
      <div className="passport-root">
        <div className="passport-frame">{children}</div>
        <BottomNav />
        <LogVisitFab />
        <LogGymSheet />
        <EditVisitSheet />
      </div>
    </PassportProvider>
  );
}
