-- Stock/inventory tracking for bulk-purchased items (mie instan, telur, dll).
-- Cash outflow keeps being recorded on `expenses` at purchase time. Consumption
-- is logged separately in `stock_usages`, which is what "realized expense"
-- reporting is built from.

create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  unit_label text not null default 'pcs',
  category text not null default 'Lainnya',
  costing_method text not null default 'average' check (costing_method in ('average', 'fifo')),
  quantity_on_hand numeric(12, 3) not null default 0,
  avg_unit_cost numeric(12, 4) not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists stock_items_user_id_lower_name_idx
  on public.stock_items (user_id, lower(name));

alter table public.expenses
  add column if not exists stock_item_id uuid references public.stock_items (id) on delete set null,
  add column if not exists quantity numeric(12, 3);

alter table public.expenses
  drop constraint if exists expenses_stock_fields_consistent;

alter table public.expenses
  add constraint expenses_stock_fields_consistent
  check ((stock_item_id is null) = (quantity is null));

create table if not exists public.stock_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stock_item_id uuid not null references public.stock_items (id) on delete cascade,
  expense_id uuid references public.expenses (id) on delete set null,
  unit_cost numeric(12, 4) not null,
  quantity_remaining numeric(12, 3) not null,
  purchased_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists stock_lots_item_purchased_idx
  on public.stock_lots (stock_item_id, purchased_at, created_at);

create table if not exists public.stock_usages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stock_item_id uuid not null references public.stock_items (id) on delete cascade,
  quantity numeric(12, 3) not null check (quantity > 0),
  realized_amount numeric(12, 2) not null,
  used_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists stock_usages_user_id_used_at_idx
  on public.stock_usages (user_id, used_at desc, created_at desc);

alter table public.stock_items enable row level security;
alter table public.stock_lots enable row level security;
alter table public.stock_usages enable row level security;

create policy "Users can view own stock items"
  on public.stock_items for select
  using (auth.uid() = user_id);
create policy "Users can insert own stock items"
  on public.stock_items for insert
  with check (auth.uid() = user_id);
create policy "Users can update own stock items"
  on public.stock_items for update
  using (auth.uid() = user_id);
create policy "Users can delete own stock items"
  on public.stock_items for delete
  using (auth.uid() = user_id);

create policy "Users can view own stock lots"
  on public.stock_lots for select
  using (auth.uid() = user_id);
create policy "Users can insert own stock lots"
  on public.stock_lots for insert
  with check (auth.uid() = user_id);
create policy "Users can update own stock lots"
  on public.stock_lots for update
  using (auth.uid() = user_id);

create policy "Users can view own stock usages"
  on public.stock_usages for select
  using (auth.uid() = user_id);
create policy "Users can insert own stock usages"
  on public.stock_usages for insert
  with check (auth.uid() = user_id);

-- Records a bulk purchase: creates/updates the stock item, inserts the cash
-- outflow row on `expenses`, and (for FIFO items) opens a new lot.
create or replace function public.create_stock_purchase(
  p_amount numeric,
  p_category text,
  p_note text,
  p_item_name text,
  p_unit_label text,
  p_quantity numeric,
  p_costing_method text default 'average'
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item_id uuid;
  v_existing_qty numeric;
  v_existing_avg numeric;
  v_unit_cost numeric;
  v_expense_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  v_unit_cost := p_amount / p_quantity;

  select id, quantity_on_hand, avg_unit_cost
    into v_item_id, v_existing_qty, v_existing_avg
  from public.stock_items
  where user_id = v_user_id and lower(name) = lower(p_item_name)
  for update;

  if v_item_id is null then
    insert into public.stock_items (
      user_id, name, unit_label, category, costing_method, quantity_on_hand, avg_unit_cost
    )
    values (
      v_user_id, p_item_name, p_unit_label, p_category,
      case when p_costing_method = 'fifo' then 'fifo' else 'average' end,
      p_quantity, v_unit_cost
    )
    returning id into v_item_id;
  else
    update public.stock_items
    set quantity_on_hand = v_existing_qty + p_quantity,
        avg_unit_cost = ((v_existing_qty * v_existing_avg) + (p_quantity * v_unit_cost))
          / (v_existing_qty + p_quantity)
    where id = v_item_id;
  end if;

  insert into public.expenses (user_id, amount, category, note, stock_item_id, quantity)
  values (v_user_id, p_amount, p_category, p_note, v_item_id, p_quantity)
  returning id into v_expense_id;

  insert into public.stock_lots (user_id, stock_item_id, expense_id, unit_cost, quantity_remaining, purchased_at)
  select v_user_id, v_item_id, v_expense_id, v_unit_cost, p_quantity, current_date
  where (select costing_method from public.stock_items where id = v_item_id) = 'fifo';

  return v_expense_id;
end;
$$;

-- Logs consumption of a stock item: computes the realized expense snapshot
-- (average cost, or FIFO walk across open lots), depletes stock, and records
-- the usage row.
create or replace function public.log_stock_usage(
  p_stock_item_id uuid,
  p_quantity numeric,
  p_used_at date,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_method text;
  v_avg_cost numeric;
  v_remaining numeric;
  v_realized numeric := 0;
  v_take numeric;
  v_lot record;
  v_usage_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  select costing_method, avg_unit_cost
    into v_method, v_avg_cost
  from public.stock_items
  where id = p_stock_item_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'stock item not found';
  end if;

  if v_method = 'fifo' then
    v_remaining := p_quantity;

    for v_lot in
      select id, quantity_remaining, unit_cost
      from public.stock_lots
      where stock_item_id = p_stock_item_id and quantity_remaining > 0
      order by purchased_at asc, created_at asc
      for update
    loop
      exit when v_remaining <= 0;
      v_take := least(v_lot.quantity_remaining, v_remaining);
      v_realized := v_realized + (v_take * v_lot.unit_cost);
      update public.stock_lots
        set quantity_remaining = quantity_remaining - v_take
        where id = v_lot.id;
      v_remaining := v_remaining - v_take;
    end loop;

    -- Ran out of tracked lots (e.g. stock went negative) - fall back to avg cost.
    if v_remaining > 0 then
      v_realized := v_realized + (v_remaining * v_avg_cost);
    end if;
  else
    v_realized := p_quantity * v_avg_cost;
  end if;

  update public.stock_items
  set quantity_on_hand = quantity_on_hand - p_quantity
  where id = p_stock_item_id;

  insert into public.stock_usages (user_id, stock_item_id, quantity, realized_amount, used_at, note)
  values (v_user_id, p_stock_item_id, p_quantity, v_realized, coalesce(p_used_at, current_date), nullif(trim(p_note), ''))
  returning id into v_usage_id;

  return v_usage_id;
end;
$$;

grant execute on function public.create_stock_purchase(numeric, text, text, text, text, numeric, text) to authenticated;
grant execute on function public.log_stock_usage(uuid, numeric, date, text) to authenticated;
