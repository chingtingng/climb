# Chalk Passport

Mobile-first climbing passport. Log places (gyms and more) by country and city, plus the highest grade you’ve climbed at each.

Support: [chalkpassport@outlook.com](mailto:chalkpassport@outlook.com)

## What’s already in the app

These shipped on `main` (PR #54). You do **not** need more code for them:

- Email + password signup (Gmail, Outlook, iCloud, and any other real inbox)
- Username with a live “already taken?” check
- Sign in with username **or** email
- **Continue with Google** on the login card (the button is live; Google itself still needs turning on — see below)
- After Google, climbers pick a username at `/welcome`
- Public **Privacy** (`/privacy`) and **Terms** (`/terms`) before signup
- **Help & feedback** (`/help`) — form opens mail to `chalkpassport@outlook.com`
- No more hardcoded `@chalkchingup` Instagram links
- Compact iPhone login layout

## Still to do

Operator / dashboard work. Tick these off in order.

### 1. Database (do this first)

On the **existing** Supabase project, SQL Editor → run the whole file:

1. [`supabase/oauth-usernames.sql`](./supabase/oauth-usernames.sql)

That stops Gmail addresses like `jane.doe@gmail.com` from breaking account creation, and lets Google users choose a username after sign-in.

Skip this only if you re-ran the full [`supabase/schema.sql`](./supabase/schema.sql) after this version. (Full schema **drops** stamp tables — don’t use it just to pick up this change.)

If email-on-profiles was never applied, also run [`supabase/email-auth.sql`](./supabase/email-auth.sql).

### 2. Continue with Google (or hide it later)

Until this is done, the Google button shows an error and people should use email.

1. [Google Cloud](https://console.cloud.google.com/) → create (or pick) a project → **Google Auth Platform** → create an OAuth client, type **Web application**
2. **Authorized JavaScript origins:** your live origin(s), e.g. `https://YOUR-APP.vercel.app` and later `https://chalkpassport.com`
3. **Authorized redirect URI:** copy the callback from Supabase **Authentication → Providers → Google** (ends with `/auth/v1/callback`)
4. Paste **Client ID** and **Client Secret** into that Google provider page and **enable** it
5. **Authentication → URL Configuration** still includes `{SITE_URL}/auth/callback` and `{SITE_URL}/auth/confirm`

Google users skip email confirmation, then land on `/welcome` to choose a handle.

### 3. Custom domain (when you buy it)

Skip the Dynadot “$3 off + Email Hosting” promo — it **locks nameservers for 4 months**, so you cannot point the domain at Vercel.

1. Register `chalkpassport.com` **without** that promo (or use another registrar)
2. Vercel → Project → **Domains** → add `chalkpassport.com` (and `www` if you want)
3. Set DNS as Vercel shows (nameservers or the A/CNAME records)
4. Vercel env: `NEXT_PUBLIC_SITE_URL=https://chalkpassport.com`
5. Supabase **Authentication → URL Configuration**:
   - **Site URL** = `https://chalkpassport.com`
   - Redirect URLs include `https://chalkpassport.com/auth/confirm` and `https://chalkpassport.com/auth/callback`
6. If Google is already on, add `https://chalkpassport.com` to the Google client’s **Authorized JavaScript origins**

Until the domain is attached, the Vercel URL is fine.

### 4. Auth email that actually arrives

Needed before you invite people who aren’t you:

1. Supabase **Authentication → Providers → Email**: on, **Confirm email** on
2. Optional but recommended — **Email Templates → Confirm signup**:

```html
<h2>Confirm your email</h2>
<p>Follow the link below to finish creating your Chalk Passport account.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/passport">
    Confirm email address
  </a>
</p>
```

3. Before a public launch, put a real SMTP provider on Supabase Auth (Resend, Postmark, …). The built-in mailer hits limits quickly and often lands in spam.

### 5. Before opening to climbers worldwide

Not blockers for you + friends, but needed for a real public launch:

- Read `/privacy` and `/terms` and change anything that doesn’t match how you actually operate (last updated 21 August 2026 in [`src/lib/legal.ts`](./src/lib/legal.ts))
- Confirm you can receive mail at `chalkpassport@outlook.com`
- Decide whether stamps stay **private** (they are today) or become shareable later
- Gym search / moderation can wait until the catalog gets messy; you don’t need it to launch

---

## Stack

- Next.js (App Router) → deploy on Vercel
- Supabase Postgres + Auth for storage and login
- Email (any provider) + username + password, or Continue with Google
- Sign in with username or email

## Data model

Shared catalog, private stamps:

- `gyms` — brand/place (Boulder Planet, BFF Climbing, …) plus `place_kind` (`gym` | `rock`) and `climbing_types` offered
- `gym_outlets` — locations of that brand (Sembawang, Tai Seng, …)
- `gym_grade_scales` — one grade chart per gym (numbers, colours, V-scale, custom) plus an optional photo
- `visits` — your stamps: which gym + outlet, climbing type, grade, date, notes, optional TikTok / Instagram / YouTube clip link
- `profiles` — username + email (for recovery / username login lookup)

Place kind: **Gym** = artificial walls/holds (including outdoor plastic walls); **Rock** = natural stone.

Climbing types are `bouldering`, `top_rope`, and `lead`. If a place only offers one type, the stamp flow skips the type step.

There is no `gym_visits` table. Gym name / city / country live on the catalog, not on each stamp.

## Supabase project setup

When creating a **new** project, use these **Security** checkboxes:

| Setting | Choose | Why |
|---|---|---|
| **Enable Data API** | **ON** | Keeps PostgREST available for the JS client |
| **Automatically expose new tables** | **OFF** | Don’t auto-grant API roles; this repo’s SQL grants `authenticated` itself |
| **Enable automatic RLS** | **ON** | New `public` tables get Row Level Security by default |

Then:

1. Open **SQL Editor** and paste/run the **entire** [`supabase/schema.sql`](./supabase/schema.sql) file. It drops old stamp tables (`gym_visits` included) and recreates `gyms` / `gym_outlets` / `gym_grade_scales` / `visits`. Profiles and Auth users are kept. Re-run it whenever the schema changes.
   - Existing project (keep stamps): run [`supabase/email-auth.sql`](./supabase/email-auth.sql), [`supabase/oauth-usernames.sql`](./supabase/oauth-usernames.sql), [`supabase/visit-media.sql`](./supabase/visit-media.sql), [`supabase/climbing-types.sql`](./supabase/climbing-types.sql), [`supabase/place-kind.sql`](./supabase/place-kind.sql), and [`supabase/yds-grades.sql`](./supabase/yds-grades.sql) instead of a full reset.
2. Email provider, confirm-email, redirect URLs, Google, and the confirm template — see **Still to do** above.
3. Copy keys from **Project Settings → API**
4. Add env vars (local `.env.local` and Vercel project settings):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# Public origin for email links (production domain when you have one):
# NEXT_PUBLIC_SITE_URL=https://chalkpassport.com
```

The app talks to the database as the signed-in user. RLS policies keep each climber’s visits private. You do **not** need the service role key in the app.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Phone-first for iPhone 15 (~390px). Landscape phones and anything wider than 480px fill the screen; iPad and small laptops cap around 840px; desktop (≥1100px) uses a left nav.

## Deploy to Vercel

1. This repo is already imported — pushes to `main` deploy
2. Keep the same env vars in the Vercel project
3. When you add a custom domain, set `NEXT_PUBLIC_SITE_URL` as in **Still to do**

## Product notes

- **Email signup** is username + any email + password. After signup, confirm the email before signing in. Signup agrees to `/terms` and `/privacy`.
- **Sign in** accepts username **or** email plus password, or Google if enabled.
- Help, Privacy, and Terms are in the footer and the in-app account menu.
- Legacy accounts created as `username@chalk.local` can still sign in with username until they migrate to a real email.
- After login: **Home**, **Places**, and **Profile**, with a stepped **+ Log a visit** flow
- Optional stamp clip: paste a public **TikTok**, **Instagram** Reel/post, or **YouTube Shorts** link. The clip is embedded for preview; the file stays on that platform (not in Supabase storage).
- New places ask **Gym or Rock** (with help text). Catalog places keep that mapping on `gyms.place_kind`.
- Repeat visits to the same place add another stamp, not a duplicate place. Multi-location gyms (e.g. Boulder Planet Sembawang / Tai Seng) use an **outlet** selector.
- Grade systems: V-scale, Font, French, YDS, **Numbers**, **Colours**, and custom house scales
- The first person to add a gym with a house scale uploads a photo of the grade chart plus a V-scale mapping. House-grade → V mappings are rough community conversions, not official grades.
