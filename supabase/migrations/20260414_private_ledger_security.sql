-- 2026-04-14
-- Security hardening: block direct client access to private ledger tables.

alter table if exists public.investments enable row level security;
revoke all on table public.investments from public, anon, authenticated;

alter table if exists public.repayments enable row level security;
revoke all on table public.repayments from public, anon, authenticated;

alter table if exists public.payment_schedule enable row level security;
revoke all on table public.payment_schedule from public, anon, authenticated;

alter table if exists public."withdraw_TEMP" enable row level security;
revoke all on table public."withdraw_TEMP" from public, anon, authenticated;
