import { SpinnerIcon } from "./icons";

/** Idle / busy label with spinner for async action buttons. */
export function ActionButtonLabel({
  pending,
  idle,
  busy,
}: {
  pending: boolean;
  idle: string;
  busy: string;
}) {
  return (
    <>
      {pending ? <SpinnerIcon /> : null}
      <span>{pending ? busy : idle}</span>
    </>
  );
}
