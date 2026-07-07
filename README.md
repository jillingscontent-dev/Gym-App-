# TRAIN — Hybrid Fitness Logbook

Responsive fitness tracker based on the supplied Google Stitch “Natural Minimalist” screens. It supports Supabase accounts, cloud-synced workout sessions, individual exercises and sets, progress history, preferences, and JSON export.

## Connect Supabase

1. Create a Supabase project.
2. Open **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql), then run each file in [`supabase/migrations/`](supabase/migrations) in order (002 default programs, 003 food logs, 004 meal slots and photos).
3. In **Project Settings → API**, copy the project URL and the public publishable/anon key.
4. Add those two public values to [`config.js`](config.js). Never use a service-role key in frontend code.
5. In **Authentication → URL Configuration**, add your local and deployed site URLs as allowed redirect URLs.

The schema enables Row Level Security on every app table. Authenticated users can only access rows where their user ID is the owner.

The second migration creates an editable per-user five-day program, automatically seeds new accounts, and safely backfills existing accounts.

## Run locally

From the workspace root:

```sh
python3 -m http.server 4173 --directory fitness-app
```

Open `http://127.0.0.1:4173`.

Without credentials, the site runs in demo mode using browser storage. Once configured, it presents sign-up/sign-in and uses Supabase as the source of truth.

## Production build

This is a dependency-free, static vanilla JavaScript application. Node.js runs the build script; there is no React, Vite, bundler, or compile step.

Create `.env.local` from `.env.example` and add the same two browser-safe values used by the local `config.js` file. Never add a service-role key.

```sh
npm run lint
npm test
npm run build
```

The production build is written to `dist/`. The build generates `dist/config.js` from:

- `supabaseUrl`
- `supabasePublishableKey`

Both are public frontend configuration values. Supabase Row Level Security protects each user’s data.

## Deploy to Vercel

Set the Vercel project’s Root Directory to `fitness-app`. The included `vercel.json` runs `npm run build`, publishes `dist`, and falls back to `index.html` for directly refreshed application routes.

```sh
cd fitness-app
npx vercel
npx vercel --prod
```

In Vercel, open **Project → Settings → Environment Variables**. Add `supabaseUrl` and `supabasePublishableKey` for Production, Preview, and Development, then redeploy. Add the final Vercel URL under **Supabase Dashboard → Authentication → URL Configuration** as the Site URL and an allowed redirect URL.

## Data storage

With Supabase configured, accounts, profiles, routines, active workouts, exercises, sets, completed history, and edits are saved to Supabase under the signed-in user. `localStorage` is a device-local cache only. Without Supabase configuration the app intentionally enters demo mode and uses only `localStorage`; demo data does not sync between devices.

## Install on iPhone

The web app manifest and Apple metadata are included. Before production deployment, add the three PNG files listed in `icons/README.md`. A service worker is intentionally not registered: the app remains online-first so stale cached code cannot interfere with Supabase workout syncing.

On the deployed HTTPS site in Safari, tap **Share → Add to Home Screen → Add**.
