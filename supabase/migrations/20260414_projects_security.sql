-- 2026-04-14
-- Security hardening: block direct client access to public.projects.

alter table if exists public.projects enable row level security;

revoke all on table public.projects from public, anon, authenticated;
