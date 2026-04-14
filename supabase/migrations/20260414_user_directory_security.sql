-- 2026-04-14
-- Harden direct access to public.users by exposing only a limited public directory view.

create or replace view public.user_directory as
select
  id,
  name,
  surname,
  avatar_url,
  country,
  role,
  wallet_address
from public.users;

grant select on public.user_directory to anon, authenticated;

alter table if exists public.users enable row level security;

revoke all on table public.users from anon, authenticated;
