export const GYM_REPORT_REASONS = [
  "wrong_name",
  "wrong_location",
  "duplicate",
  "wrong_kind",
  "wrong_types",
  "wrong_grades",
  "closed_or_missing",
  "other",
] as const;

export type GymReportReason = (typeof GYM_REPORT_REASONS)[number];

export const GYM_REPORT_REASON_LABELS: Record<GymReportReason, string> = {
  wrong_name: "Wrong name",
  wrong_location: "Wrong city, country, or outlet",
  duplicate: "Duplicate of another place",
  wrong_kind: "Gym vs rock is wrong",
  wrong_types: "Climbing types are wrong",
  wrong_grades: "Grade chart looks wrong",
  closed_or_missing: "Closed, moved, or never existed",
  other: "Something else",
};

export const GYM_REPORT_SOURCES = ["log_sheet"] as const;

export type GymReportSource = (typeof GYM_REPORT_SOURCES)[number];

export const GYM_REPORT_DETAILS_MAX = 500;
export const GYM_REPORT_DETAILS_MIN_OTHER = 8;

export type GymReportEligibilityStatus =
  | "eligible"
  | "own_gym"
  | "already_reported"
  | "unavailable";

export type GymReportEligibility = {
  status: GymReportEligibilityStatus;
};

export type GymReportInput = {
  gymId: string;
  reason: GymReportReason;
  details?: string;
  outletId?: string | null;
  source?: GymReportSource;
};

export function isGymReportReason(value: string): value is GymReportReason {
  return (GYM_REPORT_REASONS as readonly string[]).includes(value);
}

export function isGymReportSource(value: string): value is GymReportSource {
  return (GYM_REPORT_SOURCES as readonly string[]).includes(value);
}

export function gymReportBlockedMessage(
  status: Exclude<GymReportEligibilityStatus, "eligible">,
): string {
  switch (status) {
    case "own_gym":
      return "You added this place, so you can’t flag it. If the name or city is off, send Help & feedback.";
    case "already_reported":
      return "You’ve already flagged this place.";
    case "unavailable":
      return "This listing isn’t in the catalog right now.";
  }
}

export class GymReportBlockedError extends Error {
  readonly status: Exclude<GymReportEligibilityStatus, "eligible">;

  constructor(status: Exclude<GymReportEligibilityStatus, "eligible">) {
    super(gymReportBlockedMessage(status));
    this.name = "GymReportBlockedError";
    this.status = status;
  }
}
