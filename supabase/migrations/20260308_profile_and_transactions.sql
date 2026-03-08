-- 2026-03-08
-- Profile fields on users + transaction ledger for app movements.

create extension if not exists pgcrypto;

alter table if exists public.users
  add column if not exists name text,
  add column if not exists surname text,
  add column if not exists phone_number text,
  add column if not exists country text,
  add column if not exists gender text,
  add column if not exists address text,
  add column if not exists avatar_url text,
  add column if not exists profile_data jsonb default '{}'::jsonb;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  user_id text not null,
  role text,
  movement_type text not null,
  status text not null default 'submitted',
  chain text not null default 'polygon',

  tx_hash text,
  from_wallet text,
  to_wallet text,
  amount_usdc numeric(20, 6),

  metadata jsonb not null default '{}'::jsonb,

  constraint transactions_movement_type_check
    check (movement_type in ('investment', 'repayment', 'transfer', 'buy', 'withdrawal')),
  constraint transactions_status_check
    check (status in ('submitted', 'confirmed', 'failed'))
);

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_created_at_idx on public.transactions (created_at desc);
create unique index if not exists transactions_tx_hash_uniq
  on public.transactions (tx_hash)
  where tx_hash is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

-- If RLS is enabled in your project, add policies according to your auth model.
-- This app currently writes with anon key + custom auth flow, so keep policies aligned
-- with your existing `public.users` table strategy.
