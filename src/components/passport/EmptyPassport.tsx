import { EmptyState } from "@/components/ui/EmptyState";

export function EmptyPassport({
  onLog,
  disabled,
}: {
  onLog: () => void;
  disabled?: boolean;
}) {
  return (
    <EmptyState
      seed="blank-passport"
      label="GO"
      title="Your passport is still blank."
      body="Every climbing adventure starts with one place."
      actionLabel="+ Log your first visit"
      onAction={onLog}
      disabled={disabled}
    />
  );
}
