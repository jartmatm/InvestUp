-- 2026-04-01
-- Compact payment schedule ledger: one row per venture + investor credit,
-- with the full amortization table stored inside payment_plan JSONB.

alter table if exists public.projects
  add column if not exists installment_count integer;

update public.projects
set installment_count = greatest(1, coalesce(installment_count, term_months, 1))
where installment_count is null
   or installment_count <= 0;

alter table if exists public.projects
  alter column installment_count set default 1;

alter table if exists public.projects
  drop constraint if exists projects_installment_count_check;

alter table if exists public.projects
  add constraint projects_installment_count_check
    check (installment_count > 0);

drop table if exists public.payment_schedule cascade;

create table public.payment_schedule (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  credit_id text not null unique,
  project_id bigint not null references public.projects(id) on delete cascade,
  investment_ids text[] not null default '{}'::text[],
  investment_uuids uuid[] not null default '{}'::uuid[],
  investor_user_id text not null,
  entrepreneur_user_id text not null,

  annual_interest_rate numeric(10, 6) not null default 0,
  monthly_interest_rate numeric(12, 8) not null default 0,
  installment_count integer not null,
  current_installment_number integer not null default 1,
  schedule_start_date date,
  next_due_date date,

  original_principal numeric(20, 6) not null default 0,
  total_paid_amount numeric(20, 6) not null default 0,
  current_installment_amount numeric(20, 6) not null default 0,
  outstanding_balance numeric(20, 6) not null default 0,

  status text not null default 'pending',
  repayment_transaction_id text,
  tx_hash text,

  payment_plan jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  constraint payment_schedule_status_check
    check (status in ('pending', 'paid', 'late', 'partial')),
  constraint payment_schedule_installment_count_check
    check (installment_count > 0)
);

create index if not exists payment_schedule_project_id_idx
  on public.payment_schedule (project_id);

create index if not exists payment_schedule_investor_user_id_idx
  on public.payment_schedule (investor_user_id);

create index if not exists payment_schedule_entrepreneur_user_id_idx
  on public.payment_schedule (entrepreneur_user_id);

create unique index if not exists payment_schedule_project_investor_uidx
  on public.payment_schedule (project_id, investor_user_id);

drop trigger if exists payment_schedule_set_updated_at on public.payment_schedule;
create trigger payment_schedule_set_updated_at
before update on public.payment_schedule
for each row execute function public.set_updated_at();

create or replace function public.payment_schedule_credit_id(
  p_project_id bigint,
  p_investor_user_id text
)
returns text
language sql
immutable
as $$
  select p_project_id::text || ':' || p_investor_user_id
$$;

create or replace function public.refresh_payment_schedule_credit(
  p_project_id bigint,
  p_investor_user_id text
)
returns void
language plpgsql
as $$
declare
  project_row public.projects%rowtype;
  principal numeric(20, 6);
  total_paid numeric(20, 6);
  annual_rate numeric(10, 6);
  monthly_rate numeric(18, 12);
  installment_total integer;
  schedule_start date;
  entrepreneur_id text;
  currency_value text;
  credit_key text;
  investment_ids_value text[];
  investment_uuids_value uuid[];
  latest_tx_hash text;
  latest_transaction_id text;
  fixed_installment numeric(20, 6);
  remaining_paid_to_apply numeric(20, 6);
  opening_balance_value numeric(20, 6);
  interest_value numeric(20, 6);
  principal_value numeric(20, 6);
  due_date_value date;
  paid_to_installment numeric(20, 6);
  principal_paid_value numeric(20, 6);
  remaining_balance_value numeric(20, 6);
  current_installment_value integer;
  current_installment_amount_value numeric(20, 6);
  next_due_date_value date;
  outstanding_balance_value numeric(20, 6);
  overall_status_value text;
  payment_plan_value jsonb := '[]'::jsonb;
  current_status_value text;
  installment_index integer;
begin
  if p_project_id is null or p_investor_user_id is null or btrim(p_investor_user_id) = '' then
    return;
  end if;

  select *
  into project_row
  from public.projects
  where id = p_project_id
  limit 1;

  if not found then
    delete from public.payment_schedule
    where project_id = p_project_id
      and investor_user_id = p_investor_user_id;
    return;
  end if;

  select
    round(coalesce(sum(coalesce(amount, amount_usdc, 0)), 0)::numeric, 6),
    coalesce(array_agg(id::text order by created_at), '{}'::text[]),
    coalesce(array_agg(uuid order by created_at), '{}'::uuid[])
  into principal, investment_ids_value, investment_uuids_value
  from public.investments
  where project_id = p_project_id
    and investor_id = p_investor_user_id
    and coalesce(status, 'submitted') in ('submitted', 'confirmed');

  if coalesce(principal, 0) <= 0 then
    delete from public.payment_schedule
    where project_id = p_project_id
      and investor_user_id = p_investor_user_id;
    return;
  end if;

  select
    round(coalesce(sum(coalesce(amount, amount_usdc, paid_amount, 0)), 0)::numeric, 6),
    (array_agg(tx_hash order by created_at desc) filter (where tx_hash is not null))[1],
    (array_agg(transaction_id::text order by created_at desc) filter (where transaction_id is not null))[1]
  into total_paid, latest_tx_hash, latest_transaction_id
  from public.repayments
  where project_id = p_project_id
    and investor_user_id = p_investor_user_id
    and coalesce(status, 'pending') in ('paid', 'partial');

  annual_rate := round(coalesce(project_row.interest_rate, project_row.interest_rate_ea, 0)::numeric, 6);
  installment_total := greatest(1, coalesce(project_row.installment_count, project_row.term_months, 1));
  schedule_start := coalesce(project_row.publication_end_date, current_date);
  entrepreneur_id := coalesce(project_row.owner_user_id, project_row.owner_id);
  currency_value := coalesce(project_row.currency, 'USD');
  credit_key := public.payment_schedule_credit_id(p_project_id, p_investor_user_id);

  monthly_rate :=
    case
      when annual_rate > 0 then power(1 + annual_rate / 100.0, 1.0 / 12.0) - 1
      else 0
    end;

  if monthly_rate > 0 then
    fixed_installment := round(
      (principal * monthly_rate::numeric)
      / (1 - power(1 + monthly_rate::numeric, -installment_total)),
      6
    );
  else
    fixed_installment := round(principal / installment_total, 6);
  end if;

  remaining_paid_to_apply := coalesce(total_paid, 0);
  opening_balance_value := principal;
  current_installment_value := installment_total;
  current_installment_amount_value := 0;
  next_due_date_value := null;
  outstanding_balance_value := principal;
  overall_status_value := 'pending';

  for installment_index in 1..installment_total loop
    interest_value := round(opening_balance_value * monthly_rate::numeric, 6);
    principal_value := round(fixed_installment - interest_value, 6);

    if installment_index = installment_total or principal_value > opening_balance_value then
      principal_value := opening_balance_value;
      fixed_installment := round(principal_value + interest_value, 6);
    end if;

    due_date_value := (schedule_start + make_interval(months => installment_index))::date;
    paid_to_installment := round(least(remaining_paid_to_apply, fixed_installment), 6);
    principal_paid_value := round(greatest(paid_to_installment - interest_value, 0), 6);
    if principal_paid_value > principal_value then
      principal_paid_value := principal_value;
    end if;

    remaining_balance_value := round(greatest(opening_balance_value - principal_paid_value, 0), 6);
    remaining_paid_to_apply := round(greatest(remaining_paid_to_apply - paid_to_installment, 0), 6);

    if paid_to_installment >= fixed_installment - 0.000001 then
      current_status_value := 'paid';
    elsif paid_to_installment > 0 and due_date_value < current_date then
      current_status_value := 'late';
    elsif paid_to_installment > 0 then
      current_status_value := 'partial';
    elsif due_date_value < current_date then
      current_status_value := 'late';
    else
      current_status_value := 'pending';
    end if;

    payment_plan_value :=
      payment_plan_value || jsonb_build_array(
        jsonb_build_object(
          'installment_number', installment_index,
          'due_date', due_date_value,
          'fixed_payment', fixed_installment,
          'interest_percent', round((monthly_rate * 100)::numeric, 6),
          'interest_amount', interest_value,
          'principal_amount', principal_value,
          'remaining_balance', remaining_balance_value,
          'paid_amount', paid_to_installment,
          'status', current_status_value,
          'tx_hash', case when paid_to_installment > 0 then latest_tx_hash else null end
        )
      );

    if current_installment_amount_value = 0 and current_status_value <> 'paid' then
      current_installment_value := installment_index;
      current_installment_amount_value := round(greatest(fixed_installment - paid_to_installment, 0), 6);
      next_due_date_value := due_date_value;
      outstanding_balance_value := remaining_balance_value;
      overall_status_value :=
        case
          when current_status_value = 'late' then 'late'
          when paid_to_installment > 0 then 'partial'
          else 'pending'
        end;
    end if;

    opening_balance_value := round(greatest(opening_balance_value - principal_value, 0), 6);
  end loop;

  if current_installment_amount_value = 0 then
    current_installment_value := installment_total;
    current_installment_amount_value := 0;
    next_due_date_value := null;
    outstanding_balance_value := 0;
    overall_status_value := 'paid';
  end if;

  insert into public.payment_schedule (
    credit_id,
    project_id,
    investment_ids,
    investment_uuids,
    investor_user_id,
    entrepreneur_user_id,
    annual_interest_rate,
    monthly_interest_rate,
    installment_count,
    current_installment_number,
    schedule_start_date,
    next_due_date,
    original_principal,
    total_paid_amount,
    current_installment_amount,
    outstanding_balance,
    status,
    repayment_transaction_id,
    tx_hash,
    payment_plan,
    metadata
  )
  values (
    credit_key,
    p_project_id,
    investment_ids_value,
    investment_uuids_value,
    p_investor_user_id,
    entrepreneur_id,
    annual_rate,
    round(monthly_rate::numeric, 8),
    installment_total,
    current_installment_value,
    schedule_start,
    next_due_date_value,
    principal,
    coalesce(total_paid, 0),
    current_installment_amount_value,
    outstanding_balance_value,
    overall_status_value,
    latest_transaction_id,
    latest_tx_hash,
    payment_plan_value,
    jsonb_build_object(
      'project_title', coalesce(project_row.business_name, project_row.title),
      'currency', currency_value,
      'generated_from', 'compact_schedule_refresh'
    )
  )
  on conflict (project_id, investor_user_id)
  do update
  set credit_id = excluded.credit_id,
      investment_ids = excluded.investment_ids,
      investment_uuids = excluded.investment_uuids,
      entrepreneur_user_id = excluded.entrepreneur_user_id,
      annual_interest_rate = excluded.annual_interest_rate,
      monthly_interest_rate = excluded.monthly_interest_rate,
      installment_count = excluded.installment_count,
      current_installment_number = excluded.current_installment_number,
      schedule_start_date = excluded.schedule_start_date,
      next_due_date = excluded.next_due_date,
      original_principal = excluded.original_principal,
      total_paid_amount = excluded.total_paid_amount,
      current_installment_amount = excluded.current_installment_amount,
      outstanding_balance = excluded.outstanding_balance,
      status = excluded.status,
      repayment_transaction_id = excluded.repayment_transaction_id,
      tx_hash = excluded.tx_hash,
      payment_plan = excluded.payment_plan,
      metadata = excluded.metadata;
end;
$$;

create or replace function public.refresh_payment_schedule_for_project(
  p_project_id bigint
)
returns void
language plpgsql
as $$
declare
  investor_row record;
begin
  for investor_row in
    select distinct investor_id
    from public.investments
    where project_id = p_project_id
      and investor_id is not null
  loop
    perform public.refresh_payment_schedule_credit(p_project_id, investor_row.investor_id);
  end loop;
end;
$$;

create or replace function public.on_investments_refresh_payment_schedule()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_payment_schedule_credit(
    coalesce(new.project_id, old.project_id),
    coalesce(new.investor_id, old.investor_id)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists investments_refresh_payment_schedule on public.investments;
create trigger investments_refresh_payment_schedule
after insert or update or delete on public.investments
for each row execute function public.on_investments_refresh_payment_schedule();

create or replace function public.on_repayments_refresh_payment_schedule()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_payment_schedule_credit(
    coalesce(new.project_id, old.project_id),
    coalesce(new.investor_user_id, old.investor_user_id)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists repayments_refresh_payment_schedule on public.repayments;
create trigger repayments_refresh_payment_schedule
after insert or update or delete on public.repayments
for each row execute function public.on_repayments_refresh_payment_schedule();

create or replace function public.on_projects_refresh_payment_schedule()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_payment_schedule_for_project(new.id);
  return new;
end;
$$;

drop trigger if exists projects_refresh_payment_schedule on public.projects;
create trigger projects_refresh_payment_schedule
after update of installment_count, interest_rate, publication_end_date, owner_user_id, owner_id on public.projects
for each row execute function public.on_projects_refresh_payment_schedule();

do $$
declare
  credit_row record;
begin
  for credit_row in
    select distinct project_id, investor_id
    from public.investments
    where project_id is not null
      and investor_id is not null
  loop
    perform public.refresh_payment_schedule_credit(credit_row.project_id, credit_row.investor_id);
  end loop;
end;
$$;
