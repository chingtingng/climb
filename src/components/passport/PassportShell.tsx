"use client";

import type { ReactNode } from "react";
import type { GymVisit } from "@/lib/types";
import { BottomNav } from "./BottomNav";
import { LogGymSheet } from "./LogGymSheet";
import { PassportProvider } from "./PassportContext";

export function PassportShell({
  username,
  visits,
  configured,
  loadError,
  children,
}: {
  username: string;
  visits: GymVisit[];
  configured: boolean;
  loadError: string | null;
  children: ReactNode;
}) {
  return (
    <PassportProvider
      username={username}
      visits={visits}
      configured={configured}
      loadError={loadError}
    >
      <div className="passport-root">
        <div className="passport-frame">{children}</div>
        <BottomNav />
        <LogGymSheet />
      </div>
    </PassportProvider>
  );
}
