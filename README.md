# Chalk Passport

Mobile-first climbing passport. Log places (gyms and more) by country and city, plus the highest grade you’ve climbed at each.

## Stack

- Next.js (App Router) → deploy on Vercel
- Supabase Postgres + Auth for storage and login
- Email + username + password
- Sign in with username or email

## Data model

Shared catalog, private stamps:

- `gyms` — brand/place (Boulder Planet, BFF Climb, …) plus `place_kind` (`gym` | `rock`), `climbing_types` offered, and `status` (`pending` until a second climber stamps, then `published`)
- `gym_outlets` — locations of that brand (Sembawang, Tai Seng, …), same status rule. Optional `climbing_types` override when an outlet doesn’t offer everything the brand does (null = inherit)
- `gym_reports` — eligible “this place looks wrong” flags (reason + optional detail; three closed/missing reports hide the gym from the picker)
- `gym_grade_scales` — grade chart(s) per gym (numbers, colours, V-scale, custom); optional `climbing_type` when boulder and rope use different charts
- `visits` — your stamps: which gym + outlet, climbing type, grade, date, notes, optional TikTok / Instagram / YouTube clip link
- `profiles` — username + email (for recovery / username login lookup)

Place kind: **Gym** = artificial walls/holds (including outdoor plastic walls); **Rock** = natural stone.

Climbing types are `bouldering`, `top_rope`, and `lead`. If a place — or that outlet — only offers one type, the stamp flow skips the type step.

There is no `gym_visits` table. Gym name / city / country live on the catalog, not on each stamp.

## Supabase project setup

When creating the project, use these **Security** checkboxes:

| Setting | Choose | Why |
|---|---|---|
| **Enable Data API** | **ON** | Keeps PostgREST available for the JS client |
| **Automatically expose new tables** | **OFF** | Don’t auto-grant API roles; this repo’s SQL grants `authenticated` itself |
| **Enable automatic RLS** | **ON** | New `public` tables get Row Level Security by default |

Then:

1. Open **SQL Editor** and paste/run the **entire** [`supabase/schema.sql`](./supabase/schema.sql) file. It drops stamp tables (`gym_visits` included) and recreates `gyms` / `gym_outlets` / `gym_grade_scales` / `gym_reports` / `visits`, including the gym seed. Profiles and Auth users are kept. Re-run this file whenever the schema changes if you are okay wiping stamps.
2. **Authentication → Providers → Email**: enabled
3. Turn **on** “Confirm email” so email signup sends a verification link (needed for account recovery).
4. **Authentication → URL Configuration**:
   - Site URL = **`https://chalk-passport.vercel.app`** (the public production app)
   - Do **not** use `https://chalk-passport-cassiejt.vercel.app`. That is Vercel’s `{project}-{username}` alias and is gated by Vercel login (SSO). Verification emails that point there send climbers to a Vercel login wall, not Chalk Passport.
   - Redirect URLs:
     - `https://chalk-passport.vercel.app/auth/confirm**`
     - `https://chalk-passport.vercel.app/auth/callback**`
     - `http://localhost:3000/auth/confirm**`
     - `http://localhost:3000/auth/callback**`
5. Optional but recommended — **Authentication → Email Templates → Confirm signup**. `{{ .SiteURL }}` is the dashboard Site URL above, not whichever host the climber used:

```html
<h2>Confirm your email</h2>
<p>Follow the link below to finish creating your Chalk Passport account.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/passport">
    Confirm email address
  </a>
</p>
```

6. Copy keys from **Project Settings → API**
7. Add env vars (local `.env.local` and Vercel project settings):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# Required on Vercel so verification emails open the public app:
NEXT_PUBLIC_SITE_URL=https://chalk-passport.vercel.app
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

1. Push this repo and import it in Vercel
2. Add the same env vars in the Vercel project, including `NEXT_PUBLIC_SITE_URL=https://chalk-passport.vercel.app`
3. Deploy

## Notes

- **Email signup** is username + any email + password. After signup, confirm the email before signing in. Signup agrees to the [Terms](/terms) and [Privacy Policy](/privacy).
- **Sign in** accepts username **or** email plus password.
- **Help & feedback** (`/help`) opens a mail to `chalkpassport@outlook.com`. Privacy and Terms are public at `/privacy` and `/terms`.
- Legacy accounts created as `username@chalk.local` can still sign in with username until they migrate to a real email.
- After login: **Home**, **Places**, and **Profile**, with a stepped **+ Log a visit** flow
- Optional stamp clip: paste a public **TikTok**, **Instagram** Reel/post, or **YouTube Shorts** link. The clip is embedded for preview; the file stays on that platform (not in Supabase storage).
- New places ask **Gym or Rock** (with help text). Catalog places keep that mapping on `gyms.place_kind`.
- Repeat visits to the same place add another stamp, not a duplicate place. Multi-location gyms (e.g. Boulder Planet Sembawang / Tai Seng) use an **outlet** selector.
- Grade systems: V-scale, Font, French, YDS, **Numbers**, **Colours**, and custom house scales
- The first person to add a gym with a house scale saves a V-scale mapping
