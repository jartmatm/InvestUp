-- 2026-04-08
-- Temporary manual withdrawal requests.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public."withdraw_TEMP" (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  user_id text not null,
  role text,
  source_wallet text,
  destination_wallet text not null,

  payout_method text not null,
  bank_name text,
  bank_account_number text,
  bank_account_type text,
  identification_type text,
  identification_number text,
  phone_number text,
  breve_key text,

  amount_usdc numeric(20, 6) not null,
  onchain_tx_hash text,
  request_status text not null default 'awaiting_transfer',

  metadata jsonb not null default '{}'::jsonb,

  constraint withdraw_temp_payout_method_check
    check (payout_method in ('bank', 'breve')),
  constraint withdraw_temp_account_type_check
    check (bank_account_type in ('ahorros', 'corriente') or bank_account_type is null),
  constraint withdraw_temp_identification_type_check
    check (identification_type in ('cc', 'ti', 'te', 'pasaporte') or identification_type is null),
  constraint withdraw_temp_amount_check
    check (amount_usdc > 0),
  constraint withdraw_temp_status_check
    check (request_status in ('awaiting_transfer', 'submitted', 'processing', 'processed', 'failed')),
  constraint withdraw_temp_method_fields_check
    check (
      (
        payout_method = 'bank'
        and bank_name is not null
        and bank_account_number is not null
        and bank_account_type is not null
        and identification_type is not null
        and identification_number is not null
        and phone_number is not null
      )
      or
      (
        payout_method = 'breve'
        and breve_key is not null
      )
    )
);

create index if not exists withdraw_temp_user_id_idx
  on public."withdraw_TEMP" (user_id);

create index if not exists withdraw_temp_created_at_idx
  on public."withdraw_TEMP" (created_at desc);

create index if not exists withdraw_temp_status_idx
  on public."withdraw_TEMP" (request_status);

create unique index if not exists withdraw_temp_onchain_tx_hash_uniq
  on public."withdraw_TEMP" (onchain_tx_hash)
  where onchain_tx_hash is not null;

drop trigger if exists withdraw_temp_set_updated_at on public."withdraw_TEMP";
create trigger withdraw_temp_set_updated_at
before update on public."withdraw_TEMP"
for each row execute function public.set_updated_at();

-- If RLS is enabled in your project, align the policies with the same strategy
-- you already use for public.users / public.transactions before enabling client writes.
