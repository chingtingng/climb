/** Minimum length for a new password. Sign-in still accepts older shorter ones. */
export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_TOO_SHORT = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

export const PASSWORD_LEAKED =
  "That password has appeared in a public data leak. Choose a different one — a password manager can make a unique one.";
