-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor) for this project.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null default 'Lainnya',
  note text,
  spent_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_id_spent_at_idx
  on public.expenses (user_id, spent_at desc, created_at desc);

alter table public.expenses enable row level security;

create policy "Users can view own expenses"
  on public.expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert own expenses"
  on public.expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own expenses"
  on public.expenses for delete
  using (auth.uid() = user_id);
