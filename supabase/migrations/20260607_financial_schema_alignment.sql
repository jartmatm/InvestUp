-- 2026-06-07
-- Aligns funding, investment, and internal-ledger data with the production app.
-- Backfills legacy fields and adds database-side refresh helpers so the portfolio
-- speed meter and balance views keep working even if older rows were incomplete.

alter table if exists public.projects
  add column if not exists owner_wallet text,
  add column if not exists target_amount_usd numeric(14, 2),
  add column if not exists interest_rate_ea numeric(6, 2),
  add column if not exists amount_received numeric(14, 2) not null default 0;

alter table if exists public.transactions
  add column if not exists amount numeric(20, 6),
  add column if not exists amount_usdc numeric(20, 6);

alter table if exists public.investments
  add column if not exists amount numeric(20, 6),
  add column if not exists amount_usdc numeric(20, 6),
  add column if not exists interest_rate_ea numeric(6, 2);

alter table if exists public.internal_account_balances
  add column if not exists available_balance numeric(20, 6) not null default 0,
  add column if not exists locked_balance numeric(20, 6) not null default 0,
  add column if not exists pending_balance numeric(20, 6) not null default 0,
  add column if not exists withdrawable_balance numeric(20, 6) not null default 0,
  add column if not exists invested_balance numeric(20, 6) not null default 0;

update public.transactions
set amount = coalesce(amount, amount_usdc),
    amount_usdc = coalesce(amount_usdc, amount)
where amount is null
   or amount_usdc is null;

update public.investments
set amount = coalesce(amount, amount_usdc),
    amount_usdc = coalesce(amount_usdc, amount)
where amount is null
   or amount_usdc is null;

update public.projects
set target_amount_usd = coalesce(target_amount_usd, amount_requested),
    amount_requested = coalesce(amount_requested, target_amount_usd),
    interest_rate_ea = coalesce(interest_rate_ea, interest_rate),
    interest_rate = coalesce(interest_rate, interest_rate_ea)
where target_amount_usd is null
   or amount_requested is null
   or interest_rate_ea is null
   or interest_rate is null;

do $$
begin
  if to_regclass('public.users') is not null then
    update public.projects as projects
    set owner_wallet = coalesce(projects.owner_wallet, users.wallet_address)
    from public.users as users
    where projects.owner_wallet is null
      and users.wallet_address is not null
      and users.id::text in (projects.owner_user_id::text, projects.owner_id::text);
  end if;
end $$;
create or replace function public.refresh_project_amount_received(
  p_project_id text
)
returns void
language plpgsql
as $$
begin
  if p_project_id is null or btrim(p_project_id) = '' then
    return;
  end if;

  update public.projects as projects
  set amount_received = coalesce(
    (
      select round(sum(coalesce(investments.amount, investments.amount_usdc, transactions.amount, transactions.amount_usdc, 0))::numeric, 2)
      from public.investments as investments
      left join public.transactions as transactions
        on transactions.id::text = investments.transaction_id::text
      where investments.project_id::text = projects.id::text
        and coalesce(investments.status, transactions.status, 'submitted') in ('submitted', 'confirmed')
    ),
    0
  )
  where projects.id::text = p_project_id;
end;
$$;

create or replace function public.sync_project_amount_received_from_investments()
returns trigger
language plpgsql
as $$
declare
  project_key text := coalesce(new.project_id::text, old.project_id::text);
begin
  perform public.refresh_project_amount_received(project_key);
  return coalesce(new, old);
end;
$$;

drop trigger if exists investments_sync_project_amount_received on public.investments;
create trigger investments_sync_project_amount_received
after insert or update or delete on public.investments
for each row execute function public.sync_project_amount_received_from_investments();

update public.projects
set amount_received = coalesce(
  (
    select round(sum(coalesce(investments.amount, investments.amount_usdc, transactions.amount, transactions.amount_usdc, 0))::numeric, 2)
    from public.investments as investments
    left join public.transactions as transactions
      on transactions.id::text = investments.transaction_id::text
    where investments.project_id::text = public.projects.id::text
      and coalesce(investments.status, transactions.status, 'submitted') in ('submitted', 'confirmed')
  ),
  0
);

create or replace function public.backfill_internal_ledger_entries()
returns void
language sql
as $$
with investment_source as (
  select
    investments.id::text as reference_id,
    investments.project_id::text as project_id,
    investments.investor_user_id as investor_user_id,
    investments.entrepreneur_user_id as entrepreneur_user_id,
    round(coalesce(investments.amount, investments.amount_usdc, transactions.amount, transactions.amount_usdc, 0)::numeric, 6) as amount_value,
    coalesce(projects.currency, investments.metadata->>'currency', 'USD') as currency_value,
    coalesce(projects.business_name, projects.title, investments.metadata->>'project_title', 'Investment contract') as project_title
  from public.investments as investments
  left join public.transactions as transactions
    on transactions.id::text = investments.transaction_id::text
  left join public.projects as projects
    on projects.id::text = investments.project_id::text
  where coalesce(investments.status, transactions.status, 'submitted') in ('submitted', 'confirmed')
    and coalesce(investments.amount, investments.amount_usdc, transactions.amount, transactions.amount_usdc, 0) > 0
),
investment_entries as (
  select
    'investment'::text as entry_type,
    'investment'::text as reference_type,
    investment_source.reference_id,
    null::text as credit_id,
    investment_source.project_id,
    investment_source.investor_user_id as primary_user_id,
    investment_source.entrepreneur_user_id as counterparty_user_id,
    array_remove(array[investment_source.investor_user_id, investment_source.entrepreneur_user_id], null)::text[] as affected_user_ids,
    investment_source.amount_value as amount,
    investment_source.currency_value as currency,
    jsonb_build_array(
      jsonb_build_object(
        'user_id', investment_source.investor_user_id,
        'account', 'available_balance',
        'side', 'debit',
        'amount', investment_source.amount_value,
        'note', 'Investor funded the contract.'
      ),
      jsonb_build_object(
        'user_id', investment_source.investor_user_id,
        'account', 'invested_balance',
        'side', 'credit',
        'amount', investment_source.amount_value,
        'note', 'Capital moved into active contract exposure.'
      ),
      jsonb_build_object(
        'user_id', investment_source.entrepreneur_user_id,
        'account', 'pending_balance',
        'side', 'credit',
        'amount', investment_source.amount_value,
        'note', 'Entrepreneur obligation registered in backend ledger.'
      ),
      jsonb_build_object(
        'user_id', null,
        'account', 'platform_internal',
        'side', 'debit',
        'amount', investment_source.amount_value,
        'note', 'Internal settlement leg.'
      )
    ) as postings,
    jsonb_build_array(
      jsonb_build_object('user_id', investment_source.investor_user_id, 'role', 'investor'),
      jsonb_build_object('user_id', investment_source.entrepreneur_user_id, 'role', 'entrepreneur')
    ) as participants,
    (
      case
        when investment_source.investor_user_id is not null then
          jsonb_build_object(
            investment_source.investor_user_id,
            jsonb_build_object(
              'available_balance', -investment_source.amount_value,
              'withdrawable_balance', -investment_source.amount_value,
              'invested_balance', investment_source.amount_value
            )
          )
        else '{}'::jsonb
      end
      ||
      case
        when investment_source.entrepreneur_user_id is not null then
          jsonb_build_object(
            investment_source.entrepreneur_user_id,
            jsonb_build_object('pending_balance', investment_source.amount_value)
          )
        else '{}'::jsonb
      end
    ) as balance_deltas,
    jsonb_build_object(
      'project_title', investment_source.project_title,
      'contract_engine', 'backend_internal_ledger'
    ) as metadata
  from investment_source
),
repayment_source as (
  select
    repayments.id::text as reference_id,
    repayments.project_id::text as project_id,
    repayments.investor_user_id as investor_user_id,
    repayments.entrepreneur_user_id as entrepreneur_user_id,
    round(coalesce(repayments.amount, repayments.amount_usdc, 0)::numeric, 6) as amount_value,
    coalesce(projects.currency, repayments.metadata->>'currency', 'USD') as currency_value,
    coalesce(projects.business_name, projects.title, repayments.metadata->>'project_title', 'Investment contract') as project_title
  from public.repayments as repayments
  left join public.projects as projects
    on projects.id::text = repayments.project_id::text
  where coalesce(repayments.status, 'submitted') in ('submitted', 'confirmed')
    and coalesce(repayments.amount, repayments.amount_usdc, 0) > 0
),
repayment_entries as (
  select
    'repayment'::text as entry_type,
    'repayment'::text as reference_type,
    repayment_source.reference_id,
    null::text as credit_id,
    repayment_source.project_id,
    repayment_source.entrepreneur_user_id as primary_user_id,
    repayment_source.investor_user_id as counterparty_user_id,
    array_remove(array[repayment_source.investor_user_id, repayment_source.entrepreneur_user_id], null)::text[] as affected_user_ids,
    repayment_source.amount_value as amount,
    repayment_source.currency_value as currency,
    jsonb_build_array(
      jsonb_build_object(
        'user_id', repayment_source.entrepreneur_user_id,
        'account', 'pending_balance',
        'side', 'debit',
        'amount', repayment_source.amount_value,
        'note', 'Repayment reduced the entrepreneur outstanding obligation.'
      ),
      jsonb_build_object(
        'user_id', repayment_source.investor_user_id,
        'account', 'available_balance',
        'side', 'credit',
        'amount', repayment_source.amount_value,
        'note', 'Investor received a backend-settled repayment.'
      ),
      jsonb_build_object(
        'user_id', repayment_source.investor_user_id,
        'account', 'withdrawable_balance',
        'side', 'credit',
        'amount', repayment_source.amount_value,
        'note', 'Repayment is available for withdrawal.'
      ),
      jsonb_build_object(
        'user_id', null,
        'account', 'platform_internal',
        'side', 'debit',
        'amount', repayment_source.amount_value,
        'note', 'Internal settlement leg.'
      )
    ) as postings,
    jsonb_build_array(
      jsonb_build_object('user_id', repayment_source.investor_user_id, 'role', 'investor'),
      jsonb_build_object('user_id', repayment_source.entrepreneur_user_id, 'role', 'entrepreneur')
    ) as participants,
    (
      case
        when repayment_source.investor_user_id is not null then
          jsonb_build_object(
            repayment_source.investor_user_id,
            jsonb_build_object(
              'available_balance', repayment_source.amount_value,
              'withdrawable_balance', repayment_source.amount_value
            )
          )
        else '{}'::jsonb
      end
      ||
      case
        when repayment_source.entrepreneur_user_id is not null then
          jsonb_build_object(
            repayment_source.entrepreneur_user_id,
            jsonb_build_object('pending_balance', -repayment_source.amount_value)
          )
        else '{}'::jsonb
      end
    ) as balance_deltas,
    jsonb_build_object(
      'project_title', repayment_source.project_title,
      'contract_engine', 'backend_internal_ledger'
    ) as metadata
  from repayment_source
),
ledger_entries as (
  select * from investment_entries
  union all
  select * from repayment_entries
)
insert into public.internal_ledger_entries (
  entry_type,
  reference_type,
  reference_id,
  credit_id,
  project_id,
  primary_user_id,
  counterparty_user_id,
  affected_user_ids,
  amount,
  currency,
  postings,
  participants,
  balance_deltas,
  metadata
)
select
  entry_type,
  reference_type,
  reference_id,
  credit_id,
  project_id,
  primary_user_id,
  counterparty_user_id,
  affected_user_ids,
  amount,
  currency,
  postings,
  participants,
  balance_deltas,
  metadata
from ledger_entries
on conflict (reference_type, reference_id) do update set
  credit_id = excluded.credit_id,
  project_id = excluded.project_id,
  primary_user_id = excluded.primary_user_id,
  counterparty_user_id = excluded.counterparty_user_id,
  affected_user_ids = excluded.affected_user_ids,
  amount = excluded.amount,
  currency = excluded.currency,
  postings = excluded.postings,
  participants = excluded.participants,
  balance_deltas = excluded.balance_deltas,
  metadata = excluded.metadata;
$$;

create or replace function public.refresh_internal_account_balance_for_user(
  p_user_id text
)
returns void
language plpgsql
as $$
declare
  available_balance numeric(20, 6);
  locked_balance numeric(20, 6);
  pending_balance numeric(20, 6);
  withdrawable_balance numeric(20, 6);
  invested_balance numeric(20, 6);
begin
  if p_user_id is null or btrim(p_user_id) = '' then
    return;
  end if;

  select
    coalesce(round(sum(coalesce((entry.balance_deltas -> p_user_id ->> 'available_balance')::numeric, 0))::numeric, 6), 0),
    coalesce(round(sum(coalesce((entry.balance_deltas -> p_user_id ->> 'locked_balance')::numeric, 0))::numeric, 6), 0),
    coalesce(round(sum(coalesce((entry.balance_deltas -> p_user_id ->> 'pending_balance')::numeric, 0))::numeric, 6), 0),
    coalesce(round(sum(coalesce((entry.balance_deltas -> p_user_id ->> 'withdrawable_balance')::numeric, 0))::numeric, 6), 0),
    coalesce(round(sum(coalesce((entry.balance_deltas -> p_user_id ->> 'invested_balance')::numeric, 0))::numeric, 6), 0)
  into available_balance, locked_balance, pending_balance, withdrawable_balance, invested_balance
  from public.internal_ledger_entries as entry
  where entry.affected_user_ids @> array[p_user_id]::text[];

  insert into public.internal_account_balances (
    user_id,
    currency,
    available_balance,
    locked_balance,
    pending_balance,
    withdrawable_balance,
    invested_balance,
    movement_history,
    related_users
  )
  values (
    p_user_id,
    'USD',
    available_balance,
    locked_balance,
    pending_balance,
    withdrawable_balance,
    invested_balance,
    '[]'::jsonb,
    '[]'::jsonb
  )
  on conflict (user_id) do update set
    currency = excluded.currency,
    available_balance = excluded.available_balance,
    locked_balance = excluded.locked_balance,
    pending_balance = excluded.pending_balance,
    withdrawable_balance = excluded.withdrawable_balance,
    invested_balance = excluded.invested_balance,
    updated_at = now();
end;
$$;

create or replace function public.sync_internal_account_balances_from_ledger()
returns trigger
language plpgsql
as $$
declare
  user_id text;
  user_ids text[];
begin
  if tg_op = 'DELETE' then
    user_ids := coalesce(old.affected_user_ids, '{}'::text[]);
  elsif tg_op = 'INSERT' then
    user_ids := coalesce(new.affected_user_ids, '{}'::text[]);
  else
    user_ids := array(
      select distinct value
      from unnest(coalesce(old.affected_user_ids, '{}'::text[]) || coalesce(new.affected_user_ids, '{}'::text[])) as value
    );
  end if;

  foreach user_id in array user_ids loop
    perform public.refresh_internal_account_balance_for_user(user_id);
  end loop;

  return coalesce(new, old);
end;
$$;

drop trigger if exists internal_ledger_entries_refresh_account_balances on public.internal_ledger_entries;
create trigger internal_ledger_entries_refresh_account_balances
after insert or update or delete on public.internal_ledger_entries
for each row execute function public.sync_internal_account_balances_from_ledger();

select public.backfill_internal_ledger_entries();

do $$
declare
  user_row record;
begin
  for user_row in
    select distinct user_id
    from public.internal_ledger_entries as entry
    cross join lateral unnest(entry.affected_user_ids) as user_id
  loop
    perform public.refresh_internal_account_balance_for_user(user_row.user_id);
  end loop;
end $$;
