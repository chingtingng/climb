"use client";

import { usePathname } from "next/navigation";
import { usePassport } from "@/components/passport/PassportContext";
import { Stamp } from "./Stamp";

export function LogVisitFab() {
  const pathname = usePathname();
  const { configured, openLog, visits } = usePassport();
  const onHome = pathname === "/passport";
  const onPlaces = pathname === "/passport/gyms";
  if (!onHome && !onPlaces) return null;
  if (visits.length === 0) return null;

  return (
    <div className="passport-fab">
      <button
        type="button"
        onClick={() => openLog()}
        disabled={!configured}
        aria-label="Log a visit"
        className="rounded-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Stamp variant="add" size="md" seed="log-visit" />
      </button>
    </div>
  );
}
