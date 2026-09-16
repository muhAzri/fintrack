-- Lets a backdated stock purchase (user forgot to log it on the actual day)
-- land on the right expense date, and keeps the FIFO lot's purchased_at in
-- sync so cost-basis ordering still reflects when the stock actually arrived.
drop function if exists public.create_stock_purchase(numeric, text, text, text, text, numeric, text);

create or replace function public.create_stock_purchase(
  p_amount numeric,
  p_category text,
  p_note text,
  p_item_name text,
  p_unit_label text,
  p_quantity numeric,
  p_costing_method text default 'average',
  p_spent_at date default current_date
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
  v_spent_at date := coalesce(p_spent_at, current_date);
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

  insert into public.expenses (user_id, amount, category, note, stock_item_id, quantity, spent_at)
  values (v_user_id, p_amount, p_category, p_note, v_item_id, p_quantity, v_spent_at)
  returning id into v_expense_id;

  insert into public.stock_lots (user_id, stock_item_id, expense_id, unit_cost, quantity_remaining, purchased_at)
  select v_user_id, v_item_id, v_expense_id, v_unit_cost, p_quantity, v_spent_at
  where (select costing_method from public.stock_items where id = v_item_id) = 'fifo';

  return v_expense_id;
end;
$$;

grant execute on function public.create_stock_purchase(numeric, text, text, text, text, numeric, text, date) to authenticated;
