# Chalk Passport

Mobile-first climbing gym tracker for [@chalkchingup](https://www.instagram.com/chalkchingup). Log gyms by country and city, plus the highest grade you’ve climbed at each.

## Stack

- Next.js (App Router) → deploy on Vercel
- Supabase Postgres + Auth for storage and login
- Username + password (same flow as Daybook / diary)

## Supabase project setup

When creating the project, use these **Security** checkboxes:

| Setting | Choose | Why |
|---|---|---|
| **Enable Data API** | **ON** | Keeps PostgREST available for the JS client |
| **Automatically expose new tables** | **OFF** | Don’t auto-grant API roles; this repo’s SQL grants `authenticated` itself |
| **Enable automatic RLS** | **ON** | New `public` tables get Row Level Security by default |

Then:

1. Open **SQL Editor** and run [`supabase/schema.sql`](./supabase/schema.sql) (re-run it if you already ran an older version — that is what fixes `permission denied for table profiles`)
2. **Authentication → Providers → Email**: enabled
3. Turn **off** “Confirm email” so username signup works without a real inbox. The app maps usernames to synthetic emails like `you@chalk.local`.
4. Copy keys from **Project Settings → API**
5. Add env vars (local `.env.local` and Vercel project settings):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon_key
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
- Visits are grouped by country → city
- Grade systems: V-scale, Font, French
