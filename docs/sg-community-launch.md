# Singapore community launch

Plan and checklist for opening Chalk Passport to climbers in Singapore.

The scene is thousands of people, not millions. You do not need a bigger stack. You need a **prod project you will not wipe**, a **trusted gym list**, and a **support / PDPA process** before you drop the link in a gym chat.

**How to use this**

- `[ ]` items are the work. Tick them as you go.
- **Code** = a change in this repo (TypeScript, SQL, or copy in pages).
- **Ops** = Supabase / Vercel / domain / email dashboard work. No app source change.
- **Process** = something you do by hand (legal, support, launch post). No app source change unless noted.

Source-code work is grouped first so you can see it in one place.

---

## What needs source-code updates

These are the only items that change the Git repo. Everything else is dashboards, inboxes, or people.

| Do this | Why | Likely files | When |
|---|---|---|---|
| **1. Stop using destructive schema as the prod path** | `supabase/schema.sql` **drops** `visits` / gym tables. Re-running it on real users wipes stamps. Need additive SQL (migrations or `IF NOT EXISTS` / `ALTER`) and error text that no longer says “paste the whole schema.sql”. | `supabase/schema.sql`, new `supabase/*.sql` (or `supabase/migrations/`), `README.md`, `src/lib/visits.ts`, `src/app/actions.ts` | Before any real account |
| **2. Lock the official SG catalog** | Any signed-in user can insert gyms; the first writer owns the grade scale. Seeded gyms will get duplicates (“boulder planet sembawang”) and wrong house grades. | `supabase/*.sql` (flag + RLS), `src/lib/visits.ts` (`loadPassportCatalog`, `ensureGymCatalog`), `src/lib/gymCatalog.ts`, `src/components/passport/LogGymSheet.tsx` | Before a public invite |
| **3. Review / finish the SG seed** | Trust is “is my gym here, with the right outlets and colours?” | `src/lib/gymCatalog.ts`, seed block in `supabase/schema.sql` (and a non-destructive seed file) | Same as 2 |
| **4. PDPA + operator copy** | Privacy currently talks about UK/EEA GDPR and “the people behind this site”. Singapore users need PDPA language, a named contact, and an overseas-processor note (Vercel + Supabase). | `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/lib/legal.ts`, maybe `src/lib/contact.ts` | Before a public invite |
| **5. In-app account deletion** | Terms/privacy promise deletion by email. For a live community you want a button (Auth user + profile + stamps + grade-chart files). Email-only is a process fallback, not a product. | `src/app/actions.ts`, `src/lib/visits.ts` or a new `src/lib/account.ts`, `src/components/passport/ProfileView.tsx`, `src/lib/supabase/admin.ts` | Strongly before invite; can ship process-only for a tiny private beta |
| **6. Signup abuse protection** | Public email+password signup, no CAPTCHA. One viral story or a scraper will spam Auth. | `src/app/actions.ts`, `src/components/LoginForm.tsx` / `WelcomeForm.tsx`, env for Turnstile (or similar) | Once the URL is public |
| **7. Two-environment docs in the repo** | App already uses one `NEXT_PUBLIC_SUPABASE_URL`. Document that `.env.local` is **dev** and Vercel production is **prod**. | `.env.example`, `README.md` | With item 1 |
| **8. Add-to-Home-Screen (optional)** | Phone-first already; a web app manifest makes gym-night use nicer. Not a blocker. | `src/app/layout.tsx`, new `src/app/manifest.ts` (or `manifest.webmanifest`), icons | After invite, if people ask |

**Not source code** (do not wait on a PR for these): create the Singapore-region prod project, custom domain, SMTP, Auth redirect URLs, backups, Vercel env vars, support inbox workflow, launch post.

**Do not build for v1** (also source code — skip on purpose): public passports, gym leaderboards, follows, visit pagination, Redis, extra regions.

Suggested **code PRs** (separate from this plan doc):

1. Additive schema + README / error-string cleanup + env-example  
2. Canonical gym flag + RLS + seed review  
3. Legal copy + in-app delete account  
4. Later: Turnstile, PWA, outdoor crags

---

## Goal and non-goals

**Goal.** A Singapore climber can sign up on their phone at the wall, stamp a real gym (right outlet, right house grade), keep that history, and get the account deleted if they ask.

**Non-goals for this launch**

- Social feed, public profiles, or “who climbed the hardest at BM Bugis”
- Official partnership with any gym
- Multi-country growth (the catalog already sorts SG first; leave it)
- Infra scale-out (DB size and Auth MAU on Free/Pro are enough)

The product stays a **private log + shared catalog**. That matches today’s RLS (`visits` are own-row only; `gyms` are readable by any signed-in user).

---

## Phase A — Two environments

Mostly **Ops**. Ties to the earlier “do I need two Auth tables?” answer: you need **two Supabase projects**, not two `auth` schemas.

| | Item | Kind |
|---|---|---|
| [ ] | Create **prod** project, region **Southeast Asia (Singapore)** | Ops |
| [ ] | Create **dev** project (any region is fine) | Ops |
| [ ] | Rename clearly: `chalk-passport-prod` / `chalk-passport-dev` | Ops |
| [ ] | `.env.local` → **dev** URL + anon key only | Ops |
| [ ] | Vercel **Production** env → **prod** URL + anon key | Ops |
| [ ] | Do **not** put `SUPABASE_SERVICE_ROLE_KEY` in client-exposed env. Keep it server-only if you use in-app deletion (item 5). | Ops + later Code |
| [ ] | Document the split in `.env.example` and README | **Code** (item 7) |

Prod Auth (`auth.users`) and prod `visits` stay off your laptop. Confirm-email links for real users must use the prod Site URL.

---

## Phase B — A database you cannot accidentally wipe

**Code** is the blocker. Do this before the first real climber.

| | Item | Kind |
|---|---|---|
| [ ] | Additive SQL path: migrations (or a `schema-upgrade.sql` that never `DROP TABLE`) | **Code** (item 1) |
| [ ] | Keep `schema.sql` only for **empty** projects; README must say never run it on prod with data | **Code** |
| [ ] | Stop user-facing errors that tell people to paste the whole `schema.sql` (`mapDbError` in `src/lib/visits.ts`, similar strings in `src/app/actions.ts`) | **Code** |
| [ ] | Enable automated backups on prod (daily is enough; Pro PITR once stamps matter) | Ops |
| [ ] | Run the current schema **once** on the empty prod project, then only additive files | Ops |

`loadPassportCatalog` already inserts missing seed gyms at runtime. That is handy for you and dangerous once random accounts can create gyms (Phase C).

---

## Phase C — Catalog the community will trust

**Code** + a one-time seed pass. This is the product.

Today:

- Seed is already SG-heavy (Boulder Planet, Boulder Movement, BFF, Climb Central, Fit Bloc, …).
- Closed gyms (`Boruda`, `The Cliff`) are omitted.
- Any `authenticated` user can `INSERT` gyms/outlets/scales; creators can `UPDATE` their own rows.
- `created_by` on seed inserts from the app is the **first user who loaded the passport**, not “official”.

| | Item | Kind |
|---|---|---|
| [ ] | Walk the SG list: missing outlets, wrong neighbourhoods, missing house-grade colours/numbers | **Code** (item 3) — `KNOWN_GYMS` + SQL seed |
| [ ] | Add a `verified` (or `seeded`) flag on `gyms`; RLS: anyone can read; only service role / you can update verified rows | **Code** (item 2) |
| [ ] | Duplicate handling in the stamp flow (do not create “BFF tampines” next to “BFF Climbing”) | **Code** |
| [ ] | Decide: can users still add a *new* gym, or only request it? Open insert is a prototype default; lock it or gate it before a group invite | **Code** |
| [ ] | Grade-chart photos: public bucket `gym-grade-charts`. Prefer typed bands over wall photos unless you are OK republishing gym charts | Process + maybe **Code** (copy on ScaleSetup) |
| [ ] | Outdoor rock (Dairy Farm, Bukit Timah, …): **skip for v1** unless you want it in the first post | Optional **Code** |

Do not claim gym affiliation in the UI or the launch post. House V-maps stay “community approximations” (already in Terms).

---

## Phase D — Signup that survives a gym night

| | Item | Kind |
|---|---|---|
| [ ] | Custom domain on Vercel (and optional `app.` / apex) | Ops |
| [ ] | `NEXT_PUBLIC_SITE_URL=https://your-domain` on Vercel production | Ops (app already reads this in `src/lib/site-url.ts`) |
| [ ] | Supabase Auth: Site URL + redirect URLs `{SITE_URL}/auth/confirm` and `{SITE_URL}/auth/callback` | Ops |
| [ ] | Confirm-email template still points at `/auth/confirm?token_hash=…` | Ops |
| [ ] | **Custom SMTP** on the prod project (Resend or similar). Built-in mail is rate-limited and will fail a group signup | Ops |
| [ ] | Turnstile (or similar) on signup once the link is public | **Code** (item 6) |
| [ ] | Optional: web app manifest / apple touch icon | **Code** (item 8) |

Phone-first layout is already there. No rewrite needed for “works at the wall.”

---

## Phase E — PDPA, support, deletion

Singapore’s PDPA applies to user accounts (username, email, stamps). Hosting is overseas (Vercel + Supabase). Privacy copy should say that.

| | Item | Kind |
|---|---|---|
| [ ] | Named operator + contact on Privacy/Terms (not only “the people behind this site”) | **Code** (item 4) |
| [ ] | PDPA section: what you collect, purpose, consent, overseas processors, retention | **Code** (item 4) |
| [ ] | Keep stamps **private**. Do not add public profiles in this launch | Product rule (no code) |
| [ ] | Age rule: Terms say 13. Youth climbing is common — keep 13 or raise it; do not leave it ambiguous | Process + **Code** if you change the number |
| [ ] | Support: `chalkpassport@outlook.com` is fine if you actually read it. Add a “Privacy or account” path you can run in 24h | Process |
| [ ] | Deletion checklist you can run even before the in-app button: Auth user, `profiles` (cascade `visits`), storage `{user id}/*` in `gym-grade-charts`, catalog `created_by` already `ON DELETE SET NULL` | Process, then **Code** (item 5) |
| [ ] | Access / correction: email is enough at this size if you reply | Process |

In-app delete needs the **service role** on the server (`createAdminClient` already exists) to call `auth.admin.deleteUser`. Do not expose that key to the browser.

---

## Phase F — Invite people

No source-code work.

| | Item | Kind |
|---|---|---|
| [ ] | Private beta: 5–10 climbers you can message if email confirm fails | Process |
| [ ] | Confirm: signup mail arrives, stamp at 2 multi-outlet gyms (e.g. Boulder Movement + BFF), logout/login, delete request | Process |
| [ ] | Launch copy: personal climbing log, not a gym ranking, not official | Process |
| [ ] | Share in one or two places (friends, one group chat). Do not spray every gym IG on day one | Process |
| [ ] | Watch Auth signups and `gyms` inserts for duplicates/spam for the first week | Ops |

---

## Master checklist (tick in order)

**Ops / process (no repo change)**

- [ ] Prod + dev Supabase projects; prod in Singapore
- [ ] Vercel production env = prod keys; laptop = dev keys
- [ ] Custom domain + Auth Site URL / redirects
- [ ] Custom SMTP on prod
- [ ] Backups on prod
- [ ] Support inbox checked daily during launch week
- [ ] Written deletion steps (until the in-app button ships)
- [ ] Private beta, then one public post

**Source code (this repo)**

- [ ] Additive schema / never DROP prod tables; fix README + error strings
- [ ] `.env.example` + README: two projects
- [ ] Verified catalog + stricter RLS / duplicate UX
- [ ] Finish SG seed (outlets + house grades)
- [ ] PDPA + named operator on Privacy/Terms
- [ ] In-app delete account
- [ ] Signup CAPTCHA (when public)
- [ ] Optional: PWA manifest; optional: outdoor crags

---

## What “done enough to share” means

You can post the link when all of these are true:

1. Real users hit **prod**, not your laptop project.  
2. Nobody can reset prod by pasting `schema.sql`.  
3. The SG gym list is accurate enough that a BM Bugis regular does not have to “add a new place”.  
4. Confirm email works on iPhone (SMTP + domain).  
5. You can delete an account within a day.  
6. Privacy/Terms mention PDPA and who runs the app.

Items 1, 4, 5 in the code table are the ones that usually slip. Do those PRs first.
