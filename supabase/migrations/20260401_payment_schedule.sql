-- 2026-04-01
-- Payment schedule / amortization ledger for entrepreneur-to-investor repayments.

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

create table if not exists public.payment_schedule (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  credit_id text not null,
  investment_id text not null,
  investment_uuid uuid,
  project_id bigint not null references public.projects(id) on delete cascade,
  investor_user_id text not null,
  entrepreneur_user_id text not null,

  annual_interest_rate numeric(10, 6) not null default 0,
  monthly_interest_rate numeric(12, 8) not null default 0,
  interest_percent numeric(10, 6) not null default 0,

  installment_count integer not null,
  installment_number integer not null,
  schedule_start_date date,
  due_date date not null,

  original_principal numeric(20, 6) not null default 0,
  opening_balance numeric(20, 6) not null default 0,
  fixed_payment numeric(20, 6) not null default 0,
  interest_amount numeric(20, 6) not null default 0,
  principal_amount numeric(20, 6) not null default 0,
  remaining_balance numeric(20, 6) not null default 0,
  paid_amount numeric(20, 6) not null default 0,

  status text not null default 'pending',
  repayment_transaction_id text,
  tx_hash text,

  payment_plan jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  constraint payment_schedule_status_check
    check (status in ('pending', 'paid', 'late', 'partial')),
  constraint payment_schedule_installment_check
    check (
      installment_count > 0
      and installment_number > 0
      and installment_number <= installment_count
    )
);

create index if not exists payment_schedule_project_id_idx
  on public.payment_schedule (project_id);

create index if not exists payment_schedule_investor_user_id_idx
  on public.payment_schedule (investor_user_id);

create index if not exists payment_schedule_entrepreneur_user_id_idx
  on public.payment_schedule (entrepreneur_user_id);

create index if not exists payment_schedule_due_date_idx
  on public.payment_schedule (due_date);

create unique index if not exists payment_schedule_credit_installment_uidx
  on public.payment_schedule (credit_id, installment_number);

drop trigger if exists payment_schedule_set_updated_at on public.payment_schedule;
create trigger payment_schedule_set_updated_at
before update on public.payment_schedule
for each row execute function public.set_updated_at();

create or replace function public.refresh_payment_schedule_statuses(
  p_credit_id text default null,
  p_project_id bigint default null,
  p_investor_user_id text default null
)
returns void
language plpgsql
as $$
begin
  update public.payment_schedule
  set status = case
    when coalesce(paid_amount, 0) >= fixed_payment - 0.000001 then 'paid'
    when coalesce(paid_amount, 0) > 0 and due_date < current_date then 'late'
    when coalesce(paid_amount, 0) > 0 then 'partial'
    when due_date < current_date then 'late'
    else 'pending'
  end
  where (p_credit_id is null or credit_id = p_credit_id)
    and (p_project_id is null or project_id = p_project_id)
    and (p_investor_user_id is null or investor_user_id = p_investor_user_id);
end;
$$;

create or replace function public.refresh_payment_schedule_plan_json(
  p_credit_id text
)
returns void
language plpgsql
as $$
declare
  schedule_json jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'installment_number', installment_number,
        'due_date', due_date,
        'fixed_payment', fixed_payment,
        'interest_percent', interest_percent,
        'interest_amount', interest_amount,
        'principal_amount', principal_amount,
        'remaining_balance', remaining_balance,
        'paid_amount', paid_amount,
        'status', status,
        'tx_hash', tx_hash
      )
      order by installment_number
    ),
    '[]'::jsonb
  )
  into schedule_json
  from public.payment_schedule
  where credit_id = p_credit_id;

  update public.payment_schedule
  set payment_plan = schedule_json
  where credit_id = p_credit_id;
end;
$$;

create or replace function public.generate_payment_schedule_for_investment(
  p_investment_id text
)
returns void
language plpgsql
as $$
declare
  investment_row public.investments%rowtype;
  project_row public.projects%rowtype;
  principal numeric(20, 6);
  annual_rate numeric(10, 6);
  monthly_rate numeric(18, 12);
  monthly_rate_percent numeric(10, 6);
  installment_total integer;
  schedule_start date;
  fixed_installment numeric(20, 6);
  opening_balance_value numeric(20, 6);
  interest_value numeric(20, 6);
  principal_value numeric(20, 6);
  remaining_balance_value numeric(20, 6);
  current_due_date date;
  current_installment integer;
  credit_key text;
  entrepreneur_id text;
  currency_value text;
begin
  select *
  into investment_row
  from public.investments
  where id::text = p_investment_id
  limit 1;

  if not found or investment_row.project_id is null then
    return;
  end if;

  select *
  into project_row
  from public.projects
  where id = investment_row.project_id
  limit 1;

  if not found then
    return;
  end if;

  principal := round(coalesce(investment_row.amount, investment_row.amount_usdc, 0)::numeric, 6);
  if principal <= 0 then
    return;
  end if;

  annual_rate := round(coalesce(project_row.interest_rate, project_row.interest_rate_ea, 0)::numeric, 6);
  installment_total := greatest(1, coalesce(project_row.installment_count, project_row.term_months, 1));
  schedule_start := coalesce(project_row.publication_end_date, current_date);
  entrepreneur_id := coalesce(project_row.owner_user_id, project_row.owner_id);
  currency_value := coalesce(project_row.currency, 'USD');
  credit_key := coalesce(investment_row.uuid::text, investment_row.id::text);

  monthly_rate :=
    case
      when annual_rate > 0 then power(1 + annual_rate / 100.0, 1.0 / 12.0) - 1
      else 0
    end;
  monthly_rate_percent := round((monthly_rate * 100)::numeric, 6);

  if monthly_rate > 0 then
    fixed_installment := round(
      (principal * monthly_rate::numeric)
      / (1 - power(1 + monthly_rate::numeric, -installment_total)),
      6
    );
  else
    fixed_installment := round(principal / installment_total, 6);
  end if;

  delete from public.payment_schedule
  where credit_id = credit_key;

  opening_balance_value := principal;

  for current_installment in 1..installment_total loop
    interest_value := round(opening_balance_value * monthly_rate::numeric, 6);
    principal_value := round(fixed_installment - interest_value, 6);

    if current_installment = installment_total or principal_value > opening_balance_value then
      principal_value := opening_balance_value;
      fixed_installment := round(principal_value + interest_value, 6);
    end if;

    remaining_balance_value := round(greatest(opening_balance_value - principal_value, 0), 6);
    current_due_date := (schedule_start + make_interval(months => current_installment))::date;

    insert into public.payment_schedule (
      credit_id,
      investment_id,
      investment_uuid,
      project_id,
      investor_user_id,
      entrepreneur_user_id,
      annual_interest_rate,
      monthly_interest_rate,
      interest_percent,
      installment_count,
      installment_number,
      schedule_start_date,
      due_date,
      original_principal,
      opening_balance,
      fixed_payment,
      interest_amount,
      principal_amount,
      remaining_balance,
      paid_amount,
      status,
      metadata
    )
    values (
      credit_key,
      investment_row.id::text,
      investment_row.uuid,
      project_row.id,
      investment_row.investor_id,
      entrepreneur_id,
      annual_rate,
      round(monthly_rate::numeric, 8),
      monthly_rate_percent,
      installment_total,
      current_installment,
      schedule_start,
      current_due_date,
      principal,
      opening_balance_value,
      fixed_installment,
      interest_value,
      principal_value,
      remaining_balance_value,
      0,
      'pending',
      jsonb_build_object(
        'project_title', coalesce(project_row.business_name, project_row.title),
        'currency', currency_value,
        'generated_from', 'investment_insert_trigger'
      )
    );

    opening_balance_value := remaining_balance_value;
  end loop;

  perform public.refresh_payment_schedule_statuses(credit_key, project_row.id, investment_row.investor_id);
  perform public.refresh_payment_schedule_plan_json(credit_key);
end;
$$;

create or replace function public.on_investment_created_generate_payment_schedule()
returns trigger
language plpgsql
as $$
begin
  perform public.generate_payment_schedule_for_investment(new.id::text);
  return new;
end;
$$;

drop trigger if exists investments_generate_payment_schedule on public.investments;
create trigger investments_generate_payment_schedule
after insert on public.investments
for each row execute function public.on_investment_created_generate_payment_schedule();

create or replace function public.apply_repayment_to_payment_schedule()
returns trigger
language plpgsql
as $$
declare
  amount_to_apply numeric(20, 6);
  schedule_row record;
  remaining_due numeric(20, 6);
  amount_for_row numeric(20, 6);
  credit_row record;
begin
  amount_to_apply := round(coalesce(new.amount, new.amount_usdc, new.paid_amount, 0)::numeric, 6);

  if amount_to_apply <= 0 or new.project_id is null or new.investor_user_id is null then
    return new;
  end if;

  perform public.refresh_payment_schedule_statuses(null, new.project_id, new.investor_user_id);

  for schedule_row in
    select id, fixed_payment, paid_amount
    from public.payment_schedule
    where project_id = new.project_id
      and investor_user_id = new.investor_user_id
      and status <> 'paid'
    order by installment_number
  loop
    remaining_due := round(greatest(coalesce(schedule_row.fixed_payment, 0) - coalesce(schedule_row.paid_amount, 0), 0), 6);

    if remaining_due <= 0 then
      continue;
    end if;

    amount_for_row := round(least(amount_to_apply, remaining_due), 6);

    update public.payment_schedule
    set paid_amount = round(coalesce(paid_amount, 0) + amount_for_row, 6),
        repayment_transaction_id = coalesce(new.transaction_id::text, repayment_transaction_id),
        tx_hash = coalesce(new.tx_hash, tx_hash)
    where id = schedule_row.id;

    amount_to_apply := round(amount_to_apply - amount_for_row, 6);

    exit when amount_to_apply <= 0;
  end loop;

  perform public.refresh_payment_schedule_statuses(null, new.project_id, new.investor_user_id);

  for credit_row in
    select distinct credit_id
    from public.payment_schedule
    where project_id = new.project_id
      and investor_user_id = new.investor_user_id
  loop
    perform public.refresh_payment_schedule_plan_json(credit_row.credit_id);
  end loop;

  return new;
end;
$$;

drop trigger if exists repayments_apply_payment_schedule on public.repayments;
create trigger repayments_apply_payment_schedule
after insert on public.repayments
for each row execute function public.apply_repayment_to_payment_schedule();

do $$
declare
  investment_row record;
begin
  for investment_row in
    select id::text as investment_id
    from public.investments
  loop
    perform public.generate_payment_schedule_for_investment(investment_row.investment_id);
  end loop;
end;
$$;
