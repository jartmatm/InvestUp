-- 2026-04-14
-- Security hardening: block direct client access to the transaction ledger.

alter table if exists public.transactions enable row level security;

revoke all on table public.transactions from public, anon, authenticated;
