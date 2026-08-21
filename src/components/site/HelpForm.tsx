"use client";

import { useState, type FormEvent } from "react";
import {
  FEEDBACK_TOPICS,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
  buildFeedbackMailto,
  type FeedbackTopic,
} from "@/lib/contact";
import { ActionButtonLabel } from "@/components/passport/ActionButtonLabel";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/EmptyState";
import { TextArea } from "@/components/ui/Field";
import { SelectMenu } from "@/components/ui/SelectMenu";

export function HelpForm({
  username,
  email,
  className = "auth-form",
  onCancel,
}: {
  username?: string | null;
  email?: string | null;
  className?: string;
  onCancel?: () => void;
}) {
  const [topic, setTopic] = useState<FeedbackTopic>("Feedback");
  const [message, setMessage] = useState("");
  const [opened, setOpened] = useState(false);
  const inDialog = Boolean(onCancel);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = buildFeedbackMailto({ topic, message, username, email });
    window.location.href = href;
    setOpened(true);
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <label>
        Topic
        <SelectMenu
          value={topic}
          options={FEEDBACK_TOPICS}
          onChange={setTopic}
          ariaLabel="Topic"
        />
      </label>

      <label>
        Message
        <TextArea
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          minLength={8}
          maxLength={4000}
          placeholder="What’s going on?"
        />
      </label>

      {inDialog ? (
        <p className="min-h-[4.1em] text-xs leading-relaxed text-ink-soft">
          {opened ? (
            <>
              Didn’t open? Email{" "}
              <a href={SUPPORT_MAILTO} className="font-semibold underline underline-offset-2">
                {SUPPORT_EMAIL}
              </a>
              .
            </>
          ) : username || email ? (
            <>
              We’ll include {[username ? `@${username}` : null, email].filter(Boolean).join(" · ")} so
              we know who to reply to.
            </>
          ) : null}
        </p>
      ) : opened ? (
        <Banner tone="success">
          If your mail app didn’t open, send this to{" "}
          <a href={SUPPORT_MAILTO} className="font-semibold underline underline-offset-2">
            {SUPPORT_EMAIL}
          </a>
          .
        </Banner>
      ) : username || email ? (
        <p className="text-xs leading-relaxed text-ink-soft">
          We’ll include {[username ? `@${username}` : null, email].filter(Boolean).join(" · ")} so
          we know who to reply to.
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-ink-soft">
          Send opens your email app, addressed to {SUPPORT_EMAIL}. Nothing is stored in
          the app.
        </p>
      )}

      <Button type="submit" disabled={message.trim().length < 8} className={inDialog ? "mt-1" : undefined}>
        <ActionButtonLabel pending={false} idle="Send email" busy="Send email" />
      </Button>
      {onCancel ? (
        <Button type="button" variant="tertiary" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
    </form>
  );
}
