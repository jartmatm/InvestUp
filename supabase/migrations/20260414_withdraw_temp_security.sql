-- 2026-04-14
-- Security hardening: restrict manual withdrawal requests to server-side access.

alter table if exists public."withdraw_TEMP" enable row level security;

revoke all on table public."withdraw_TEMP" from anon, authenticated;

