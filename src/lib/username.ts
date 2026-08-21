const USERNAME_DOMAIN = "chalk.local";

/** Normalize and validate a username. Throws if invalid. */
export function normalizeUsername(raw: string): string {
  const username = raw.trim().toLowerCase();

  if (!username) {
    throw new Error("Username is required");
  }
  if (username.length < 3) {
    throw new Error("Username must be at least 3 characters");
  }
  if (username.length > 30) {
    throw new Error("Username must be 30 characters or fewer");
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    throw new Error("Username can only contain letters, numbers, and underscores");
  }

  return username;
}

/** True when the string looks like an email address. */
export function looksLikeEmail(raw: string): boolean {
  return raw.trim().includes("@");
}

/**
 * Normalize and validate a real email for signup / recovery.
 * Rejects the legacy synthetic `@chalk.local` domain.
 */
export function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();

  if (!email) {
    throw new Error("Email is required");
  }
  if (email.length > 254) {
    throw new Error("Email is too long");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address");
  }
  if (email.endsWith(`@${USERNAME_DOMAIN}`)) {
    throw new Error("Use a real email address");
  }

  return email;
}

/**
 * Parse a sign-in identifier as either an email or a username.
 * Does not resolve username → auth email; callers do that separately.
 */
export function parseLoginIdentifier(
  raw: string,
): { kind: "email"; email: string } | { kind: "username"; username: string } {
  const value = raw.trim();
  if (!value) {
    throw new Error("Username or email is required");
  }

  if (looksLikeEmail(value)) {
    return { kind: "email", email: normalizeEmail(value) };
  }

  return { kind: "username", username: normalizeUsername(value) };
}

/** Legacy synthetic email used before real-email signup. Prefer real emails. */
export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${USERNAME_DOMAIN}`;
}

/**
 * Map auth email → username only for legacy `@chalk.local` accounts.
 * Real emails are not usernames.
 */
export function emailToUsername(email: string | undefined): string | undefined {
  if (!email) return undefined;
  if (email.endsWith(`@${USERNAME_DOMAIN}`)) {
    return email.slice(0, -(USERNAME_DOMAIN.length + 1));
  }
  return undefined;
}

/**
 * Best-effort handle from a display name or email local-part.
 * Empty when nothing valid can be made (the climber still types their own).
 */
export function suggestUsername(
  ...parts: Array<string | null | undefined>
): string {
  for (const part of parts) {
    if (!part) continue;
    const cleaned = part
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "")
      .slice(0, 30);
    if (cleaned.length >= 3) return cleaned;
  }
  return "";
}
