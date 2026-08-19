"use client";

import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";

// Windows Chromium has no flag glyphs, so this loads Twemoji flags only when needed.
// Runs at module eval (not useEffect) to inject @font-face before paint.
polyfillCountryFlagEmojis(
  "Twemoji Country Flags",
  "/fonts/TwemojiCountryFlags.woff2",
);

export function CountryFlagsPolyfill() {
  return null;
}
