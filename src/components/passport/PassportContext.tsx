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
  editVisit: GymVisit | null;
  openLog: (prefill?: LogPrefill) => void;
  closeLog: () => void;
  openEdit: (visit: GymVisit) => void;
  closeEdit: () => void;
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
  const [editVisit, setEditVisit] = useState<GymVisit | null>(null);

  const gyms = useMemo(
    () => groupVisitsByGym(visits, catalogGyms),
    [visits, catalogGyms],
  );
  const stats = useMemo(() => computeStats(visits, gyms), [visits, gyms]);

  const openLog = useCallback((prefill?: LogPrefill) => {
    setEditVisit(null);
    setLogPrefill(prefill ?? null);
    setLogOpen(true);
  }, []);

  const closeLog = useCallback(() => {
    setLogOpen(false);
    setLogPrefill(null);
  }, []);

  const openEdit = useCallback((visit: GymVisit) => {
    setLogOpen(false);
    setLogPrefill(null);
    setEditVisit(visit);
  }, []);

  const closeEdit = useCallback(() => {
    setEditVisit(null);
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
      editVisit,
      openLog,
      closeLog,
      openEdit,
      closeEdit,
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
      editVisit,
      openLog,
      closeLog,
      openEdit,
      closeEdit,
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
