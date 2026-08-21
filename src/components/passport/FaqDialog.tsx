"use client";

import { useEffect, useId, useState } from "react";
import { FAQ_ITEMS } from "@/lib/faq";
import { Button } from "@/components/ui/Button";
import { AccountDialog } from "./AccountDialog";
import { ChevronIcon } from "./icons";

export function FaqDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  useEffect(() => {
    if (open) setOpenId(FAQ_ITEMS[0]?.id ?? null);
  }, [open]);

  return (
    <AccountDialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title="FAQ"
      wide
    >
      <div className="mt-3 text-left">
        {FAQ_ITEMS.map((item, index) => {
          const expanded = openId === item.id;
          const panelId = `${titleId}-${item.id}`;
          return (
            <div
              key={item.id}
              className={index === 0 ? undefined : "border-t border-sky-200"}
            >
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() =>
                  setOpenId((current) => (current === item.id ? null : item.id))
                }
                className="flex min-h-12 w-full cursor-pointer items-center gap-3 bg-transparent py-2.5 text-left text-ink"
              >
                <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">
                  {item.question}
                </span>
                <ChevronIcon
                  className={`size-4 shrink-0 text-ink-soft transition-transform ${
                    expanded ? "" : "-rotate-90"
                  }`}
                />
              </button>
              {expanded ? (
                <div id={panelId} className="space-y-2.5 pb-3">
                  {item.answer.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-sm leading-relaxed text-ink-soft"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            variant="tertiary"
            className="min-h-9 px-3 text-[length:var(--fs-sm)]"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </AccountDialog>
  );
}
