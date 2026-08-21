/** Public support inbox — used by Help & feedback and the legal pages. */
export const SUPPORT_EMAIL = "chalkpassport@outlook.com";

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

export const FEEDBACK_TOPICS = [
  "Help",
  "Feedback",
  "Something's wrong",
  "Privacy or account",
] as const;

export type FeedbackTopic = (typeof FEEDBACK_TOPICS)[number];

export function buildFeedbackMailto(input: {
  topic: string;
  message: string;
  username?: string | null;
  email?: string | null;
}): string {
  const subject = `[Chalk Passport] ${input.topic.trim() || "Feedback"}`;
  const lines = [
    input.message.trim(),
    "",
    "—",
    input.username ? `Username: @${input.username}` : null,
    input.email ? `Account email: ${input.email}` : null,
  ].filter((line): line is string => Boolean(line));

  return `${SUPPORT_MAILTO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
