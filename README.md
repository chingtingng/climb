# Chalk Passport

Mobile-first climbing gym tracker for [@chalkchingup](https://www.instagram.com/chalkchingup). Log gyms by country and city, plus the highest grade you’ve climbed at each.

## Stack

- Next.js (App Router) → deploy on Vercel
- Supabase Postgres for storage
- Username-only login (signed httpOnly cookie; no password)

## Supabase project setup

When creating the project, use these **Security** checkboxes:

| Setting | Choose | Why |
|---|---|---|
| **Enable Data API** | **ON** | Keeps PostgREST available for the JS client |
| **Automatically expose new tables** | **OFF** | Don’t auto-grant API roles; control access yourself (recommended) |
| **Enable automatic RLS** | **ON** | New `public` tables get Row Level Security by default |

Then:

1. Open **SQL Editor** and run [`supabase/schema.sql`](./supabase/schema.sql)
2. Copy keys from **Project Settings → API**
3. Add env vars (local `.env.local` and Vercel project settings):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SESSION_SECRET=a-long-random-string
```

`SUPABASE_SERVICE_ROLE_KEY` stays **server-only** (never prefix with `NEXT_PUBLIC_`). The app talks to the database through Next.js server actions; RLS is enabled with no public policies, so the anon key cannot read/write your tables.

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

- **Create account** picks a username and inserts a `profiles` row
- **Sign in** only works for usernames that already exist (still no password)
- Visits are grouped by country → city
- Grade systems: V-scale, Font, French
