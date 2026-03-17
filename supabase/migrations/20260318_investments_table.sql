-- 2026-03-18
-- Investment ledger linked to project transfers.

create extension if not exists pgcrypto;

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  transaction_id uuid references public.transactions(id) on delete set null,
  investor_user_id text not null,
  entrepreneur_user_id text,
  project_id text not null,
  project_title text,

  tx_hash text,
  from_wallet text,
  to_wallet text,
  amount_usdc numeric(20, 6) not null,

  interest_rate_ea numeric(6, 2),
  term_months integer,
  projected_return_usdc numeric(20, 6),
  projected_total_usdc numeric(20, 6),

  status text not null default 'submitted',
  metadata jsonb not null default '{}'::jsonb,

  constraint investments_status_check
    check (status in ('submitted', 'confirmed', 'failed'))
);

alter table if exists public.investments
  add column if not exists transaction_id uuid,
  add column if not exists investor_user_id text,
  add column if not exists entrepreneur_user_id text,
  add column if not exists project_id text,
  add column if not exists project_title text,
  add column if not exists tx_hash text,
  add column if not exists from_wallet text,
  add column if not exists to_wallet text,
  add column if not exists amount_usdc numeric(20, 6),
  add column if not exists interest_rate_ea numeric(6, 2),
  add column if not exists term_months integer,
  add column if not exists projected_return_usdc numeric(20, 6),
  add column if not exists projected_total_usdc numeric(20, 6),
  add column if not exists status text default 'submitted',
  add column if not exists metadata jsonb default '{}'::jsonb;

alter table if exists public.investments
  alter column metadata set default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'investments_transaction_fk'
  ) then
    alter table public.investments
      add constraint investments_transaction_fk
      foreign key (transaction_id) references public.transactions(id) on delete set null;
  end if;
end $$;

create index if not exists investments_investor_user_id_idx on public.investments (investor_user_id);
create index if not exists investments_project_id_idx on public.investments (project_id);
create index if not exists investments_created_at_idx on public.investments (created_at desc);
create unique index if not exists investments_tx_hash_uniq
  on public.investments (tx_hash)
  where tx_hash is not null;

drop trigger if exists investments_set_updated_at on public.investments;
create trigger investments_set_updated_at
before update on public.investments
for each row execute function public.set_updated_at();
