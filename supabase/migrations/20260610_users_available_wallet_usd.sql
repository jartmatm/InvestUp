-- 2026-06-10
-- Cache the raw Polygon USDC wallet balance on users for private balance sync.

alter table if exists public.users
  add column if not exists available_wallet_usd numeric(20, 6) not null default 0;

update public.users as u
set available_wallet_usd = coalesce(
  round(
    (
      coalesce(iab.available_balance, 0) +
      coalesce(iab.locked_balance, 0) +
      coalesce(iab.pending_balance, 0)
    )::numeric,
    6
  ),
  0
)
from public.internal_account_balances as iab
where iab.user_id = u.id;
