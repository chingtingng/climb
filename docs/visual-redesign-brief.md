# Chalk Passport — Visual Redesign Brief (Cursor prompt)

Paste everything below the line into Cursor. It is written to be executed by an agent with
repo access. It has been checked against the actual codebase at `chingtingng/climb`
(Next.js 16.3.1, React 19, Tailwind CSS v4.3.3, Supabase), not against assumptions.

---

## Role and goal

You are the design engineer for **Chalk Passport**, a mobile-first Next.js + Supabase app
where climbers collect "stamps" for the gyms and crags they visit — by country and city,
with their highest grade at each. Live: `chalk-passport.vercel.app`. Designed around
iPhone 15 width (~390px).

Your job is a **visual/styling pass that makes the app feel like one product**. The owner's
brief: *cooler and cuter, white and baby blue (any blue variant), still professional,
Poppins or similar, and it must stop feeling stitched together.*

This is styling only. Do **not** change data logic, Supabase queries, auth, routing, or the
step logic of the log flow. You may change markup structure where a new shared component
requires it.

---

## 0. Read these before writing any code

1. `AGENTS.md` at the repo root. This Next.js version has breaking changes from what you
   may remember. Then read:
   - `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`
   - `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`
   Do not remove or "clean up" the `nextjs-agent-rules` block in `AGENTS.md`; `next dev`
   rewrites it, and committing it alongside your work is the correct behaviour.
2. Run `npm install` if `node_modules` is absent.

### Facts about this repo that will trip you up

- **There is no `tailwind.config.js` / `tailwind.config.ts`, and you must not create one.**
  This is Tailwind v4. The theme lives in `@theme` inside `src/app/globals.css`, and
  `postcss.config.mjs` loads `@tailwindcss/postcss`. A v3-style config file would be
  silently ignored.
- The existing `@theme inline { ... }` block matters. With `inline`, Tailwind emits the
  *resolved* value into utilities: `@theme inline { --color-sky: var(--sky) }` makes
  `bg-sky` compile to `background-color: var(--sky)`, skipping `--color-sky` entirely. That
  means **you cannot re-theme by overriding `--color-*` at runtime** (media query,
  `[data-theme]`) while `inline` is in effect — you have to override the upstream variable.
  Keep the current pattern (real values in `:root`, `@theme inline` mapping them into
  Tailwind's namespace), and when hand-written CSS needs a custom property, reference the
  `:root` variable you defined rather than assuming a `--color-*` variable was emitted.
- **Baseline build is green; baseline lint is not.** `npm run build` passes.
  `npm run lint` reports 6 errors and 2 warnings that already exist on `main`:
  `prefer-const` in `src/app/actions.ts:402`, and `react-hooks/set-state-in-effect` /
  `exhaustive-deps` in `LoginForm.tsx:43`, `FlashToast.tsx:21`, and `LogGymSheet.tsx:294`,
  `:298`, `:1226`, `:1253`. **Do not fix these** — they are behavioural, out of scope, and
  touching them risks the log flow. Your bar is: *no new lint problems, build still passes.*
- Manual verification account: username `testaccount`, password `tJ3u9FFtrTwqFkF`.

### Files you may edit

`src/app/globals.css`, `src/app/layout.tsx` (fonts, viewport, metadata), `src/app/page.tsx`,
everything under `src/components/`, and the presentational markup in
`src/app/passport/**/page.tsx`, `loading.tsx`, `error.tsx`. You may delete the now-unused
local font files in `src/app/fonts/` if you retire that typeface.

### Files you must not edit

`src/lib/**` (including `grades.ts`, `countries.ts`, `gymCatalog.ts`, `visits.ts`),
`src/app/actions.ts`, `src/app/auth/**`, `src/proxy.ts`, `supabase/**`, and the data-loading
half of `src/app/passport/layout.tsx`.

---

## 1. The actual reason it doesn't feel seamless

Don't guess at this — it is structural, and it is the whole job. `src/app/globals.css`
contains **two complete, disconnected design systems**, separated by a comment that
explicitly freezes them apart:

```css
/* Authenticated passport shell — login/auth styles above stay untouched */
```

| | Signed out (`/`) | Signed in (`/passport/*`) |
|---|---|---|
| Colour vars | `--sky`, `--baby`, `--baby-deep`, `--ink`, `--mist`, `--blush` | `--color-pass-bg`, `--color-pass-navy`, `--color-pass-primary`, `--color-pass-line`, `--color-pass-soft` |
| Ink | `#1f3a4d` | `#1b3a52` |
| Body font | Poppins (`--font-sans`) | **Montserrat** (`--font-pass`) |
| Display font | Glacial Indifference (`.brand-mark`) | Glacial Indifference (`.passport-mark`) |
| Background | three stacked gradients on `body` | flat `#dceef8` on `.passport-root` |
| Container width | `.app-shell` = 430px | `.passport-frame` = 480px |
| Buttons | `.auth-submit` (navy fill) | `.passport-btn` (blue fill) |
| Inputs | `.auth-form input` + `.field-input` | `.passport-field` |

So the user signs in and lands in a different app: different blue, different ink, different
typeface, different container width, different button colour. **Unifying these two systems
into one is task number one.** Everything else in this brief is downstream of it.

Three secondary sources of drift, all verifiable:

1. **The stamp motif is implemented three separate times** and shares no code:
   `CountryStamp.tsx` (dashed ring + flag emoji + ISO code), the big dashed double-ring in
   `SuccessState` at the end of `LogGymSheet.tsx`, and a hand-drawn SVG stamp in
   `EmptyPassport.tsx`. Plus `AddStampButton` as a fourth near-miss.
2. **Ad-hoc values everywhere.** Radii in use: `1.15rem`, `1.2rem`, `1.25rem`, `1.35rem`,
   `1.4rem`, `1.6rem`, `rounded-xl`, `rounded-2xl`, `999px`. Font sizes in use: `0.62rem`,
   `0.65rem`, `0.68rem`, `0.7rem`, `0.72rem`, `0.82rem`, `0.95rem`, `1.55rem`, `1.65rem`,
   `1.7rem`, `1.85rem`, `2rem`, `2.6rem`, and more — roughly fifteen distinct sizes with no
   scale. Hardcoded hexes sit inline in `FlashToast`, `DeleteStampDialog`, `GradePicker`,
   `ScaleSetup`, `ProfileView`, `HomeView`, `LogGymSheet`.
3. **Five different "log a visit" affordances**, each styled differently: a floating
   `passport-btn` on Home, a 44px circular `+` in the `GymsView` header, `AddStampButton`
   inside the stamp row, a soft pill in `ProfileView`, and an inline `passport-btn` on the
   place detail page. Users read that as five different features.

---

## 2. Direction

**Vibe:** soft, rounded, a little bubbly — a well-made travel journal, not a SaaS dashboard.
Cute comes from generous radii, warm micro-copy, and one delightful animation; *not* from
piling on pastels.

**Colour:** cool white paper, a baby-blue family as the primary, and **one** warm accent.
Professional means restraint: whitespace, a single accent doing the talking per screen, and
saturated colour reserved for meaning rather than decoration.

**Give the warm accent a job instead of a vibe.** The data model already has the app's best
idea sitting unused visually: `gyms.place_kind` is `gym` (artificial walls and holds) or
`rock` (natural stone). Map it to ink colour — **blue ink = plastic, clay ink = stone**.
Now the second colour is information, the palette reads as intentional, and a climber can
scan their passport and instantly see how much of it is real rock. This is the single
highest-leverage design decision in the brief.

**Signature element:** the **Stamp** — a circular postmark with a dashed outer ring, an inner
hairline ring, and a small typographic core, set at a slight rotation. It already exists in
three forms; your job is to make it one component and then use it deliberately (country
stamps, the save confirmation, empty states) rather than everywhere.

**Texture, if you use it:** the brand is *Chalk* Passport. Chalk grain and route-setting
tape are climbing-native motifs and beat a generic dotted grid. Two constraints: keep any
overlay at or below ~4% opacity and never directly behind body text, and do **not** add
`background-attachment: fixed` (the current `body` rule uses it — remove it; it causes
repaint jank while scrolling in iOS Safari).

---

## 3. Design tokens

Replace the two palettes in `src/app/globals.css` with one. Keep the hues in the same family
as today's `pass-*` set so the signed-in app still feels like itself — this is a refinement
plus a sane scale, not a third competing system.

Every contrast ratio below is computed against `#FFFFFF` unless stated. **Respect the
fill-only markers; several of these values fail WCAG AA as text and are labelled.**

```css
:root {
  color-scheme: light;            /* see §9 — native date input depends on this */

  /* Paper & surface */
  --paper: #F7FBFE;               /* app background, cool white */
  --surface: #FFFFFF;             /* cards, sheets */

  /* Ink */
  --ink: #163043;                 /* headings, primary text — 13.7:1 */
  --ink-soft: #55707F;            /* secondary text, placeholders — 5.3:1 */
  --ink-faint: #8CA3B0;           /* 2.6:1 — dividers, decorative icons, DISABLED ONLY.
                                     Never body text, never placeholders. */

  /* Baby blue — primary family */
  --sky-50:  #F2F9FD;             /* tinted section backgrounds */
  --sky-100: #E3F1FA;             /* chips, soft fills, pressed tint */
  --sky-200: #CFE8F6;             /* brand hue — keep; this is today's theme-color */
  --sky-300: #A9D4EA;             /* borders, dividers, secondary icons */
  --sky-500: #5FA8D3;             /* 2.6:1 — ILLUSTRATION AND FILLS ONLY.
                                     Never a background for white text. */
  --sky-600: #2C7099;             /* primary actions, links — 5.4:1 with white text */
  --sky-700: #1F5476;             /* pressed state, stamp ink, headings on sky tints —
                                     8.1:1 on white, 7.1:1 on --sky-100 */

  /* Clay — the warm accent. Means "natural rock" (place_kind = rock). */
  --clay-50:  #FEF7F1;
  --clay-100: #FBEBDF;
  --clay-300: #F3C7A3;            /* fills only */
  --clay-600: #A95A2A;            /* clay ink, warm emphasis — 5.0:1 either direction */

  /* Feedback — these exact values are already used in the codebase and already pass */
  --success-fill: #E8F6EE;
  --success-ink:  #1F5C3A;
  --danger-fill:  #FDECEC;
  --danger-ink:   #8A2F2F;
  --danger-solid: #B42318;        /* destructive buttons, white text — passes */

  /* Radii */
  --radius-xs: 10px;   /* tags */
  --radius-sm: 14px;   /* chips, small controls */
  --radius-md: 18px;   /* inputs, tiles */
  --radius-lg: 24px;   /* cards, list rows */
  --radius-xl: 28px;   /* sheets, modals */
  --radius-full: 999px;

  /* Shadows — tinted blue, never neutral black */
  --shadow-soft:   0 4px 16px rgba(44, 112, 153, 0.10);
  --shadow-lifted: 0 10px 28px rgba(44, 112, 153, 0.16);
  --shadow-sheet:  0 18px 50px rgba(22, 48, 67, 0.18);

  /* Type scale — px so the audit is unambiguous */
  --text-micro: 11px;  /* uppercase tracked labels — hard floor, see §4 */
  --text-xs:    12px;
  --text-sm:    13px;
  --text-base:  14px;
  --text-md:    16px;  /* all form inputs — do not go below, see §9 */
  --text-lg:    18px;
  --text-xl:    22px;
  --text-2xl:   26px;
  --text-3xl:   32px;
  --text-mark:  38px;  /* wordmark only */
}
```

Expose these through `@theme inline` the way the file already does, so components write
`bg-sky-600`, `text-ink-soft`, `rounded-lg`, `shadow-soft` — never raw hex, never arbitrary
`rounded-[1.35rem]`.

### Three corrections to earlier drafts of this palette

1. **`sky-500` with white text fails badly.** `#5FA8D3` against white is **2.6:1**; AA needs
   4.5:1. The primary button is on every screen, so this would have been the most widespread
   accessibility defect in the app. Solid blue buttons use `--sky-600` (5.4:1). For the
   record, today's `--color-pass-primary: #347ea8` is **4.48:1** — a marginal fail — so this
   is a real fix, not a hypothetical one.
2. **Pastel feedback colours can't be text.** A muted `#7FB88F` success (2.3:1) or `#E08585`
   error (2.7:1) would have regressed what the code already gets right. Hence paired
   `-fill` / `-ink` tokens: soft tint behind, dark ink on top.
3. **Never white-on-clay at `--clay-300`,** and never a full-width clay button. Clay lives at
   small sizes — stamp ink, chips, icon tiles — partly for restraint and partly so it can't
   be confused with the warm `--danger-*` family. Destructive actions must always carry both
   an icon and an explicit verb ("Remove stamp"), never colour alone.

### Leave these hexes alone

`COLOR_GRADES` in `src/lib/grades.ts` holds eleven hex values (White `#f4f1ea`, Yellow, Red,
Purple…). Those are **data**, not theme — they represent the actual colours of holds and
tape on a wall. Do not tokenise, restyle, or "harmonise" them. See §6.

---

## 4. Typography

Load via `next/font/google` in `src/app/layout.tsx`. No `<link>` tags.

Today three families are loaded — Poppins, Montserrat, and a local Glacial Indifference —
and **Poppins is only applied on the signed-out page**, while the entire signed-in app
renders in Montserrat. The owner asked for Poppins, so part of the ask is simply *use it*.

- **Display / wordmark:** **Poppins**, 600 and 700. Page titles, place names, grade numerals,
  stat figures, "Chalk Passport". This replaces both `.brand-mark` and `.passport-mark`,
  which should collapse into one class.
- **Body / UI:** **Plus Jakarta Sans**, 400/500/600.

  Why not Poppins throughout: this UI is unusually dense in small text — 10–12px uppercase
  letterspaced micro-labels (`ProfileView`, `HomeView` stats, `ChoiceList` headers) and long
  place names inside narrow 390px rows that already rely on `truncate`. Poppins is a wide
  geometric face with a short x-height relative to its cap height; at those sizes it loses
  legibility and it fits fewer characters per row, so names truncate sooner. Plus Jakarta
  Sans is a rounded geometric sans from the same stylistic family — so the pairing reads as
  one voice — with a narrower advance width and taller x-height. You get the Poppins
  personality in every heading and better small-text performance in the plumbing.

  If the owner later wants one typeface only, Poppins alone is acceptable: restrict body copy
  to 400/500 and never go below 14px, which means redesigning the micro-label pattern.

Two mechanical notes:

- **Poppins is not a variable font on Google Fonts**, so the explicit `weight` array in
  `layout.tsx` is required and correct — keep that shape. Plus Jakarta Sans *is* variable, so
  it needs no weight array.
- **Retire Montserrat and Glacial Indifference.** Glacial is three `.otf` files loaded through
  `next/font/local`; deleting them removes render-blocking weight from the first paint of the
  sign-in screen. If you keep a local face for any reason, convert to `.woff2` first.

**Type scale discipline.** Use the `--text-*` steps and nothing else. Two specific fixes:
the `text-[0.62rem]` stat labels in `HomeView` and `ProfileView` are ~9.9px, which is too
small for tracked uppercase text — raise them to `--text-micro` (11px) minimum, 12px
preferred. All form inputs stay at 16px (§9 explains why this is load-bearing).

---

## 5. Shared primitives

Build these once and use them everywhere. This consistency *is* the seamlessness the owner
is asking for.

### `Stamp`

One component replacing `CountryStamp`, the `SuccessState` ring, the `EmptyPassport` SVG, and
`AddStampButton`.

- Variants: `country` (ISO code + flag), `grade`, `add` (the `+` affordance), `hero` (the
  large confirmation stamp).
- Sizes: `sm` 44px, `md` 68px, `lg` 88px, `hero` 144px.
- Ink: `sky` | `clay`, driven by `place_kind` (§2).
- Structure: dashed outer ring, hairline inner ring, typographic core.

Four implementation requirements, each of which is a real bug if you skip it:

1. **Rotation must be deterministic.** `Math.random()` during render causes a hydration
   mismatch — these components render on the server. Hash a stable seed (ISO country code,
   `visit.id`, gym slug) into a small integer and map it to −6°…+6°.
2. **Rotate an inner element, not the outer box.** The outer box stays axis-aligned so hit
   targets and the 44px minimum survive.
3. **The ISO code is the typographic anchor; the flag emoji is secondary decoration.** Flag
   emoji do not render as flags on Windows Chrome (they fall back to two letters), and
   `countryMeta()` already returns `code`, `iso2`, `iso3`. This is also more
   passport-authentic — a real entry stamp is type and a date, not a flag.
4. **Rotated stamps clip in the scroller.** `.stamp-row` currently pads only `0.15rem`.
   Rotating an 68px circle inside it will clip the ring and collide with neighbours; increase
   the row's block padding and inline gap to fit the rotated bounding box.

Accessibility: `CountryStamp` is currently `aria-hidden` *and* carries a `title` attribute,
which does nothing for anyone. Drop the `title`, keep it decorative, and make sure the
country name appears in the row's real text or as an `sr-only` label.

### `Button`

Pill (`--radius-full`), min-height 48px, `--text-md`.

- **Primary:** `--sky-600` fill, white text, `--shadow-soft`.
- **Secondary:** `--sky-100` fill, `--sky-700` text, no shadow (7.1:1).
- **Tertiary:** text only, `--ink-soft`.
- **Destructive:** `--danger-solid` fill, white text, always with an icon and a verb.
- **Pressed:** `scale(0.97)` plus a deeper shadow, ~120ms — not just a colour swap. Guard it
  behind `prefers-reduced-motion` as the existing CSS already does for `.passport-btn`.
- **Disabled:** `--ink-faint` on `--sky-50`, `cursor: not-allowed`. Never rely on opacity
  alone at these tints.

This replaces `.auth-submit`, `.passport-btn`, `.passport-btn-ghost`, and the several inline
one-off buttons.

### `Input` / `Field`

`--radius-md` (textarea and search keep their current shape), `--sky-300` border at rest,
`--sky-600` border plus a soft `--sky-100` glow on focus, ≥14px vertical padding, and
**`font-size: 16px` — non-negotiable, see §9.** Replaces `.field-input`, `.auth-form input`,
and `.passport-field`. Keep the existing `select` chevron background-image trick and the
`padding-inline` split; both solve real problems.

### `Card`

`--surface`, `--radius-lg`, `--shadow-soft`, no visible border (today's rows use
`border-white` on white, which is invisible and can go). Used for list rows in `HomeView`,
`GymsView`, `GymDetailView`, and stat blocks.

### `BottomNav`

Currently a flat fixed bar with a hard top border. Make it a floating pill inset from the
edges, `--radius-full`, `--surface` at ~94% with the existing backdrop blur,
`--shadow-lifted`. Active tab gets a `--sky-100` pill behind icon + label with
`--sky-700` text.

Two constraints you must not break:

- `.passport-frame` reserves `calc(5.75rem + env(safe-area-inset-bottom))` of bottom padding
  and the nav consumes `env(safe-area-inset-bottom)`. If the bar floats, re-derive both
  numbers together or content will hide behind it on notched devices.
- **`HomeView` already floats a full-width CTA at `bottom-[calc(4.65rem+env(safe-area-inset-bottom))]`,
  directly above the nav.** A floating pill nav plus a floating full-width button is two
  stacked floating slabs on a 390px screen. Resolve it — see the CTA rule below.

### One "log a visit" affordance per screen

Collapse the five variants from §1 into a single rule:

- **Home and Places:** one circular `Stamp`-shaped floating action button, anchored above the
  nav. Remove the 44px `+` from the `GymsView` header.
- **Place detail:** keep the inline contextual button ("Log another visit") — different intent,
  correctly different placement.
- **Profile:** no primary CTA in the populated state; secondary only. Keep a primary button in
  the *empty* state, where it's the only useful action.
- **Empty states:** exactly one primary button.

### `Stepper` — read this before you build a row of dots

An earlier draft asked for stamp-dot step indicators. **Don't, at least not per-step.** Two
things about `LogGymSheet.tsx` make that actively worse than what's there now:

- The flow has **eleven possible steps**, not five: `country`, `city`, `gym`, `outlet`,
  `kind`, `offer`, `climb`, `scale`, `grade`, `date`, `notes`.
- **The step count changes mid-flow.** `steps` is recomputed from `needsCity`, `needsOutlet`,
  `needsKind`, `needsOffer`, `needsClimb`, `needsScale`. Typing an unrecognised place name
  inserts `kind`, `offer`, and `scale`; picking a multi-outlet brand inserts `outlet`. So a
  dot row would show 11 dots ~20px apart on a 390px screen, and the number of dots would
  *change while the user is looking at it*. A progress indicator that grows as you advance is
  a well-known way to make a form feel endless.

Do this instead — **phase-grouped progress**, which is stable regardless of which conditional
steps fire:

| Phase | Steps it covers |
|---|---|
| **Where** | `country`, `city`, `gym`, `outlet` |
| **The place** | `kind`, `offer`, `scale` (skipped entirely for known places) |
| **Your send** | `climb`, `grade`, `date`, `notes` |

Three stamp-dots — completed ones look stamped (filled, slightly rotated), current is
outlined, upcoming is faint — plus a hairline progress line for position within the phase.
Keep the existing `Step N of M` text for precision. The stamp motif gets to be charming
where it can't misinform, and the payoff animation (§8) stays the moment that earns it.

---

## 6. Climbing-domain rules for grade display

Grades are the emotional core of this app and the easiest thing to get wrong. Read
`src/lib/grades.ts` and `GradePicker.tsx` before styling anything grade-related.

The app supports six systems: **V-scale**, **Font**, **French**, **Numbers**, **Colours**, and
**custom** house scales. A grade badge is therefore *not* reliably a short string like "V4".

1. **Never render a bare grade with no system context** unless it is V-scale. `6a+` in French
   is a rope grade; `V6` is a boulder grade; they describe different disciplines and are not
   interchangeable. `displayGrade()` already prefers a mapped V-equivalent when one exists
   (`v_equiv`) and prefixes Font as `Font 7A` — preserve that behaviour exactly, and give
   non-V systems a consistent small system tag rather than a bare numeral.

   There's a typographic trap here. Font and French grades are distinguished **only by letter
   case** — `FONT_GRADES` are `6A`, `7A+`, `8B`; `FRENCH_GRADES` are `6a`, `7a+`, `8b`. That's
   the correct real-world convention, so don't "fix" it, but it means you must never
   `uppercase` or `capitalize` a grade string in CSS, and never set grades in a small-caps or
   all-caps style. Doing either silently converts a rope grade into a boulder grade two
   number-grades harder. Pick a display face where `a` and `A` are unmistakable at 13px, and
   let the system tag carry the real distinction.
2. **The Colours system renders real colour swatches** — eleven of them, including Red, Pink,
   Purple, and Orange. This is why the app's chrome must stay cool and why clay is restricted
   to small marks (§3): a decorative peach badge sitting next to an Orange grade swatch reads
   as data and confuses. Keep the existing hairline border on swatches; without it the White
   grade `#f4f1ea` disappears on a white card.
3. **Grade labels can be long.** House and custom scales allow arbitrary band labels, and
   `GradePicker` already switches to a 2/3-column grid when labels exceed 4 characters. A
   fixed-width circular grade Stamp will break on `Yellow/Orange`. Either cap the Stamp to
   short labels and fall back to a pill for long ones, or size the core to the content.
4. **Show the discipline, and not with colour alone.** `bouldering` / `top_rope` / `lead`
   currently render as plain text. Climbers care about this distinction more than almost
   anything else on the card, so give it a small glyph — and since the palette's colour
   budget is already spent on grade swatches and `place_kind`, do not encode it as a hue.
   Note that a recent change defaults Rock places to French grades, so rope grades on natural
   stone is a common combination.
5. **`gym` vs `rock` is the passport's best story.** Beyond stamp ink colour, `formatPlaceKind`
   already renders the label; make the distinction legible at a glance in list rows and on the
   place detail header.
6. **"Best send" mixes systems** through `gradeSortValue()`, which ranks across scales via
   V-equivalents. Don't present it as a precise number with no context — label it and, where
   space allows, attribute it to a place.

---

## 7. Screen by screen

Every route and state below exists. Earlier drafts of this brief missed the last five, which
is exactly how inconsistency survives a redesign.

### Sign in / Sign up — `src/app/page.tsx`, `src/components/LoginForm.tsx`

First impression, and today it's a glass card that shares nothing with the app behind it.
Keep the frosted card and the two blurred blobs — they're nice — but rebuild them on the new
tokens. Wordmark in Poppins 700, tagline in `--ink-soft`. Place one or two decorative
`Stamp`s near the headline (a sample grade, a city) so the motif is established before login.
Inputs and the primary CTA use the shared primitives, which means the button changes from
navy to `--sky-600` and finally matches the app. Keep the `@chalkchingup` link small and
secondary. Preserve every functional detail: the debounced username availability check,
`aria-invalid`, `aria-describedby`, the verification-email success message, and the
`!configured` Supabase warning — all of these need designed states, not just the happy path.

### Home — `src/components/passport/HomeView.tsx`

Stats row (`Places` / `Cities` / `Countries` / `Best send`) as a single `--sky-50` stat card
rather than four naked columns; raise those 9.9px labels. The country `stamp-row` stays — it's
the best thing on the screen — with the padding fix from §5. Recent stamps become `Card`
rows: place name, `outlet · country · discipline`, grade badge, date. The floating CTA
follows the §5 rule. This screen's empty state (`EmptyPassport`) is already the strongest in
the app — treat it as the reference for the others.

### Places — `src/components/passport/GymsView.tsx`

Search field, country filter chips, result count, and a custom sort menu. Chips move onto
`--sky-100` / `--sky-600` selected. The sort menu is a hand-rolled `role="listbox"` with
flip-up positioning and outside-click handling — restyle it, don't rewrite it, and keep the
`z-index` relationship with the list (`relative z-20` header over `z-0` list) or the menu
will render behind rows. Rows become `Card`s with the `place_kind`-inked `Stamp`. Both empty
states — "no places yet" and "no places match that search" — need the `EmptyPassport`
treatment; today they're bare centred text.

### Place detail — `src/app/passport/gyms/[slug]/page.tsx`, `GymDetailView.tsx`

Missing from earlier drafts entirely. Back button, place name, `place_kind · city · country`,
a country `Stamp`, an outlet chip row, two stat tiles (highest grade, visits), and the visit
history list with per-visit delete and media previews. The history rows currently cram date,
place, discipline, grade, and free-text notes into one `·`-joined paragraph — give notes their
own line so a long note can't destroy the row. Also handle the "stamp isn't in your passport"
state, which is a real branch in this component.

### Log a visit — `src/components/passport/LogGymSheet.tsx` (1,641 lines)

The flagship. Two structural facts to get right:

- **It is a bottom sheet, not a set of routed screens.** One `role="dialog"` overlay with a
  drag handle, a fixed header, an internally scrolling body, and a pinned Back/Next footer.
  Do not convert it to per-step pages — that's a routing change and it's out of scope.
- **Errors deliberately live outside the scroll region**, above the footer, plus a
  viewport-fixed `FlashToast` for when the inline banner scrolls away. Keep both. This is
  intentional mobile design, not redundancy.

Restyle the sheet chrome with `--radius-xl` and `--shadow-sheet`, and use the phase Stepper
from §5. Every step's controls should come from the shared primitives — right now
`ChoiceList`, `SearchSelect`, `OutletStep` chips, `PlaceKindStep`, `ClimbOfferStep`,
`ClimbTypeStep`, and `GradePicker` each invent their own selected state, and the same
hardcoded `bg-[#e7f4fb]` "selected" tint is pasted in six places (`GradePicker` ×2,
`ScaleSetup` ×2, `LogGymSheet` ×2).

Don't miss `ScaleSetup.tsx` (347 lines) — the house-scale builder where the first person to
log a new gym defines its grade bands and uploads a photo of the grade chart. It is the most
complex form in the app and no earlier draft mentioned it. Also `VisitMediaFields.tsx` and
`VisitMediaPreview.tsx` for photo/video upload and playback.

**`SuccessState` is the emotional payoff.** It already animates via `.stamp-press`. Keep the
overshoot, land it on the `Stamp` component's deterministic rotation, and show place,
discipline, grade, and date as a real postmark.

### Profile — `src/components/passport/ProfileView.tsx`

Calm, and mostly right already. Passport card with stats, two highlight cards (most-visited
place, favourite city), a recent list, and an account section with Help and Log out. Move the
`text-[#b42318]` log-out colour onto `--danger-ink`, and keep every one of the per-card empty
messages — they're good, they just need consistent styling.

### The states everyone forgets

- **`src/app/passport/loading.tsx`** — a skeleton whose shapes must match the new Home layout,
  or the redesign flashes wrong on every navigation.
- **`src/app/passport/error.tsx`** — designed error state; give it a `Stamp` illustration.
- **`DeleteStampDialog.tsx`** — confirmation modal with three hardcoded reds.
- **`FlashToast.tsx`** — fixed toast, `bg-[#8a2f2f]`, with its own enter/leave transition.
- **`ActionButtonLabel.tsx`** — shared pending/idle button label with a spinner. Every async
  button routes through it, so its treatment shows up everywhere.
- **The `!configured` banners** on Home and the login form, for when Supabase env vars are
  missing.

---

## 8. Motion

Restraint. One deliberate moment, not animation on every hover.

- **The stamp landing on save** is the moment. `.stamp-press` already does scale 1.28 →
  overshoot → settle with rotation over 0.55s; keep that character.
- Button press: ~120ms scale.
- Step transitions inside the sheet: 180–200ms slide + fade. Animate `transform` and
  `opacity` on the step content only — **never height**, because the sheet is a fixed-height
  internally-scrolling dialog and animating height will fight the scroll container.
- `prefers-reduced-motion` is already honoured in two blocks in `globals.css` for `.fade-up`,
  `.float-soft`, `.sheet-in`, `.passport-sheet-in`, `.stamp-press`, and the button press. Add
  every new animation to it; cross-fade instead of moving.
- Drop `background-attachment: fixed` from `body` (§2).

---

## 9. Accessibility and platform fixes

These are specific, verifiable, and mostly one-line. Do them as part of the pass.

1. **Remove `maximumScale: 1` from the `viewport` export in `src/app/layout.tsx`.** Blocking
   pinch-zoom violates WCAG 1.4.4 (Resize Text). It's safe to remove *because*
   `.passport-field` already sets `font-size: 16px`, which is the thing that actually prevents
   iOS from zooming on input focus — the `maximum-scale` lock was solving an already-solved
   problem while breaking zoom for everyone on Android. This is why 16px inputs are
   non-negotiable in §5.
2. **Add `color-scheme: light` to `:root`.** The `date` step renders a native
   `<input type="date">`; without this declaration its picker and internal chrome render in
   dark mode on dark-mode devices, inside your white sheet.
3. **Make `themeColor` match the colour actually painted at the top of the viewport.** Today
   it's `#cfe8f6`, while `body`'s gradient starts near `#eaf5fc` and `.passport-root` is
   `#dceef8` — three different blues, which shows as a visible seam under the Safari and PWA
   status bar. Drive `themeColor` from the same literal as the new top-of-page token and
   comment the link between them.
4. **Fix the primary button contrast** (§3) — `--sky-600`, not `--sky-500`.
5. **Unify focus states.** `.passport-root :focus-visible` gives a 2px outline, but the
   signed-out page has no `:focus-visible` rule at all. Note the deliberate
   `:is(input,textarea,select):focus { outline: none }` — outer rings get clipped inside the
   sheet's overflow container, so inputs signal focus with a border change instead. That's a
   legitimate workaround; just verify the focus border hits 3:1 against adjacent colours per
   WCAG 1.4.11 (`--sky-600` on white is 5.4:1, so it does).
6. **Touch targets ≥44px.** Mostly satisfied today via `min-h-11` / `min-h-12` / `size-11`.
   Keep it, and re-check after the nav becomes a floating pill.
7. **Don't encode meaning in colour alone** — not for discipline, not for `place_kind`, not for
   destructive actions. Pair every one with a glyph or a word.

---

## 10. Suggested order of work

Sequence matters here; screens restyled before the tokens exist will need doing twice.

1. **Tokens and fonts.** Rewrite `globals.css` as one system; wire fonts and viewport in
   `layout.tsx`; delete the retired font files. Ship this first — the whole app should shift
   in one step.
2. **Primitives.** `Stamp`, `Button`, `Input`, `Card`, `Stepper`.
3. **Shell.** `PassportShell`, `BottomNav`, the floating CTA rule, `loading.tsx`,
   `error.tsx`.
4. **Simple screens.** Login, Profile, Places, place detail.
5. **Home**, including the stamp row and stat card.
6. **The log sheet**, step by step, `ScaleSetup` and the media fields included.
7. **Empty, error, pending, and `!configured` states** across every screen.
8. **Accessibility sweep** (§9) and the audit below.

---

## 11. Definition of done

- [ ] `src/app/globals.css` contains **one** token system. The comment
      `/* Authenticated passport shell — login/auth styles above stay untouched */` and the
      `pass-*` namespace are gone.
- [ ] `rg "#[0-9a-fA-F]{3,6}" src --glob '*.tsx'` returns only SVG illustration internals — no
      UI colours. Baseline to beat: **29 matches across 13 files.**
- [ ] `rg "rounded-\[|text-\[0\.|shadow-\[" src --glob '*.tsx'` returns nothing. Baseline:
      **50 matches across 11 files** (worst offenders `ProfileView` 14, `LogGymSheet` 9).
      Layout arbitrary values that wrap `calc()`, `min()`, or `env()` are fine and are not
      matched by this pattern.
- [ ] Every button, input, card, chip, and badge routes through a shared primitive.
- [ ] Poppins renders on both sides of the login boundary. Montserrat and Glacial Indifference
      are gone from `layout.tsx` and their files are deleted.
- [ ] Sign in with `testaccount` / `tJ3u9FFtrTwqFkF` and walk every screen: Home (empty *and*
      populated), Places (empty, populated, no-search-results), place detail, all eleven log
      steps including a brand-new place — which triggers `kind` → `offer` → `scale` — the
      success stamp, delete confirmation, and Profile.
- [ ] Checked at **360px, 390px, and 430px**. No horizontal scroll; nothing hidden behind the
      floating nav; no target under 44px. (`.passport-frame` caps at 480px, so also glance at
      desktop.)
- [ ] No new lint problems beyond the 6 errors / 2 warnings listed in §0, and the 6
      pre-existing ones are untouched. `npm run build` still passes.
- [ ] `prefers-reduced-motion: reduce` disables or cross-fades every animation, new ones
      included.
- [ ] Every empty state has a `Stamp` illustration and encouraging copy in the app's existing
      voice — "no stamps yet, log your first send", never "No data". `EmptyPassport` already
      sets the tone; match it.
- [ ] No changes to `src/lib/**`, `src/app/actions.ts`, `src/app/auth/**`, `src/proxy.ts`,
      `supabase/**`, or the data-loading half of `src/app/passport/layout.tsx`.
