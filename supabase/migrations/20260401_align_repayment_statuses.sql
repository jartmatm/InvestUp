-- 2026-04-01
-- Align repayment statuses with the live project vocabulary.

do $$
declare
  status_udt text;
begin
  select c.udt_name
  into status_udt
  from information_schema.columns as c
  where c.table_schema = 'public'
    and c.table_name = 'repayments'
    and c.column_name = 'status';

  if status_udt = 'repayment_status' then
    begin
      alter type public.repayment_status add value if not exists 'pending';
    exception
      when duplicate_object then null;
    end;

    begin
      alter type public.repayment_status add value if not exists 'paid';
    exception
      when duplicate_object then null;
    end;

    begin
      alter type public.repayment_status add value if not exists 'late';
    exception
      when duplicate_object then null;
    end;

    begin
      alter type public.repayment_status add value if not exists 'partial';
    exception
      when duplicate_object then null;
    end;
  else
    alter table if exists public.repayments
      drop constraint if exists repayments_status_check;

    alter table if exists public.repayments
      add constraint repayments_status_check
        check (status is null or status in ('pending', 'paid', 'late', 'partial'));
  end if;
end $$;

alter table if exists public.repayments
  alter column status drop not null;

update public.repayments
set status = 'paid'
where status::text in ('confirmed', 'completed');

update public.repayments
set status = 'pending'
where status::text = 'submitted';

update public.repayments
set status = null
where status::text = 'failed';

alter table if exists public.repayments
  alter column status set default 'pending';
