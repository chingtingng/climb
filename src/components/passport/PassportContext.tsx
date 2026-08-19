"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { computeStats, groupVisitsByGym } from "@/lib/gyms";
import type { CatalogGym, GymGroup, GymVisit, PassportStats } from "@/lib/types";

export type LogPrefill = {
  name?: string;
  city?: string;
  country?: string;
  outlet?: string;
  existing?: boolean;
};

type PassportContextValue = {
  username: string;
  visits: GymVisit[];
  gyms: GymGroup[];
  catalogGyms: CatalogGym[];
  stats: PassportStats;
  configured: boolean;
  loadError: string | null;
  logOpen: boolean;
  logPrefill: LogPrefill | null;
  openLog: (prefill?: LogPrefill) => void;
  closeLog: () => void;
};

const PassportContext = createContext<PassportContextValue | null>(null);

export function PassportProvider({
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
  const [logOpen, setLogOpen] = useState(false);
  const [logPrefill, setLogPrefill] = useState<LogPrefill | null>(null);

  const gyms = useMemo(() => groupVisitsByGym(visits), [visits]);
  const stats = useMemo(() => computeStats(visits, gyms), [visits, gyms]);

  const openLog = useCallback((prefill?: LogPrefill) => {
    setLogPrefill(prefill ?? null);
    setLogOpen(true);
  }, []);

  const closeLog = useCallback(() => {
    setLogOpen(false);
    setLogPrefill(null);
  }, []);

  const value = useMemo(
    () => ({
      username,
      visits,
      gyms,
      catalogGyms,
      stats,
      configured,
      loadError,
      logOpen,
      logPrefill,
      openLog,
      closeLog,
    }),
    [
      username,
      visits,
      gyms,
      catalogGyms,
      stats,
      configured,
      loadError,
      logOpen,
      logPrefill,
      openLog,
      closeLog,
    ],
  );

  return (
    <PassportContext.Provider value={value}>{children}</PassportContext.Provider>
  );
}

export function usePassport() {
  const ctx = useContext(PassportContext);
  if (!ctx) {
    throw new Error("usePassport must be used within PassportProvider");
  }
  return ctx;
}
