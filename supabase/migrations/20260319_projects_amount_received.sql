-- 2026-03-19
-- Recomputes the existing amount_received field from persisted investments.
-- Uses the transactions ledger so it also works on databases where
-- public.investments does not expose an amount column directly.

update public.projects as projects
set amount_received = coalesce(
  (
    select sum(transactions.amount)
    from public.investments as investments
    join public.transactions as transactions
      on transactions.id = investments.transaction_id
    where investments.project_id = projects.id::text
      and investments.status in ('submitted', 'confirmed')
      and transactions.status in ('submitted', 'confirmed')
  ),
  0
);
