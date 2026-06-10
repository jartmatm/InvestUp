-- 2026-06-11
-- Backfill internal account available balances from the raw cached wallet balance
-- minus the current locked/pending holds.

update public.internal_account_balances as iab
set available_balance = greatest(
  round(
    (
      coalesce(u.available_wallet_usd, 0) -
      coalesce(iab.locked_balance, 0) -
      coalesce(iab.pending_balance, 0)
    )::numeric,
    6
  ),
  0
)
from public.users as u
where u.id::text = iab.user_id::text;
