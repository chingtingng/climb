"use client";

import { useEffect, useId, useState } from "react";
import {
  getGymReportEligibilityAction,
  reportCatalogGymAction,
} from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { ChoiceTile } from "@/components/ui/ChoiceTile";
import { TextArea } from "@/components/ui/Field";
import {
  GYM_REPORT_DETAILS_MAX,
  GYM_REPORT_DETAILS_MIN_OTHER,
  GYM_REPORT_REASON_LABELS,
  GYM_REPORT_REASONS,
  gymReportBlockedMessage,
  type GymReportEligibilityStatus,
  type GymReportReason,
} from "@/lib/gymReports";
import { AccountDialog } from "./AccountDialog";
import { ActionButtonLabel } from "./ActionButtonLabel";
import { HelpFeedbackDialog } from "./HelpFeedbackDialog";

export function ReportPlaceDialog({
  open,
  onClose,
  onReported,
  gymId,
  gymName,
  outletId,
  outletName,
  username,
}: {
  open: boolean;
  onClose: () => void;
  onReported: () => void;
  gymId: string;
  gymName: string;
  outletId?: string;
  outletName?: string;
  username: string;
}) {
  const titleId = useId();
  const copyId = useId();
  const detailsId = useId();
  const [status, setStatus] = useState<GymReportEligibilityStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reason, setReason] = useState<GymReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const placeLabel = [gymName, outletName].filter(Boolean).join(" · ");
  const otherNeedsDetails = reason === "other";
  const detailsTrimmed = details.trim();
  const canSubmit =
    Boolean(reason) &&
    (!otherNeedsDetails || detailsTrimmed.length >= GYM_REPORT_DETAILS_MIN_OTHER) &&
    detailsTrimmed.length <= GYM_REPORT_DETAILS_MAX;

  useEffect(() => {
    if (!open) {
      setStatus(null);
      setLoadError(null);
      setReason(null);
      setDetails("");
      setError(null);
      setPending(false);
      setHelpOpen(false);
      return;
    }

    let cancelled = false;
    setStatus(null);
    setLoadError(null);
    setError(null);

    void getGymReportEligibilityAction(gymId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setLoadError(result.error ?? "Could not check this listing.");
        return;
      }
      setStatus(result.status);
    });

    return () => {
      cancelled = true;
    };
  }, [open, gymId]);

  const blocked =
    status && status !== "eligible" ? gymReportBlockedMessage(status) : null;
  const checking = open && !loadError && status === null;

  return (
    <>
      <AccountDialog
        open={open}
        pending={pending || helpOpen}
        onClose={onClose}
        titleId={titleId}
        descriptionId={copyId}
        title="What’s off?"
        titleClassName="text-xl"
        description={placeLabel}
        wide
      >
        {checking ? (
          <p className="mt-4 text-center text-sm text-ink-soft">Checking…</p>
        ) : loadError ? (
          <div className="mt-4 space-y-3 text-left">
            <p role="alert" className="text-sm text-danger-ink">
              {loadError}
            </p>
            <Button type="button" variant="tertiary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : blocked ? (
          <div className="mt-4 space-y-3 text-left">
            <p className="text-sm leading-relaxed text-ink-soft">{blocked}</p>
            {status === "own_gym" ? (
              <Button type="button" onClick={() => setHelpOpen(true)}>
                Help & feedback
              </Button>
            ) : null}
            <Button type="button" variant="tertiary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <form
            className="account-edit-form mt-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (pending || !reason || !canSubmit) return;
              setPending(true);
              setError(null);
              try {
                const result = await reportCatalogGymAction({
                  gymId,
                  reason,
                  details: detailsTrimmed,
                  outletId,
                  source: "log_sheet",
                });
                if (!result.ok) {
                  setError(result.error ?? "Could not send that report.");
                  setPending(false);
                  return;
                }
                onReported();
              } catch {
                setError("Could not send that report.");
                setPending(false);
              }
            }}
          >
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="mb-2 text-xs font-semibold text-ink">What’s wrong</legend>
              <div
                role="radiogroup"
                aria-label="What’s wrong"
                className="flex flex-col gap-1.5"
              >
                {GYM_REPORT_REASONS.map((item) => (
                  <ChoiceTile
                    key={item}
                    role="radio"
                    aria-checked={reason === item}
                    selected={reason === item}
                    disabled={pending}
                    className="w-full py-2.5 text-sm font-semibold"
                    onClick={() => setReason(item)}
                  >
                    {GYM_REPORT_REASON_LABELS[item]}
                  </ChoiceTile>
                ))}
              </div>
            </fieldset>

            <label htmlFor={detailsId}>
              <span>
                What should it be?
                {!otherNeedsDetails ? (
                  <span className="font-medium text-ink-soft"> (optional)</span>
                ) : null}
              </span>
              <TextArea
                id={detailsId}
                name="details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                required={otherNeedsDetails}
                minLength={otherNeedsDetails ? GYM_REPORT_DETAILS_MIN_OTHER : undefined}
                maxLength={GYM_REPORT_DETAILS_MAX}
                disabled={pending}
                placeholder="e.g. closed last year, or the wrong city"
                className="placeholder:text-sm"
              />
            </label>
            <p className="text-right text-xs text-ink-soft">
              {details.length}/{GYM_REPORT_DETAILS_MAX}
            </p>

            {error ? (
              <p role="alert" className="text-sm text-danger-ink">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={pending || !canSubmit}
              aria-busy={pending}
              className="mt-1"
            >
              <ActionButtonLabel pending={pending} idle="Send report" busy="Sending…" />
            </Button>
            <Button type="button" variant="tertiary" disabled={pending} onClick={onClose}>
              Cancel
            </Button>
          </form>
        )}
      </AccountDialog>
      <HelpFeedbackDialog
        username={username}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </>
  );
}
