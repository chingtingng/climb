import { createHash } from "node:crypto";
import { MIN_PASSWORD_LENGTH, PASSWORD_LEAKED, PASSWORD_TOO_SHORT } from "@/lib/password";

/**
 * Have I Been Pwned k-anonymity check: only the first 5 chars of the SHA-1
 * hash leave this server. Dummy padded rows (count 0) are ignored.
 * Fail open if the range API is unreachable so signup is not blocked by HIBP.
 */
export async function isPwnedPassword(password: string): Promise<boolean> {
  const sha1 = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        "Add-Padding": "true",
        "User-Agent": "ChalkPassport (https://chalkpassport.com)",
      },
      cache: "no-store",
    });
    if (!response.ok) return false;

    const body = await response.text();
    return body.split(/\r?\n/).some((line) => {
      const [hash, count] = line.trim().split(":");
      return hash === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}

/** Length + leaked-password check for signup and password change. */
export async function validateNewPassword(password: string): Promise<string | null> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return PASSWORD_TOO_SHORT;
  }
  if (await isPwnedPassword(password)) {
    return PASSWORD_LEAKED;
  }
  return null;
}
