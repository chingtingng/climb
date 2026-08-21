/** Local calendar date as YYYY-MM-DD (avoids UTC-yesterday bugs). */
export function todayISO(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

export function formatStampDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${iso}T00:00:00`));
  } catch {
    return iso;
  }
}

export function formatStampDayMonth(iso: string): { day: string; month: string } {
  try {
    const date = new Date(`${iso}T00:00:00`);
    return {
      day: String(date.getDate()),
      month: new Intl.DateTimeFormat("en-GB", { month: "short" })
        .format(date)
        .toUpperCase(),
    };
  } catch {
    return { day: iso.slice(8, 10) || "—", month: "" };
  }
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Abbreviated month + year, e.g. "May 2021". */
export function formatMonthYear(iso: string): string | null {
  try {
    const date = new Date(`${iso}T00:00:00`);
    const year = date.getFullYear();
    const month = SHORT_MONTHS[date.getMonth()];
    if (!Number.isFinite(year) || !month) return null;
    return `${month} ${year}`;
  } catch {
    return null;
  }
}
