-- 2026-06-10
-- Ledger-first accounting: event-keyed internal ledger, public projections,
-- and balance refreshes derived exclusively from internal ledger rows.

create extension if not exists pgcrypto;

alter table if exists public.internal_ledger_entries
  add column if not exists event_key text,
  add column if not exists source_table text,
  add column if not exists source_id text,
  add column if not exists lifecycle_stage text not null default 'confirmed',
  add column if not exists wallet_action_id text,
  add column if not exists projection_payload jsonb not null default '{}'::jsonb;

with normalized_entries as (
  select
    entry.id,
    case
      when entry.reference_type in ('investment', 'investments') then 'investments'
      when entry.reference_type in ('repayment', 'repayments') then 'repayments'
      when entry.reference_type in ('withdrawal', 'withdraw_TEMP') then 'withdraw_TEMP'
      when entry.reference_type in ('transaction', 'transactions') then 'transactions'
      when entry.reference_type in ('project', 'projects') then 'projects'
      else coalesce(entry.reference_type, 'ledger')
    end as normalized_source_table,
    coalesce(entry.source_id, entry.reference_id, entry.id::text) as normalized_source_id,
    coalesce(entry.lifecycle_stage, 'confirmed') as normalized_lifecycle_stage,
    coalesce(entry.wallet_action_id, entry.reference_id, entry.id::text) as normalized_wallet_action_id,
    concat(
      case
        when entry.reference_type in ('investment', 'investments') then 'investments'
        when entry.reference_type in ('repayment', 'repayments') then 'repayments'
        when entry.reference_type in ('withdrawal', 'withdraw_TEMP') then 'withdraw_TEMP'
        when entry.reference_type in ('transaction', 'transactions') then 'transactions'
        when entry.reference_type in ('project', 'projects') then 'projects'
        else coalesce(entry.reference_type, 'ledger')
      end,
      ':',
      coalesce(entry.reference_id, entry.id::text),
      ':',
      coalesce(entry.lifecycle_stage, 'confirmed')
    ) as normalized_event_key,
    jsonb_build_object(
      'table',
      case
        when entry.reference_type in ('investment', 'investments') then 'investments'
        when entry.reference_type in ('repayment', 'repayments') then 'repayments'
        when entry.reference_type in ('withdrawal', 'withdraw_TEMP') then 'withdraw_TEMP'
        when entry.reference_type in ('transaction', 'transactions') then 'transactions'
        when entry.reference_type in ('project', 'projects') then 'projects'
        else coalesce(entry.reference_type, 'ledger')
      end,
      'conflict_target',
      'id',
      'row',
      jsonb_build_object('id', coalesce(entry.reference_id, entry.id::text))
    ) as normalized_projection_payload
  from public.internal_ledger_entries as entry
)
update public.internal_ledger_entries as entry
set
  source_table = normalized_entries.normalized_source_table,
  source_id = normalized_entries.normalized_source_id,
  lifecycle_stage = normalized_entries.normalized_lifecycle_stage,
  wallet_action_id = normalized_entries.normalized_wallet_action_id,
  event_key = normalized_entries.normalized_event_key,
  projection_payload = case
    when entry.projection_payload is null or entry.projection_payload = '{}'::jsonb
      then normalized_entries.normalized_projection_payload
    else entry.projection_payload
  end
from normalized_entries
where entry.id = normalized_entries.id;

update public.internal_ledger_entries
set
  entry_type = 'withdrawal_submitted',
  lifecycle_stage = 'submitted'
where entry_type = 'withdrawal';

alter table if exists public.internal_ledger_entries
  alter column event_key set not null,
  alter column source_table set not null,
  alter column source_id set not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'internal_ledger_entries_reference_unique'
  ) then
    alter table public.internal_ledger_entries
      drop constraint internal_ledger_entries_reference_unique;
  end if;
end $$;

alter table if exists public.internal_ledger_entries
  drop constraint if exists internal_ledger_entries_entry_type_check;

alter table if exists public.internal_ledger_entries
  add constraint internal_ledger_entries_entry_type_check
  check (
    entry_type in (
      'buy',
      'transfer',
      'investment',
      'repayment',
      'withdrawal_requested',
      'withdrawal_submitted',
      'withdrawal_settled',
      'withdrawal_failed',
      'funding_released',
      'reversal',
      'adjustment'
    )
  );

create unique index if not exists internal_ledger_entries_event_key_uniq
  on public.internal_ledger_entries (event_key);

create or replace function public.backfill_internal_ledger_entries()
returns void
language sql
as $$
with transaction_source as (
  select
    transactions.id::text as source_id,
    transactions.user_id,
    transactions.role,
    transactions.movement_type,
    transactions.status,
    transactions.tx_hash,
    transactions.from_wallet,
    transactions.to_wallet,
    coalesce(transactions.amount_usdc, transactions.amount, 0)::numeric(20, 6) as amount_value,
    coalesce(transactions.metadata, '{}'::jsonb) as metadata,
    transactions.created_at,
    to_jsonb(transactions) as projection_row
  from public.transactions as transactions
  where coalesce(transactions.amount_usdc, transactions.amount, 0) > 0
),
transaction_entries as (
  select
    concat(
      'transactions:',
      coalesce(transaction_source.tx_hash, transaction_source.source_id),
      ':',
      case
        when transaction_source.status = 'failed' then 'failed'
        when transaction_source.status = 'submitted' then 'initiated'
        else 'confirmed'
      end
    ) as event_key,
    'transactions'::text as source_table,
    transaction_source.source_id,
    case
      when transaction_source.status = 'failed' then 'failed'
      when transaction_source.status = 'submitted' then 'initiated'
      else 'confirmed'
    end as lifecycle_stage,
    transaction_source.tx_hash as wallet_action_id,
    case
      when transaction_source.movement_type = 'withdrawal' and transaction_source.status = 'failed'
        then 'withdrawal_failed'
      when transaction_source.movement_type = 'withdrawal' and transaction_source.status = 'submitted'
        then 'withdrawal_requested'
      when transaction_source.movement_type = 'withdrawal'
        then 'withdrawal_submitted'
      else transaction_source.movement_type
    end as entry_type,
    'transactions'::text as reference_type,
    coalesce(transaction_source.tx_hash, transaction_source.source_id) as reference_id,
    null::text as credit_id,
    coalesce(transaction_source.metadata->>'project_id', null) as project_id,
    transaction_source.user_id as primary_user_id,
    case
      when transaction_source.movement_type = 'transfer' then coalesce(
        transaction_source.metadata->>'receiver_user_id',
        transaction_source.metadata->>'receiverUserId'
      )
      when transaction_source.movement_type = 'investment' then coalesce(
        transaction_source.metadata->>'entrepreneur_user_id',
        transaction_source.metadata->>'entrepreneurUserId'
      )
      when transaction_source.movement_type = 'repayment' then coalesce(
        transaction_source.metadata->>'investor_user_id',
        transaction_source.metadata->>'investorUserId'
      )
      else null
    end as counterparty_user_id,
    array_remove(
      array[
        transaction_source.user_id,
        case
          when transaction_source.movement_type = 'transfer' then coalesce(
            transaction_source.metadata->>'receiver_user_id',
            transaction_source.metadata->>'receiverUserId'
          )
          when transaction_source.movement_type = 'investment' then coalesce(
            transaction_source.metadata->>'entrepreneur_user_id',
            transaction_source.metadata->>'entrepreneurUserId'
          )
          when transaction_source.movement_type = 'repayment' then coalesce(
            transaction_source.metadata->>'investor_user_id',
            transaction_source.metadata->>'investorUserId'
          )
          else null
        end
      ],
      null
    )::text[] as affected_user_ids,
    transaction_source.amount_value as amount,
    coalesce(transaction_source.metadata->>'currency', 'USDC') as currency,
    '[]'::jsonb as postings,
    jsonb_build_array(
      jsonb_build_object(
        'user_id',
        transaction_source.user_id,
        'role',
        coalesce(transaction_source.role, 'platform')
      )
    ) ||
    case
      when
        transaction_source.movement_type in ('transfer', 'investment', 'repayment')
        and (
          case
            when transaction_source.movement_type = 'transfer' then coalesce(
              transaction_source.metadata->>'receiver_user_id',
              transaction_source.metadata->>'receiverUserId'
            )
            when transaction_source.movement_type = 'investment' then coalesce(
              transaction_source.metadata->>'entrepreneur_user_id',
              transaction_source.metadata->>'entrepreneurUserId'
            )
            when transaction_source.movement_type = 'repayment' then coalesce(
              transaction_source.metadata->>'investor_user_id',
              transaction_source.metadata->>'investorUserId'
            )
            else null
          end
        ) is not null
      then jsonb_build_array(
        jsonb_build_object(
          'user_id',
          case
            when transaction_source.movement_type = 'transfer' then coalesce(
              transaction_source.metadata->>'receiver_user_id',
              transaction_source.metadata->>'receiverUserId'
            )
            when transaction_source.movement_type = 'investment' then coalesce(
              transaction_source.metadata->>'entrepreneur_user_id',
              transaction_source.metadata->>'entrepreneurUserId'
            )
            when transaction_source.movement_type = 'repayment' then coalesce(
              transaction_source.metadata->>'investor_user_id',
              transaction_source.metadata->>'investorUserId'
            )
            else null
          end,
          'role',
          case
            when transaction_source.movement_type = 'transfer' then 'platform'
            when transaction_source.movement_type = 'investment' then 'entrepreneur'
            when transaction_source.movement_type = 'repayment' then 'investor'
            else 'platform'
          end
        )
      )
      else '[]'::jsonb
    end as participants,
    case
      when transaction_source.movement_type in ('investment', 'repayment') then '{}'::jsonb
      when transaction_source.movement_type = 'buy' and transaction_source.status = 'submitted' then
        jsonb_build_object(
          transaction_source.user_id,
          jsonb_build_object('pending_balance', transaction_source.amount_value)
        )
      when transaction_source.movement_type = 'buy' and transaction_source.status = 'failed' then '{}'::jsonb
      when transaction_source.movement_type = 'buy' then
        jsonb_build_object(
          transaction_source.user_id,
          jsonb_build_object(
            'available_balance',
            transaction_source.amount_value,
            'withdrawable_balance',
            transaction_source.amount_value
          )
        )
      when transaction_source.movement_type = 'withdrawal' and transaction_source.status = 'failed' then
        jsonb_build_object(
          transaction_source.user_id,
          jsonb_build_object(
            'available_balance',
            transaction_source.amount_value,
            'withdrawable_balance',
            transaction_source.amount_value,
            'pending_balance',
            -transaction_source.amount_value
          )
        )
      when transaction_source.movement_type = 'withdrawal' and transaction_source.status = 'submitted' then
        jsonb_build_object(
          transaction_source.user_id,
          jsonb_build_object(
            'available_balance',
            -transaction_source.amount_value,
            'withdrawable_balance',
            -transaction_source.amount_value,
            'pending_balance',
            transaction_source.amount_value
          )
        )
      when transaction_source.movement_type = 'withdrawal' then
        jsonb_build_object(
          transaction_source.user_id,
          jsonb_build_object('pending_balance', -transaction_source.amount_value)
        )
      when transaction_source.status = 'submitted' then
        jsonb_build_object(
          transaction_source.user_id,
          jsonb_build_object('pending_balance', transaction_source.amount_value)
        ) ||
        case
          when
            transaction_source.movement_type = 'transfer'
            and coalesce(
              transaction_source.metadata->>'receiver_user_id',
              transaction_source.metadata->>'receiverUserId'
            ) is not null
          then jsonb_build_object(
            coalesce(
              transaction_source.metadata->>'receiver_user_id',
              transaction_source.metadata->>'receiverUserId'
            ),
            jsonb_build_object('pending_balance', transaction_source.amount_value)
          )
          else '{}'::jsonb
        end
      when transaction_source.status = 'failed' then '{}'::jsonb
      else
        jsonb_build_object(
          transaction_source.user_id,
          jsonb_build_object(
            'available_balance',
            -transaction_source.amount_value,
            'withdrawable_balance',
            -transaction_source.amount_value
          )
        ) ||
        case
          when
            transaction_source.movement_type = 'transfer'
            and coalesce(
              transaction_source.metadata->>'receiver_user_id',
              transaction_source.metadata->>'receiverUserId'
            ) is not null
          then jsonb_build_object(
            coalesce(
              transaction_source.metadata->>'receiver_user_id',
              transaction_source.metadata->>'receiverUserId'
            ),
            jsonb_build_object(
              'available_balance',
              transaction_source.amount_value,
              'withdrawable_balance',
              transaction_source.amount_value
            )
          )
          else '{}'::jsonb
        end
    end as balance_deltas,
    jsonb_build_object(
      'app',
      'investapp-web',
      'currency',
      coalesce(transaction_source.metadata->>'currency', 'USDC'),
      'movement_type',
      transaction_source.movement_type
    ) as metadata,
    transaction_source.projection_row as projection_payload
  from transaction_source
),
investment_source as (
  select
    investments.id::text as source_id,
    investments.investor_user_id,
    investments.entrepreneur_user_id,
    investments.project_id,
    investments.project_title,
    investments.status,
    investments.tx_hash,
    investments.from_wallet,
    investments.to_wallet,
    coalesce(investments.amount_usdc, investments.amount, 0)::numeric(20, 6) as amount_value,
    coalesce(investments.interest_rate_ea, null) as interest_rate_ea,
    investments.term_months,
    investments.projected_return_usdc,
    investments.projected_total_usdc,
    coalesce(investments.metadata, '{}'::jsonb) as metadata,
    coalesce(investments.tx_hash, investments.id::text) as event_identifier,
    coalesce(projects.currency, investments.metadata->>'currency', 'USD') as currency_value,
    coalesce(projects.business_name, projects.title, investments.metadata->>'project_title', 'Investment contract') as resolved_project_title,
    contracts.credit_id as credit_id,
    to_jsonb(investments) as projection_row
  from public.investments as investments
  left join public.projects as projects
    on projects.id::text = investments.project_id::text
  left join public.internal_contracts as contracts
    on contracts.project_id::text = investments.project_id::text
   and contracts.investor_user_id = investments.investor_user_id
  where coalesce(investments.amount_usdc, investments.amount, 0) > 0
),
investment_entries as (
  select
    concat(
      'investments:',
      investment_source.event_identifier,
      ':',
      case
        when investment_source.status = 'failed' then 'failed'
        when investment_source.status = 'submitted' then 'initiated'
        else 'confirmed'
      end
    ) as event_key,
    'investments'::text as source_table,
    investment_source.source_id,
    case
      when investment_source.status = 'failed' then 'failed'
      when investment_source.status = 'submitted' then 'initiated'
      else 'confirmed'
    end as lifecycle_stage,
    investment_source.tx_hash as wallet_action_id,
    'investment'::text as entry_type,
    'investments'::text as reference_type,
    coalesce(investment_source.tx_hash, investment_source.source_id) as reference_id,
    investment_source.credit_id,
    investment_source.project_id,
    investment_source.investor_user_id as primary_user_id,
    investment_source.entrepreneur_user_id as counterparty_user_id,
    array_remove(
      array[
        investment_source.investor_user_id,
        investment_source.entrepreneur_user_id
      ],
      null
    )::text[] as affected_user_ids,
    investment_source.amount_value as amount,
    coalesce(investment_source.metadata->>'currency', 'USDC') as currency,
    '[]'::jsonb as postings,
    jsonb_build_array(
      jsonb_build_object('user_id', investment_source.investor_user_id, 'role', 'investor')
    ) ||
    case
      when investment_source.entrepreneur_user_id is not null then jsonb_build_array(
        jsonb_build_object('user_id', investment_source.entrepreneur_user_id, 'role', 'entrepreneur')
      )
      else '[]'::jsonb
    end as participants,
    case
      when investment_source.status = 'failed' then '{}'::jsonb
      else
        jsonb_build_object(
          investment_source.investor_user_id,
          jsonb_build_object(
            'available_balance',
            -investment_source.amount_value,
            'withdrawable_balance',
            -investment_source.amount_value,
            'invested_balance',
            investment_source.amount_value
          )
        ) ||
        case
          when investment_source.entrepreneur_user_id is not null then jsonb_build_object(
            investment_source.entrepreneur_user_id,
            jsonb_build_object('locked_balance', investment_source.amount_value)
          )
          else '{}'::jsonb
        end
    end as balance_deltas,
    jsonb_build_object(
      'app',
      'investapp-web',
      'currency',
      coalesce(investment_source.metadata->>'currency', 'USDC'),
      'project_title',
      investment_source.resolved_project_title
    ) as metadata,
    investment_source.projection_row as projection_payload
  from investment_source
),
repayment_source as (
  select
    repayments.id::text as source_id,
    repayments.entrepreneur_user_id,
    repayments.investor_user_id,
    repayments.project_id,
    repayments.status,
    repayments.tx_hash,
    repayments.from_wallet,
    repayments.to_wallet,
    coalesce(repayments.amount_usdc, repayments.amount, 0)::numeric(20, 6) as amount_value,
    coalesce(repayments.metadata, '{}'::jsonb) as metadata,
    coalesce(repayments.tx_hash, repayments.id::text) as event_identifier,
    coalesce(projects.currency, repayments.metadata->>'currency', 'USD') as currency_value,
    coalesce(projects.business_name, projects.title, repayments.metadata->>'project_title', 'Investment contract') as resolved_project_title,
    contracts.credit_id as credit_id,
    to_jsonb(repayments) as projection_row
  from public.repayments as repayments
  left join public.projects as projects
    on projects.id::text = repayments.project_id::text
  left join public.internal_contracts as contracts
    on contracts.project_id::text = repayments.project_id::text
   and contracts.investor_user_id = repayments.investor_user_id
  where coalesce(repayments.amount_usdc, repayments.amount, 0) > 0
),
repayment_entries as (
  select
    concat(
      'repayments:',
      repayment_source.event_identifier,
      ':',
      case
        when repayment_source.status = 'failed' then 'failed'
        when repayment_source.status = 'submitted' then 'initiated'
        else 'confirmed'
      end
    ) as event_key,
    'repayments'::text as source_table,
    repayment_source.source_id,
    case
      when repayment_source.status = 'failed' then 'failed'
      when repayment_source.status = 'submitted' then 'initiated'
      else 'confirmed'
    end as lifecycle_stage,
    repayment_source.tx_hash as wallet_action_id,
    'repayment'::text as entry_type,
    'repayments'::text as reference_type,
    coalesce(repayment_source.tx_hash, repayment_source.source_id) as reference_id,
    repayment_source.credit_id,
    repayment_source.project_id,
    repayment_source.entrepreneur_user_id as primary_user_id,
    repayment_source.investor_user_id as counterparty_user_id,
    array_remove(
      array[
        repayment_source.investor_user_id,
        repayment_source.entrepreneur_user_id
      ],
      null
    )::text[] as affected_user_ids,
    repayment_source.amount_value as amount,
    coalesce(repayment_source.metadata->>'currency', 'USDC') as currency,
    '[]'::jsonb as postings,
    jsonb_build_array(
      jsonb_build_object('user_id', repayment_source.investor_user_id, 'role', 'investor'),
      jsonb_build_object('user_id', repayment_source.entrepreneur_user_id, 'role', 'entrepreneur')
    ) as participants,
    case
      when repayment_source.status = 'failed' then '{}'::jsonb
      else
        jsonb_build_object(
          repayment_source.entrepreneur_user_id,
          jsonb_build_object(
            'available_balance',
            -repayment_source.amount_value,
            'withdrawable_balance',
            -repayment_source.amount_value
          )
        ) ||
        case
          when repayment_source.investor_user_id is not null then jsonb_build_object(
            repayment_source.investor_user_id,
            jsonb_build_object(
              'available_balance',
              repayment_source.amount_value,
              'withdrawable_balance',
              repayment_source.amount_value,
              'invested_balance',
              -repayment_source.amount_value
            )
          )
          else '{}'::jsonb
        end
    end as balance_deltas,
    jsonb_build_object(
      'app',
      'investapp-web',
      'currency',
      coalesce(repayment_source.metadata->>'currency', 'USDC'),
      'project_title',
      repayment_source.resolved_project_title
    ) as metadata,
    repayment_source.projection_row as projection_payload
  from repayment_source
),
withdrawal_source as (
  select
    withdraw_temp.id::text as source_id,
    withdraw_temp.user_id,
    withdraw_temp.role,
    withdraw_temp.source_wallet,
    withdraw_temp.destination_wallet,
    withdraw_temp.payout_method,
    withdraw_temp.bank_name,
    withdraw_temp.bank_account_number,
    withdraw_temp.bank_account_type,
    withdraw_temp.identification_type,
    withdraw_temp.identification_number,
    withdraw_temp.phone_number,
    withdraw_temp.breve_key,
    withdraw_temp.amount_usdc as amount_value,
    withdraw_temp.onchain_tx_hash,
    withdraw_temp.request_status,
    coalesce(withdraw_temp.metadata, '{}'::jsonb) as metadata,
    to_jsonb(withdraw_temp) as projection_row
  from public."withdraw_TEMP" as withdraw_temp
  where coalesce(withdraw_temp.amount_usdc, 0) > 0
),
withdrawal_entries as (
  select
    concat('withdrawals:', withdrawal_source.source_id, ':initiated') as event_key,
    'withdraw_TEMP'::text as source_table,
    withdrawal_source.source_id,
    'initiated'::text as lifecycle_stage,
    null::text as wallet_action_id,
    'withdrawal_requested'::text as entry_type,
    'withdraw_TEMP'::text as reference_type,
    withdrawal_source.source_id as reference_id,
    null::text as credit_id,
    null::text as project_id,
    withdrawal_source.user_id as primary_user_id,
    null::text as counterparty_user_id,
    array[withdrawal_source.user_id]::text[] as affected_user_ids,
    withdrawal_source.amount_value as amount,
    coalesce(withdrawal_source.metadata->>'currency', 'USDC') as currency,
    '[]'::jsonb as postings,
    jsonb_build_array(
      jsonb_build_object('user_id', withdrawal_source.user_id, 'role', coalesce(withdrawal_source.role, 'platform'))
    ) as participants,
    jsonb_build_object(
      withdrawal_source.user_id,
      jsonb_build_object(
        'available_balance',
        -withdrawal_source.amount_value,
        'withdrawable_balance',
        -withdrawal_source.amount_value,
        'pending_balance',
        withdrawal_source.amount_value
      )
    ) as balance_deltas,
    jsonb_build_object(
      'app',
      'investapp-web',
      'currency',
      coalesce(withdrawal_source.metadata->>'currency', 'USDC'),
      'request_status',
      'awaiting_transfer'
    ) as metadata,
    jsonb_set(
      jsonb_set(
        withdrawal_source.projection_row,
        '{request_status}',
        to_jsonb('awaiting_transfer'::text),
        true
      ),
      '{onchain_tx_hash}',
      'null'::jsonb,
      true
    ) as projection_payload
  from withdrawal_source
  union all
  select
    concat(
      'withdrawals:',
      withdrawal_source.source_id,
      ':',
      case
        when withdrawal_source.request_status = 'failed' then 'failed'
        when withdrawal_source.request_status in ('submitted', 'processing') then 'submitted'
        when withdrawal_source.request_status = 'processed' then 'confirmed'
        else 'initiated'
      end
    ) as event_key,
    'withdraw_TEMP'::text as source_table,
    withdrawal_source.source_id,
    case
      when withdrawal_source.request_status = 'failed' then 'failed'
      when withdrawal_source.request_status in ('submitted', 'processing') then 'submitted'
      when withdrawal_source.request_status = 'processed' then 'confirmed'
      else 'initiated'
    end as lifecycle_stage,
    withdrawal_source.onchain_tx_hash as wallet_action_id,
    case
      when withdrawal_source.request_status = 'failed' then 'withdrawal_failed'
      when withdrawal_source.request_status in ('submitted', 'processing') then 'withdrawal_submitted'
      when withdrawal_source.request_status = 'processed' then 'withdrawal_settled'
      else 'withdrawal_requested'
    end as entry_type,
    'withdraw_TEMP'::text as reference_type,
    withdrawal_source.source_id as reference_id,
    null::text as credit_id,
    null::text as project_id,
    withdrawal_source.user_id as primary_user_id,
    null::text as counterparty_user_id,
    array[withdrawal_source.user_id]::text[] as affected_user_ids,
    withdrawal_source.amount_value as amount,
    coalesce(withdrawal_source.metadata->>'currency', 'USDC') as currency,
    '[]'::jsonb as postings,
    jsonb_build_array(
      jsonb_build_object('user_id', withdrawal_source.user_id, 'role', coalesce(withdrawal_source.role, 'platform'))
    ) as participants,
    case
      when withdrawal_source.request_status = 'failed' then
        jsonb_build_object(
          withdrawal_source.user_id,
          jsonb_build_object(
            'available_balance',
            withdrawal_source.amount_value,
            'withdrawable_balance',
            withdrawal_source.amount_value,
            'pending_balance',
            -withdrawal_source.amount_value
          )
        )
      when withdrawal_source.request_status = 'processed' then
        jsonb_build_object(
          withdrawal_source.user_id,
          jsonb_build_object('pending_balance', -withdrawal_source.amount_value)
        )
      else '{}'::jsonb
    end as balance_deltas,
    jsonb_build_object(
      'app',
      'investapp-web',
      'currency',
      coalesce(withdrawal_source.metadata->>'currency', 'USDC'),
      'request_status',
      withdrawal_source.request_status
    ) as metadata,
    withdrawal_source.projection_row as projection_payload
  from withdrawal_source
  where withdrawal_source.request_status in ('submitted', 'processing', 'processed', 'failed')
),
ledger_entries as (
  select * from transaction_entries
  union all
  select * from investment_entries
  union all
  select * from repayment_entries
  union all
  select * from withdrawal_entries
)
insert into public.internal_ledger_entries (
  event_key,
  source_table,
  source_id,
  lifecycle_stage,
  wallet_action_id,
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
  projection_payload,
  metadata
)
select
  event_key,
  source_table,
  source_id,
  lifecycle_stage,
  wallet_action_id,
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
  projection_payload,
  metadata
from ledger_entries
on conflict (event_key) do update set
  source_table = excluded.source_table,
  source_id = excluded.source_id,
  lifecycle_stage = excluded.lifecycle_stage,
  wallet_action_id = excluded.wallet_action_id,
  entry_type = excluded.entry_type,
  reference_type = excluded.reference_type,
  reference_id = excluded.reference_id,
  credit_id = coalesce(internal_ledger_entries.credit_id, excluded.credit_id),
  project_id = excluded.project_id,
  primary_user_id = excluded.primary_user_id,
  counterparty_user_id = excluded.counterparty_user_id,
  affected_user_ids = excluded.affected_user_ids,
  amount = excluded.amount,
  currency = excluded.currency,
  postings = excluded.postings,
  participants = excluded.participants,
  balance_deltas = excluded.balance_deltas,
  projection_payload = excluded.projection_payload,
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
