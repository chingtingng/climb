"use client";

import { useId } from "react";
import { HelpForm } from "@/components/site/HelpForm";
import { AccountDialog } from "./AccountDialog";

export function HelpFeedbackDialog({
  username,
  email,
  open,
  onClose,
}: {
  username?: string | null;
  email?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const copyId = useId();

  return (
    <AccountDialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      descriptionId={copyId}
      title="Help & feedback"
      description="Questions, bugs, or ideas. Send opens your email app — nothing is stored here."
    >
      <HelpForm
        username={username}
        email={email}
        className="account-edit-form mt-4"
        onCancel={onClose}
      />
    </AccountDialog>
  );
}
