alter table if exists public.users
  add column if not exists "Bank_details" jsonb default '{}'::jsonb;
