-- Deleting an expense that funded a stock purchase must also reverse its
-- effect on the stock item (quantity/avg cost, or the matching FIFO lot) -
-- otherwise the stock item is left overstating what was actually bought.
-- Deleting a stock item outright must also clear the link on any expenses
-- that reference it, since `expenses_stock_fields_consistent` requires
-- stock_item_id/quantity to be null together (plain `on delete set null`
-- on stock_item_id alone would violate that check).

create or replace function public.delete_stock_purchase_expense(p_expense_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_stock_item_id uuid;
  v_quantity numeric;
  v_amount numeric;
  v_unit_cost numeric;
  v_existing_qty numeric;
  v_existing_avg numeric;
  v_lot_remaining numeric;
  v_new_qty numeric;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select stock_item_id, quantity, amount
    into v_stock_item_id, v_quantity, v_amount
  from public.expenses
  where id = p_expense_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'expense not found';
  end if;

  if v_stock_item_id is null then
    delete from public.expenses where id = p_expense_id;
    return;
  end if;

  v_unit_cost := v_amount / v_quantity;

  select quantity_on_hand, avg_unit_cost
    into v_existing_qty, v_existing_avg
  from public.stock_items
  where id = v_stock_item_id and user_id = v_user_id
  for update;

  if found then
    -- FIFO: only reverse the part of the lot that hasn't been consumed yet;
    -- already-consumed quantity stays reflected in past stock_usages.
    select quantity_remaining into v_lot_remaining
    from public.stock_lots
    where expense_id = p_expense_id
    for update;

    if found then
      v_new_qty := greatest(v_existing_qty - v_lot_remaining, 0);
      update public.stock_items set quantity_on_hand = v_new_qty where id = v_stock_item_id;
      delete from public.stock_lots where expense_id = p_expense_id;
    else
      -- Average costing: undo this purchase's contribution to qty/avg cost.
      v_new_qty := v_existing_qty - v_quantity;
      if v_new_qty <= 0 then
        update public.stock_items
        set quantity_on_hand = 0, avg_unit_cost = 0
        where id = v_stock_item_id;
      else
        update public.stock_items
        set quantity_on_hand = v_new_qty,
            avg_unit_cost = greatest(
              ((v_existing_qty * v_existing_avg) - (v_quantity * v_unit_cost)) / v_new_qty,
              0
            )
        where id = v_stock_item_id;
      end if;
    end if;
  end if;

  delete from public.expenses where id = p_expense_id;
end;
$$;

create or replace function public.delete_stock_item(p_stock_item_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.expenses
  set stock_item_id = null, quantity = null
  where stock_item_id = p_stock_item_id and user_id = v_user_id;

  delete from public.stock_items
  where id = p_stock_item_id and user_id = v_user_id;
end;
$$;

grant execute on function public.delete_stock_purchase_expense(uuid) to authenticated;
grant execute on function public.delete_stock_item(uuid) to authenticated;
