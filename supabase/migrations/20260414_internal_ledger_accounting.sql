-- 2026-04-14
-- Backend contract ledger and internal balance snapshots.

create extension if not exists pgcrypto;

create table if not exists public.internal_contracts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  credit_id text not null unique,
  project_id text not null,
  investor_user_id text not null,
  entrepreneur_user_id text not null,

  contract_title text not null,
  contract_summary text,
  currency text not null default 'USD',

  annual_interest_rate numeric(10, 6) not null default 0,
  monthly_interest_rate numeric(12, 8) not null default 0,
  installment_count integer not null default 1,
  current_installment_number integer not null default 1,
  schedule_start_date date,
  next_due_date date,

  original_principal numeric(20, 6) not null default 0,
  total_paid_amount numeric(20, 6) not null default 0,
  current_installment_amount numeric(20, 6) not null default 0,
  outstanding_balance numeric(20, 6) not null default 0,
  total_contract_value numeric(20, 6) not null default 0,

  status text not null default 'pending',
  tx_hash text,
  payment_plan jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  constraint internal_contracts_status_check
    check (status in ('pending', 'paid', 'late', 'partial', 'cancelled'))
);

create index if not exists internal_contracts_project_id_idx
  on public.internal_contracts (project_id);

create index if not exists internal_contracts_investor_user_id_idx
  on public.internal_contracts (investor_user_id);

create index if not exists internal_contracts_entrepreneur_user_id_idx
  on public.internal_contracts (entrepreneur_user_id);

drop trigger if exists internal_contracts_set_updated_at on public.internal_contracts;
create trigger internal_contracts_set_updated_at
before update on public.internal_contracts
for each row execute function public.set_updated_at();

create table if not exists public.internal_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  entry_type text not null,
  reference_type text not null,
  reference_id text not null,
  credit_id text,
  project_id text,
  primary_user_id text,
  counterparty_user_id text,
  affected_user_ids text[] not null default '{}'::text[],

  amount numeric(20, 6) not null default 0,
  currency text not null default 'USD',

  postings jsonb not null default '[]'::jsonb,
  participants jsonb not null default '[]'::jsonb,
  balance_deltas jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  constraint internal_ledger_entries_entry_type_check
    check (entry_type in ('investment', 'repayment', 'withdrawal', 'adjustment')),
  constraint internal_ledger_entries_reference_unique
    unique (reference_type, reference_id)
);

create index if not exists internal_ledger_entries_credit_id_idx
  on public.internal_ledger_entries (credit_id);

create index if not exists internal_ledger_entries_project_id_idx
  on public.internal_ledger_entries (project_id);

create index if not exists internal_ledger_entries_primary_user_id_idx
  on public.internal_ledger_entries (primary_user_id);

create index if not exists internal_ledger_entries_counterparty_user_id_idx
  on public.internal_ledger_entries (counterparty_user_id);

create index if not exists internal_ledger_entries_affected_user_ids_gin
  on public.internal_ledger_entries using gin (affected_user_ids);

drop trigger if exists internal_ledger_entries_set_updated_at on public.internal_ledger_entries;
create trigger internal_ledger_entries_set_updated_at
before update on public.internal_ledger_entries
for each row execute function public.set_updated_at();

create table if not exists public.internal_account_balances (
  user_id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  currency text not null default 'USD',
  available_balance numeric(20, 6) not null default 0,
  locked_balance numeric(20, 6) not null default 0,
  pending_balance numeric(20, 6) not null default 0,
  withdrawable_balance numeric(20, 6) not null default 0,
  invested_balance numeric(20, 6) not null default 0,

  movement_history jsonb not null default '[]'::jsonb,
  related_users jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

drop trigger if exists internal_account_balances_set_updated_at on public.internal_account_balances;
create trigger internal_account_balances_set_updated_at
before update on public.internal_account_balances
for each row execute function public.set_updated_at();

alter table if exists public.internal_contracts enable row level security;
revoke all on table public.internal_contracts from public, anon, authenticated;

alter table if exists public.internal_ledger_entries enable row level security;
revoke all on table public.internal_ledger_entries from public, anon, authenticated;

alter table if exists public.internal_account_balances enable row level security;
revoke all on table public.internal_account_balances from public, anon, authenticated;
