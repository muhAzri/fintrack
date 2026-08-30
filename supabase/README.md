# Database migrations

Schema changes live in `migrations/`, one file per change, named
`YYYYMMDDHHMMSS_description.sql` (UTC-ish timestamp + short description).
Apply them in filename order.

- With the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to this
  project: `supabase db push`.
- Without the CLI: paste each new file's contents into the Supabase Dashboard
  SQL Editor, in order, and run it once.

Never edit a migration that has already been applied to production — add a
new file instead.
