"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { createPortal, useFormStatus } from "react-dom";
import { logoutAction } from "@/app/actions";
import { cx } from "@/components/ui/cx";
import { ActionButtonLabel } from "./ActionButtonLabel";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { ChangeUsernameDialog } from "./ChangeUsernameDialog";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { FaqDialog } from "./FaqDialog";
import { HelpFeedbackDialog } from "./HelpFeedbackDialog";
import { BackIcon, ChevronIcon, TrashIcon } from "./icons";
import { usePassport } from "./PassportContext";

type Panel = "menu" | "manage" | "about";
type Overlay = "username" | "password" | "delete" | "help" | "faq" | null;
type AccountMenuVariant = "header" | "rail";

export function AccountMenu({
  variant = "header",
}: {
  variant?: AccountMenuVariant;
}) {
  const { username } = usePassport();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("menu");
  const [edit, setEdit] = useState<Overlay>(null);
  const titleId = useId();
  const overlayOpen = edit !== null;

  const close = useCallback(() => {
    setOpen(false);
    setPanel("menu");
    setEdit(null);
  }, []);

  const closeEdit = useCallback(() => setEdit(null), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (overlayOpen) return;
      if (panel === "manage" || panel === "about") {
        setPanel("menu");
        return;
      }
      close();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [close, overlayOpen, open, panel]);

  const sheet = open ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/35"
        aria-label="Close menu"
        onClick={close}
      />
      <div className="relative w-full sm:px-3">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="passport-sheet-in sheet mx-auto w-full max-w-[var(--sheet-max)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
        >
          <div className="sheet-handle mx-auto mb-2 h-1 w-10 rounded-full bg-sky-300" />
          {panel === "manage" ? (
            <div key="manage" className="sheet-step">
              <PanelHeader
                titleId={titleId}
                title="Manage account"
                onBack={() => setPanel("menu")}
              />
              <SettingsRow
                icon={<AtIcon />}
                label="Username"
                value={`@${username}`}
                onClick={() => setEdit("username")}
              />
              <SettingsRow
                icon={<LockIcon />}
                label="Password"
                value="••••••••"
                onClick={() => setEdit("password")}
              />
              <button
                type="button"
                onClick={() => setEdit("delete")}
                className="flex h-14 w-full cursor-pointer items-center gap-3 border-0 border-t border-sky-200 bg-transparent px-4 py-0 text-danger-ink"
              >
                <TrashIcon />
                <span className="text-sm font-semibold">Delete account</span>
              </button>
            </div>
          ) : panel === "about" ? (
            <div key="about" className="sheet-step">
              <PanelHeader
                titleId={titleId}
                title="About"
                onBack={() => setPanel("menu")}
              />
              <Link
                href="/privacy"
                onClick={close}
                className="flex h-14 items-center gap-3 px-4"
              >
                <DocIcon />
                <span className="text-sm font-semibold">Privacy</span>
              </Link>
              <Link
                href="/terms"
                onClick={close}
                className="flex h-14 items-center gap-3 px-4"
              >
                <DocIcon />
                <span className="text-sm font-semibold">Terms</span>
              </Link>
            </div>
          ) : (
            <div key="menu" className="sheet-step">
              <h2 id={titleId} className="label-micro px-4 pt-1">
                Account
              </h2>
              <button
                type="button"
                onClick={() => setPanel("manage")}
                className="flex h-14 w-full cursor-pointer items-center gap-3 bg-transparent px-4 py-0 text-ink"
              >
                <SettingsIcon />
                <span className="text-sm font-semibold">Manage account</span>
                <ChevronIcon className="ml-auto size-4 -rotate-90 text-ink-soft" />
              </button>
              <button
                type="button"
                onClick={() => setEdit("faq")}
                className="flex h-14 w-full cursor-pointer items-center gap-3 bg-transparent px-4 py-0 text-ink"
              >
                <QuestionIcon />
                <span className="text-sm font-semibold">FAQ</span>
              </button>
              <button
                type="button"
                onClick={() => setEdit("help")}
                className="flex h-14 w-full cursor-pointer items-center gap-3 bg-transparent px-4 py-0 text-ink"
              >
                <ChatIcon />
                <span className="text-sm font-semibold">Help & feedback</span>
              </button>
              <button
                type="button"
                onClick={() => setPanel("about")}
                className="flex h-14 w-full cursor-pointer items-center gap-3 bg-transparent px-4 py-0 text-ink"
              >
                <InfoIcon />
                <span className="text-sm font-semibold">About</span>
                <ChevronIcon className="ml-auto size-4 -rotate-90 text-ink-soft" />
              </button>
              <form action={logoutAction} className="m-0">
                <LogoutButton />
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <AccountTrigger
        variant={variant}
        username={username}
        open={open}
        onOpen={() => setOpen(true)}
      />
      {sheet ? createPortal(sheet, document.body) : null}

      <FaqDialog open={edit === "faq"} onClose={closeEdit} />
      <HelpFeedbackDialog
        username={username}
        open={edit === "help"}
        onClose={closeEdit}
      />
      <ChangeUsernameDialog
        username={username}
        open={edit === "username"}
        onClose={closeEdit}
      />
      <ChangePasswordDialog open={edit === "password"} onClose={closeEdit} />
      <DeleteAccountDialog
        username={username}
        open={edit === "delete"}
        onClose={closeEdit}
      />
    </>
  );
}

function AccountTrigger({
  variant,
  username,
  open,
  onOpen,
}: {
  variant: AccountMenuVariant;
  username: string;
  open: boolean;
  onOpen: () => void;
}) {
  const initial = username.charAt(0).toUpperCase();
  const avatar = (
    <span
      aria-hidden
      className={cx(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100 font-semibold text-ink",
        variant === "rail" ? "text-xs" : "text-sm",
      )}
    >
      {initial}
    </span>
  );

  if (variant === "rail") {
    return (
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onOpen}
        className="passport-nav-account"
      >
        {avatar}
        <span className="min-w-0 truncate">@{username}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label="Account menu"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onOpen}
      className="-mr-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink desktop:hidden"
    >
      {avatar}
    </button>
  );
}

function PanelHeader({
  titleId,
  title,
  onBack,
}: {
  titleId: string;
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-1 px-2">
      <button
        type="button"
        aria-label="Back to account"
        onClick={onBack}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink"
      >
        <BackIcon />
      </button>
      <h2 id={titleId} className="label-micro">
        {title}
      </h2>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full cursor-pointer items-center gap-3 bg-transparent px-4 py-2.5 text-left text-ink"
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-ink-soft">{label}</span>
        <span className="mt-0.5 block break-all text-sm font-semibold text-ink">
          {value}
        </span>
      </span>
      <ChevronIcon className="ml-auto size-4 shrink-0 -rotate-90 text-ink-soft" />
    </button>
  );
}

function LogoutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex h-14 w-full cursor-pointer items-center gap-3 border-0 border-t border-sky-200 bg-transparent px-4 py-0 text-danger-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogoutIcon />
      <span className="inline-flex items-center gap-2 text-sm font-semibold">
        <ActionButtonLabel pending={pending} idle="Log out" busy="Logging out…" />
      </span>
    </button>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0" fill="none">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 16.2v-4.1M12 8.4h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0" fill="none">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.6 9.35c.35-1.35 1.4-2.1 2.5-2.1 1.35 0 2.4.9 2.4 2.15 0 1.15-.7 1.7-1.75 2.3-.9.5-1.15.9-1.15 1.7V14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 17.15h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0" fill="none">
      <path
        d="M6.2 5.5h11.6A1.7 1.7 0 0 1 19.5 7.2v7.4a1.7 1.7 0 0 1-1.7 1.7H9.4L5.5 19.2V7.2A1.7 1.7 0 0 1 6.2 5.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 9.4h7M8.5 12.6h4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0" fill="none">
      <path
        d="M7 4.5h7.2L17.5 8v11.5H7A1.5 1.5 0 0 1 5.5 18V6A1.5 1.5 0 0 1 7 4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14 4.5V8h3.5M8.5 12h7M8.5 15.5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0" fill="none">
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M4.9 6.7l1.6 1.6M17.5 15.7l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.3l1.6-1.6M17.5 8.3l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AtIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0" fill="none">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M15.1 12v1.6a2.1 2.1 0 0 0 3.7 1.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0" fill="none">
      <rect
        x="5.25"
        y="10.25"
        width="13.5"
        height="9.5"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.25 10.25V7.8a3.75 3.75 0 0 1 7.5 0v2.45"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0" fill="none">
      <path
        d="M10 20H6.2A1.7 1.7 0 0 1 4.5 18.3V5.7A1.7 1.7 0 0 1 6.2 4H10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m14.5 16.5 5.5-4.5-5.5-4.5M20 12H10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
