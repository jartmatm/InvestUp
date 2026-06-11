-- 2026-06-13
-- Keep public.transactions amount and amount_usdc aligned so either write path
-- materializes the same transferred value for the ledger and downstream views.

alter table if exists public.transactions
  add column if not exists amount numeric(20, 6),
  add column if not exists amount_usdc numeric(20, 6);

drop trigger if exists transactions_set_updated_at on public.transactions;

update public.transactions
set amount = coalesce(amount, amount_usdc),
    amount_usdc = coalesce(amount_usdc, amount)
where amount is null
   or amount_usdc is null;

create or replace function public.sync_transactions_amount_columns()
returns trigger
language plpgsql
as $$
begin
  new.amount := coalesce(new.amount, new.amount_usdc);
  new.amount_usdc := coalesce(new.amount_usdc, new.amount);
  return new;
end;
$$;

drop trigger if exists transactions_align_amount_columns on public.transactions;
create trigger transactions_align_amount_columns
before insert or update on public.transactions
for each row execute function public.sync_transactions_amount_columns();
