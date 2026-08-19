# Chalk Passport

Mobile-first climbing gym tracker for [@chalkchingup](https://www.instagram.com/chalkchingup). Log gyms by country and city, plus the highest grade you’ve climbed at each.

## Stack

- Next.js (App Router) → deploy on Vercel
- Supabase Postgres + Auth for storage and login
- Username + password (same flow as Daybook / diary)

## Data model

Shared catalog, private stamps:

- `gyms` — brand (Boulder Planet, BFF Climbing, …)
- `gym_outlets` — locations of that brand (Sembawang, Tai Seng, …)
- `gym_grade_scales` — one grade chart per gym (numbers, colours, V-scale, custom) plus an optional photo
- `visits` — your stamps: which gym + outlet, grade, date, notes

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
2. **Authentication → Providers → Email**: enabled
3. Turn **off** “Confirm email” so username signup works without a real inbox. The app maps usernames to synthetic emails like `you@chalk.local`.
4. Copy keys from **Project Settings → API**
5. Add env vars (local `.env.local` and Vercel project settings):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
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

- **Create account** / **Sign in** use a username and a required password
- After login: **Home**, **Gyms**, and **Profile**, with a stepped **+ Log a gym** flow
- Repeat visits to the same gym add another stamp, not a duplicate gym. Multi-location gyms (e.g. Boulder Planet Sembawang / Tai Seng) use an **outlet** selector.
- Grade systems: V-scale, Font, French, **Numbers**, **Colours**, and custom house scales
- The first person to add a gym with a house scale uploads a photo of the grade chart plus a V-scale mapping
- After pulling this version, run the full [`supabase/schema.sql`](./supabase/schema.sql) in the SQL Editor (it is a breaking reset of stamp tables)
