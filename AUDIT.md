# Project audit

## Findings

### Database and seed data

The original database stored profiles, workout sessions, exercise logs, and set logs. It did **not** contain workout-program, workout-day, or program-exercise tables. The five-day routine lived only in `app.js`, so new accounts had no persistent routine to load or edit.

`supabase/migrations/002_default_programs.sql` adds normalized program tables, seeds all five days for new accounts, and backfills every existing account without duplicating data.

### RLS and user filtering

The original RLS policies and `.eq("user_id", userId)` session filter correctly isolate each user's logged sessions. They were not suppressing four workout days because those days were not database rows at all.

The new program tables use the same owner-only RLS model. The seeding function refuses authenticated requests that target a different user ID.

### Previously incomplete controls

- Week / Month / Year changed visual state but did not filter progress data. It now filters by 7, 30, or 365 days.
- Workout routines could not be edited. They now support add, edit/replace, and remove.
- Active sessions could add sets but not add, replace, or remove exercises. Those actions now persist to Supabase.
- Exercise cards did not show previous performance. They now show the most recent matching exercise sets.
- The profile goal card remains informational rather than a button.
- The reminders switch stores a profile preference; it does not schedule operating-system notifications.

## SQL to run

For an existing project that already ran `supabase/schema.sql`, run only:

1. `supabase/migrations/002_default_programs.sql`

For a brand-new Supabase project, run in this order:

1. `supabase/schema.sql`
2. `supabase/migrations/002_default_programs.sql`

