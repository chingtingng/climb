# Chalk Passport

Mobile-first climbing gym tracker for [@chalkchingup](https://www.instagram.com/chalkchingup). Log gyms by country and city, plus the highest grade you’ve climbed at each.

## Stack

- Next.js (App Router) → deploy on Vercel
- Supabase Postgres + Auth for storage and login
- Username + email (verified) + password; sign in with username or email

## Data model

Shared catalog, private stamps:

- `gyms` — brand (Boulder Planet, BFF Climbing, …) plus `climbing_types` offered
- `gym_outlets` — locations of that brand (Sembawang, Tai Seng, …)
- `gym_grade_scales` — one grade chart per gym (numbers, colours, V-scale, custom) plus an optional photo
- `visits` — your stamps: which gym + outlet, climbing type, grade, date, notes, optional photo/video
- `profiles` — username + email (for recovery / username login lookup)

Climbing types are `bouldering`, `top_rope`, and `lead`. If a gym only offers one type, the stamp flow skips the type step.

There is no `gym_visits` table. Gym name / city / country live on the catalog, not on each stamp.

## Supabase project setup

When creating the project, use these **Security** checkboxes:

| Setting | Choose | Why |
|---|---|---|
| **Enable Data API** | **ON** | Keeps PostgREST available for the JS client |
| **Automatically expose new tables** | **OFF** | Don’t auto-grant API roles; this repo’s SQL grants `authenticated` itself |
| **Enable automatic RLS** | **ON** | New `public` tables get Row Level Security by default |

Then:

1. Open **SQL Editor** and paste/run the **entire** [`supabase/schema.sql`](./supabase/schema.sql) file. It drops old stamp tables (`gym_visits` included) and recreates `gyms` / `gym_outlets` / `gym_grade_scales` / `visits`. Profiles and Auth users are kept. Re-run it whenever the schema changes.
   - Existing project (keep stamps): run [`supabase/email-auth.sql`](./supabase/email-auth.sql), [`supabase/visit-media.sql`](./supabase/visit-media.sql), and [`supabase/climbing-types.sql`](./supabase/climbing-types.sql) instead of a full reset.
2. **Authentication → Providers → Email**: enabled
3. Turn **on** “Confirm email” so signup sends a verification link (needed for account recovery).
4. **Authentication → URL Configuration**:
   - Site URL = your app origin (e.g. `http://localhost:3000` or the Vercel URL)
   - Redirect URLs include `{SITE_URL}/auth/confirm` and `{SITE_URL}/auth/callback`
5. Optional but recommended — **Authentication → Email Templates → Confirm signup**:

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
# Optional override for email redirect links in production:
# NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

The app talks to the database as the signed-in user. RLS policies keep each climber’s visits private. You do **not** need the service role key in the app.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Designed around iPhone 15 width (~390px) and responsive across phone sizes.

## Deploy to Vercel

1. Push this repo and import it in Vercel
2. Add the same env vars in the Vercel project
3. Deploy

## Notes

- **Create account** requires username, email, and password. After signup, confirm the email before signing in.
- **Sign in** accepts username **or** email plus password.
- Legacy accounts created as `username@chalk.local` can still sign in with username until they migrate to a real email.
- After login: **Home**, **Gyms**, and **Profile**, with a stepped **+ Log a gym** flow
- Repeat visits to the same gym add another stamp, not a duplicate gym. Multi-location gyms (e.g. Boulder Planet Sembawang / Tai Seng) use an **outlet** selector.
- Grade systems: V-scale, Font, French, **Numbers**, **Colours**, and custom house scales
- The first person to add a gym with a house scale uploads a photo of the grade chart plus a V-scale mapping
- After pulling this version, run [`supabase/email-auth.sql`](./supabase/email-auth.sql) (or the full [`supabase/schema.sql`](./supabase/schema.sql)) in the SQL Editor
