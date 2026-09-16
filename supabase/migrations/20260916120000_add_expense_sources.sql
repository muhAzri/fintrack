-- User-defined "where did the money come from" tags (bank account, e-wallet,
-- etc). Fully optional and freeform: null source_id means uncategorized, no
-- seeded default row needed. Deleting a source just detaches it from any
-- expenses via the FK - no consistency-check function needed like the stock
-- item delete has, since there's no companion column that must stay in sync.

create table if not exists public.expense_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists expense_sources_user_id_lower_name_idx
  on public.expense_sources (user_id, lower(name));

alter table public.expenses
  add column if not exists source_id uuid references public.expense_sources (id) on delete set null;

alter table public.expense_sources enable row level security;

create policy "Users can view own expense sources"
  on public.expense_sources for select
  using (auth.uid() = user_id);

create policy "Users can insert own expense sources"
  on public.expense_sources for insert
  with check (auth.uid() = user_id);

create policy "Users can update own expense sources"
  on public.expense_sources for update
  using (auth.uid() = user_id);

create policy "Users can delete own expense sources"
  on public.expense_sources for delete
  using (auth.uid() = user_id);
