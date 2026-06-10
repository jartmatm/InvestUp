-- 2026-06-12
-- Make withdrawable balances a materialized view of the effective available
-- balance minus the reserved gas buffer, while keeping locked/pending values
-- sourced from the internal ledger.

create or replace function public.refresh_internal_account_balance_for_user(
  p_user_id text
)
returns void
language plpgsql
as $$
declare
  raw_wallet_balance numeric(20, 6);
  available_balance numeric(20, 6);
  locked_balance numeric(20, 6);
  pending_balance numeric(20, 6);
  withdrawable_balance numeric(20, 6);
  invested_balance numeric(20, 6);
  gas_reserve numeric(20, 6) := 0.1;
begin
  if p_user_id is null or btrim(p_user_id) = '' then
    return;
  end if;

  select coalesce(round(u.available_wallet_usd::numeric, 6), 0)
  into raw_wallet_balance
  from public.users as u
  where u.id::text = p_user_id;

  select
    coalesce(round(sum(coalesce((entry.balance_deltas -> p_user_id ->> 'locked_balance')::numeric, 0))::numeric, 6), 0),
    coalesce(round(sum(coalesce((entry.balance_deltas -> p_user_id ->> 'pending_balance')::numeric, 0))::numeric, 6), 0),
    coalesce(round(sum(coalesce((entry.balance_deltas -> p_user_id ->> 'invested_balance')::numeric, 0))::numeric, 6), 0)
  into locked_balance, pending_balance, invested_balance
  from public.internal_ledger_entries as entry
  where entry.affected_user_ids @> array[p_user_id]::text[];

  raw_wallet_balance := coalesce(raw_wallet_balance, 0);
  locked_balance := coalesce(locked_balance, 0);
  pending_balance := coalesce(pending_balance, 0);
  invested_balance := coalesce(invested_balance, 0);

  available_balance := greatest(round((raw_wallet_balance - locked_balance - pending_balance)::numeric, 6), 0);
  withdrawable_balance := greatest(round((available_balance - gas_reserve)::numeric, 6), 0);

  insert into public.internal_account_balances (
    user_id,
    currency,
    available_balance,
    locked_balance,
    pending_balance,
    withdrawable_balance,
    invested_balance,
    movement_history,
    related_users
  )
  values (
    p_user_id,
    'USD',
    available_balance,
    locked_balance,
    pending_balance,
    withdrawable_balance,
    invested_balance,
    '[]'::jsonb,
    '[]'::jsonb
  )
  on conflict (user_id) do update set
    currency = excluded.currency,
    available_balance = excluded.available_balance,
    locked_balance = excluded.locked_balance,
    pending_balance = excluded.pending_balance,
    withdrawable_balance = excluded.withdrawable_balance,
    invested_balance = excluded.invested_balance,
    updated_at = now();
end;
$$;

do $$
declare
  user_row record;
begin
  for user_row in
    select id::text as user_id
    from public.users
  loop
    perform public.refresh_internal_account_balance_for_user(user_row.user_id);
  end loop;
end $$;
