-- 2026-06-10
-- Cache the raw Polygon USDC wallet balance on users for private balance sync.

alter table if exists public.users
  add column if not exists available_wallet_usd numeric(20, 6) not null default 0;

-- The raw wallet balance must be backfilled from Polygon in application code.
-- SQL migrations cannot query the chain, so use scripts/backfill-wallet-balances.mjs
-- to populate existing rows after the column is added.
