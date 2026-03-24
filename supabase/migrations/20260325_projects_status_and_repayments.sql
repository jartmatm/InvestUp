-- 2026-03-25
-- Adds richer project states and a repayments ledger.

create extension if not exists pgcrypto;

create table if not exists public.repayments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  transaction_id uuid references public.transactions(id) on delete set null,
  entrepreneur_user_id text not null,
  investor_user_id text,

  tx_hash text,
  from_wallet text,
  to_wallet text,
  amount numeric(20, 6),
  amount_usdc numeric(20, 6),

  status text not null default 'submitted',
  metadata jsonb not null default '{}'::jsonb,

  constraint repayments_status_check
    check (status in ('submitted', 'confirmed', 'failed'))
);

alter table if exists public.repayments
  add column if not exists transaction_id uuid,
  add column if not exists entrepreneur_user_id text,
  add column if not exists investor_user_id text,
  add column if not exists tx_hash text,
  add column if not exists from_wallet text,
  add column if not exists to_wallet text,
  add column if not exists amount numeric(20, 6),
  add column if not exists amount_usdc numeric(20, 6),
  add column if not exists status text default 'submitted',
  add column if not exists metadata jsonb default '{}'::jsonb;

update public.repayments
set amount = coalesce(amount, amount_usdc)
where amount is null
  and amount_usdc is not null;

create index if not exists repayments_entrepreneur_user_id_idx on public.repayments (entrepreneur_user_id);
create index if not exists repayments_investor_user_id_idx on public.repayments (investor_user_id);
create index if not exists repayments_created_at_idx on public.repayments (created_at desc);
create unique index if not exists repayments_tx_hash_uniq
  on public.repayments (tx_hash)
  where tx_hash is not null;

drop trigger if exists repayments_set_updated_at on public.repayments;
create trigger repayments_set_updated_at
before update on public.repayments
for each row execute function public.set_updated_at();

do $$
declare
  status_udt text;
begin
  select c.udt_name
  into status_udt
  from information_schema.columns as c
  where c.table_schema = 'public'
    and c.table_name = 'projects'
    and c.column_name = 'status';

  if status_udt = 'project_status' then
    begin
      alter type public.project_status add value if not exists 'paused';
    exception
      when duplicate_object then null;
    end;

    begin
      alter type public.project_status add value if not exists 'financing_in_progress';
    exception
      when duplicate_object then null;
    end;
  else
    alter table if exists public.projects
      drop constraint if exists projects_status_check;

    alter table if exists public.projects
      add constraint projects_status_check
        check (status in ('draft', 'published', 'paused', 'financing_in_progress', 'closed'));
  end if;
end $$;

update public.projects
set status = 'financing_in_progress'
where coalesce(amount_received, 0) > 0
  and coalesce(status::text, '') not in ('closed', 'financing_in_progress');

create or replace function public.sync_project_status_from_funding()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.amount_received, 0) > 0 and coalesce(new.status::text, '') <> 'closed' then
    new.status := 'financing_in_progress';
  end if;
  return new;
end;
$$;

drop trigger if exists projects_sync_status_from_funding on public.projects;
create trigger projects_sync_status_from_funding
before insert or update on public.projects
for each row execute function public.sync_project_status_from_funding();

create or replace function public.prevent_delete_funded_projects()
returns trigger
language plpgsql
as $$
begin
  if coalesce(old.amount_received, 0) > 0 then
    raise exception 'Projects with financing in progress cannot be deleted.';
  end if;
  return old;
end;
$$;

drop trigger if exists projects_prevent_delete_funded on public.projects;
create trigger projects_prevent_delete_funded
before delete on public.projects
for each row execute function public.prevent_delete_funded_projects();
