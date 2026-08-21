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
import { SelectField, TextArea } from "@/components/ui/Field";

export function HelpForm({
  username,
  email,
}: {
  username?: string | null;
  email?: string | null;
}) {
  const [topic, setTopic] = useState<FeedbackTopic>("Feedback");
  const [message, setMessage] = useState("");
  const [opened, setOpened] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = buildFeedbackMailto({ topic, message, username, email });
    window.location.href = href;
    setOpened(true);
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <label>
        Topic
        <SelectField
          name="topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value as FeedbackTopic)}
        >
          {FEEDBACK_TOPICS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </SelectField>
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

      {username || email ? (
        <p className="text-xs leading-relaxed text-ink-soft">
          We’ll include {[username ? `@${username}` : null, email].filter(Boolean).join(" · ")} so
          we know who to reply to.
        </p>
      ) : null}

      {opened ? (
        <Banner tone="success">
          If your mail app didn’t open, send this to{" "}
          <a href={SUPPORT_MAILTO} className="font-semibold underline underline-offset-2">
            {SUPPORT_EMAIL}
          </a>
          .
        </Banner>
      ) : (
        <p className="text-xs leading-relaxed text-ink-soft">
          Send opens your email app, addressed to {SUPPORT_EMAIL}. Nothing is stored in
          the app.
        </p>
      )}

      <Button type="submit" disabled={message.trim().length < 8}>
        <ActionButtonLabel pending={false} idle="Send email" busy="Send email" />
      </Button>
    </form>
  );
}
