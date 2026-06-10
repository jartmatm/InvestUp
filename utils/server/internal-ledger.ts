import { getAmountValue, runWithAmountColumnFallback } from '@/lib/supabase-amount';
import {
  normalizePaymentScheduleRecord,
} from '@/lib/payment-schedule';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';
import { refreshCurrentUserWalletBalance } from '@/utils/server/wallet-balance';
import { normalizeProjectFilter } from '@/utils/projects/shared';
import {
  buildInvestmentLedgerEntry,
  buildRepaymentLedgerEntry,
  type InternalLedgerEntryInsert,
} from '@/utils/server/internal-ledger-events';
import { syncInternalLedgerProjection } from '@/utils/server/internal-ledger-projections';
import type {
  InternalAccountBalance,
  InternalLedgerEntry,
  InternalLedgerParticipant,
  InternalLedgerProjectionPayload,
  InternalLedgerPosting,
  InternalMovementHistoryItem,
  InternalRelatedUser,
  InternalUserBalanceDelta,
} from '@/utils/internal-ledger/types';

const INTERNAL_CONTRACT_SELECT =
  'id,credit_id,project_id,investor_user_id,entrepreneur_user_id,annual_interest_rate,monthly_interest_rate,installment_count,current_installment_number,schedule_start_date,next_due_date,original_principal,total_paid_amount,current_installment_amount,outstanding_balance,status,tx_hash,payment_plan,metadata,contract_title,contract_summary,currency,total_contract_value,updated_at';

const INTERNAL_LEDGER_ENTRY_SELECT =
  'id,created_at,event_key,source_table,source_id,lifecycle_stage,wallet_action_id,entry_type,reference_type,reference_id,credit_id,project_id,primary_user_id,counterparty_user_id,affected_user_ids,amount,currency,postings,participants,balance_deltas,projection_payload,metadata';

const asText = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const asNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asJsonObject = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const roundAmount = (value: number) => Number(value.toFixed(6));

const isMissingRelationError = (error: { code?: string | null; message?: string | null } | null) =>
  error?.code === '42P01' || error?.message?.toLowerCase().includes('does not exist') || false;

const uniqueTextValues = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

type InternalContractSummary = {
  id: string;
  credit_id: string;
  project_id: string;
  investor_user_id: string | null;
  entrepreneur_user_id: string | null;
  outstanding_balance: number;
  status: string | null;
};

type ProjectContext = {
  id: string;
  title: string | null;
  business_name: string | null;
  description: string | null;
  currency: string | null;
};

const normalizeInternalContractSummary = (
  row: Record<string, unknown>
): InternalContractSummary => ({
  id: String(row.id ?? ''),
  credit_id: String(row.credit_id ?? ''),
  project_id: String(row.project_id ?? ''),
  investor_user_id: asText(row.investor_user_id),
  entrepreneur_user_id: asText(row.entrepreneur_user_id),
  outstanding_balance: asNumber(row.outstanding_balance),
  status: asText(row.status),
});

const normalizeInternalLedgerEntry = (row: Record<string, unknown>): InternalLedgerEntry => ({
  id: String(row.id ?? ''),
  created_at: asText(row.created_at) ?? new Date().toISOString(),
  event_key:
    asText(row.event_key) ??
    `${asText(row.source_table) ?? asText(row.reference_type) ?? 'ledger'}:${asText(row.source_id) ?? asText(row.reference_id) ?? String(row.id ?? '')}:confirmed`,
  source_table: asText(row.source_table) ?? asText(row.reference_type) ?? 'ledger',
  source_id: asText(row.source_id) ?? asText(row.reference_id) ?? String(row.id ?? ''),
  lifecycle_stage:
    (asText(row.lifecycle_stage) as InternalLedgerEntry['lifecycle_stage']) ?? 'confirmed',
  wallet_action_id: asText(row.wallet_action_id),
  entry_type: (asText(row.entry_type) as InternalLedgerEntry['entry_type']) ?? 'adjustment',
  reference_type: asText(row.reference_type),
  reference_id: asText(row.reference_id),
  credit_id: asText(row.credit_id),
  project_id: asText(row.project_id),
  primary_user_id: asText(row.primary_user_id),
  counterparty_user_id: asText(row.counterparty_user_id),
  affected_user_ids: Array.isArray(row.affected_user_ids)
    ? row.affected_user_ids.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      )
    : [],
  amount: asNumber(row.amount),
  currency: asText(row.currency) ?? 'USD',
  postings: Array.isArray(row.postings)
    ? row.postings
        .map((item) => {
          const source = asJsonObject(item);
          if (!source) return null;
          return {
            user_id: asText(source.user_id),
            account:
              (asText(source.account) as InternalLedgerPosting['account'] | null) ??
              'platform_internal',
            side:
              (asText(source.side) as InternalLedgerPosting['side'] | null) ?? 'credit',
            amount: asNumber(source.amount),
            note: asText(source.note),
          };
        })
        .filter((item): item is InternalLedgerPosting => Boolean(item))
    : [],
  participants: Array.isArray(row.participants)
    ? row.participants
        .map((item) => {
          const source = asJsonObject(item);
          if (!source) return null;
          return {
            user_id: asText(source.user_id),
            role:
              (asText(source.role) as InternalLedgerParticipant['role'] | null) ?? 'platform',
          };
        })
        .filter((item): item is InternalLedgerParticipant => Boolean(item))
    : [],
  balance_deltas: asJsonObject(row.balance_deltas) as Record<string, InternalUserBalanceDelta> ?? {},
  projection_payload:
    (asJsonObject(row.projection_payload) as InternalLedgerProjectionPayload) ?? {
      table: 'transactions',
      conflict_target: 'id',
      row: {},
    },
  metadata: asJsonObject(row.metadata),
});

const getUserDeltaForEntry = (
  entry: InternalLedgerEntry,
  userId: string
): InternalUserBalanceDelta => {
  const candidate = entry.balance_deltas?.[userId];
  return candidate && typeof candidate === 'object' ? candidate : {};
};

const toMovementHistoryItem = (
  entry: InternalLedgerEntry,
  userId: string
): InternalMovementHistoryItem => ({
  entry_id: entry.id,
  entry_type: entry.entry_type,
  created_at: entry.created_at,
  amount: entry.amount,
  currency: entry.currency,
  credit_id: entry.credit_id,
  project_id: entry.project_id,
  counterparty_user_id:
    entry.primary_user_id === userId ? entry.counterparty_user_id : entry.primary_user_id,
  delta: getUserDeltaForEntry(entry, userId),
});

async function loadProjectContextMap(projectIds: string[]) {
  const supabase = getSupabaseAdminClient();
  const map = new Map<string, ProjectContext>();

  if (projectIds.length === 0) {
    return map;
  }

  const normalizedIds = projectIds.map((projectId) => normalizeProjectFilter(projectId));
  const { data, error } = await supabase
    .from('projects')
    .select('id,title,business_name,description,currency')
    .in('id', normalizedIds);

  if (error) {
    return map;
  }

  ((data ?? []) as Array<Record<string, unknown>>).forEach((row) => {
    const id = String(row.id ?? '');
    map.set(id, {
      id,
      title: asText(row.title),
      business_name: asText(row.business_name),
      description: asText(row.description),
      currency: asText(row.currency),
    });
  });

  return map;
}

async function loadUserPaymentSchedules(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('payment_schedule')
    .select(
      'id,credit_id,project_id,investor_user_id,entrepreneur_user_id,annual_interest_rate,monthly_interest_rate,installment_count,current_installment_number,schedule_start_date,next_due_date,original_principal,total_paid_amount,current_installment_amount,outstanding_balance,status,tx_hash,payment_plan,metadata'
    )
    .or(`investor_user_id.eq.${userId},entrepreneur_user_id.eq.${userId}`)
    .order('next_due_date', { ascending: true, nullsFirst: false });

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map(normalizePaymentScheduleRecord);
}

export async function syncInternalContractsForUser(userId: string) {
  const supabase = getSupabaseAdminClient();
  const schedules = await loadUserPaymentSchedules(userId);
  if (schedules.length === 0) {
    return [];
  }

  const projectMap = await loadProjectContextMap(
    Array.from(new Set(schedules.map((row) => row.project_id).filter(Boolean)))
  );

  for (const schedule of schedules) {
    const project = projectMap.get(String(schedule.project_id));
    const contractTitle =
      project?.business_name ||
      project?.title ||
      asText(schedule.metadata?.project_title) ||
      'Investment contract';
    const contractSummary =
      project?.description?.trim() ||
      'Backend contract generated from internal ledger records.';
    const totalContractValue = roundAmount(
      schedule.payment_plan.reduce((total, row) => total + asNumber(row.fixed_payment), 0)
    );

    const { error } = await supabase.from('internal_contracts').upsert(
      {
        credit_id: schedule.credit_id,
        project_id: String(schedule.project_id),
        investor_user_id: schedule.investor_user_id,
        entrepreneur_user_id: schedule.entrepreneur_user_id,
        contract_title: contractTitle,
        contract_summary: contractSummary,
        currency: project?.currency || asText(schedule.metadata?.currency) || 'USD',
        annual_interest_rate: schedule.annual_interest_rate,
        monthly_interest_rate: schedule.monthly_interest_rate,
        installment_count: schedule.installment_count,
        current_installment_number: schedule.current_installment_number,
        schedule_start_date: schedule.schedule_start_date,
        next_due_date: schedule.next_due_date,
        original_principal: schedule.original_principal,
        total_paid_amount: schedule.total_paid_amount,
        current_installment_amount: schedule.current_installment_amount,
        outstanding_balance: schedule.outstanding_balance,
        total_contract_value: totalContractValue,
        status: schedule.status ?? 'pending',
        tx_hash: schedule.tx_hash,
        payment_plan: schedule.payment_plan,
        metadata: {
          ...(schedule.metadata ?? {}),
          project_title: contractTitle,
          project_description: project?.description ?? null,
          currency: project?.currency || asText(schedule.metadata?.currency) || 'USD',
          contract_engine: 'backend_internal_ledger',
        },
      },
      { onConflict: 'credit_id' }
    );

    if (error && !isMissingRelationError(error)) {
      throw new Error(error.message);
    }
  }

  return schedules;
}

async function loadInternalContractsForUser(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('internal_contracts')
    .select(INTERNAL_CONTRACT_SELECT)
    .or(`investor_user_id.eq.${userId},entrepreneur_user_id.eq.${userId}`);

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map(normalizeInternalContractSummary);
}

async function upsertInternalLedgerEntry(payload: InternalLedgerEntryInsert) {
  await recordInternalLedgerEvent(payload);
}

export async function recordInternalLedgerEvent(payload: InternalLedgerEntryInsert) {
  const supabase = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from('internal_ledger_entries')
    .select(INTERNAL_LEDGER_ENTRY_SELECT)
    .eq('event_key', payload.event_key)
    .maybeSingle();

  if (existingError && !isMissingRelationError(existingError)) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const normalizedExisting = normalizeInternalLedgerEntry(existing as Record<string, unknown>);

    if (!normalizedExisting.credit_id && payload.credit_id) {
      const { data: updated, error: updateError } = await supabase
        .from('internal_ledger_entries')
        .update({ credit_id: payload.credit_id })
        .eq('event_key', payload.event_key)
        .select(INTERNAL_LEDGER_ENTRY_SELECT)
        .maybeSingle();

      if (updateError) {
        throw new Error(updateError.message);
      }

      const normalizedUpdated = updated
        ? normalizeInternalLedgerEntry(updated as Record<string, unknown>)
        : normalizedExisting;
      await syncInternalLedgerProjection(supabase, normalizedUpdated);
      return normalizedUpdated;
    }

    await syncInternalLedgerProjection(supabase, normalizedExisting);
    return normalizedExisting;
  }

  const { data, error } = await supabase
    .from('internal_ledger_entries')
    .insert(payload)
    .select(INTERNAL_LEDGER_ENTRY_SELECT)
    .maybeSingle();

  if (error) {
    const duplicate =
      error.code === '23505' ||
      error.message?.toLowerCase().includes('duplicate key') ||
      error.message?.toLowerCase().includes('already exists');

    if (!duplicate) {
      throw new Error(error.message);
    }

    const { data: fallbackExisting, error: fallbackError } = await supabase
      .from('internal_ledger_entries')
      .select(INTERNAL_LEDGER_ENTRY_SELECT)
      .eq('event_key', payload.event_key)
      .maybeSingle();

    if (fallbackError) {
      throw new Error(fallbackError.message);
    }

    if (!fallbackExisting) {
      throw new Error('Could not persist internal ledger event.');
    }

    const normalizedFallback = normalizeInternalLedgerEntry(
      fallbackExisting as Record<string, unknown>
    );
    await syncInternalLedgerProjection(supabase, normalizedFallback);
    return normalizedFallback;
  }

  if (!data) {
    throw new Error('Could not persist internal ledger event.');
  }

  const normalized = normalizeInternalLedgerEntry(data as Record<string, unknown>);
  await syncInternalLedgerProjection(supabase, normalized);
  return normalized;
}

function buildInvestmentEntryPayload({
  row,
  contractCreditId,
  project,
}: {
  row: Record<string, unknown>;
  contractCreditId: string | null;
  project: ProjectContext | undefined;
}): InternalLedgerEntryInsert | null {
  const investorUserId = asText(row.investor_user_id);
  const entrepreneurUserId = asText(row.entrepreneur_user_id);
  const amount = roundAmount(Number(getAmountValue(row) ?? 0));
  if (amount <= 0 || !investorUserId) return null;
  return buildInvestmentLedgerEntry({
    amount,
    creditId: contractCreditId,
    entrepreneurUserId,
    fromWallet: asText(row.from_wallet) ?? '',
    interestRateEa: asNumber(row.interest_rate_ea),
    metadata: asJsonObject(row.metadata),
    projectedReturnUsdc: asNumber(row.projected_return_usdc),
    projectedTotalUsdc: asNumber(row.projected_total_usdc),
    projectId: String(row.project_id ?? ''),
    projectTitle: project?.business_name || project?.title || null,
    sourceId: String(row.id ?? ''),
    status:
      (asText(row.status) as 'submitted' | 'confirmed' | 'failed' | null) ?? 'confirmed',
    termMonths: asNumber(row.term_months),
    toWallet: asText(row.to_wallet) ?? '',
    transactionId: asText(row.transaction_id),
    txHash: asText(row.tx_hash) ?? String(row.id ?? ''),
    userId: investorUserId,
    currency: project?.currency || asText(asJsonObject(row.metadata)?.currency) || 'USD',
  });
}

function buildRepaymentEntryPayload({
  row,
  contractCreditId,
  project,
}: {
  row: Record<string, unknown>;
  contractCreditId: string | null;
  project: ProjectContext | undefined;
}): InternalLedgerEntryInsert | null {
  const investorUserId = asText(row.investor_user_id);
  const entrepreneurUserId = asText(row.entrepreneur_user_id);
  const amount = roundAmount(Number(getAmountValue(row) ?? 0));
  if (amount <= 0 || !entrepreneurUserId) return null;
  return buildRepaymentLedgerEntry({
    amount,
    creditId: contractCreditId,
    entrepreneurUserId: entrepreneurUserId ?? '',
    fromWallet: asText(row.from_wallet) ?? '',
    metadata: asJsonObject(row.metadata),
    projectId: asText(row.project_id) ?? undefined,
    projectTitle: project?.business_name || project?.title || null,
    sourceId: String(row.id ?? ''),
    status:
      (asText(row.status) as 'submitted' | 'confirmed' | 'failed' | null) ?? 'confirmed',
    toWallet: asText(row.to_wallet) ?? '',
    transactionId: asText(row.transaction_id),
    txHash: asText(row.tx_hash) ?? String(row.id ?? ''),
    userId: entrepreneurUserId ?? '',
    investorUserId,
    currency: project?.currency || asText(asJsonObject(row.metadata)?.currency) || 'USD',
  });
}

export async function syncInternalEntriesForUser(userId: string) {
  const supabase = getSupabaseAdminClient();
  await syncInternalContractsForUser(userId);
  const contracts = await loadInternalContractsForUser(userId);
  const contractMap = new Map<string, string>();
  contracts.forEach((contract) => {
    if (contract.investor_user_id) {
      contractMap.set(`${contract.project_id}:${contract.investor_user_id}`, contract.credit_id);
    }
  });

  const { data: investmentRows, error: investmentError } = await runWithAmountColumnFallback(
    (amountColumn) =>
      supabase
        .from('investments')
        .select(
          `id,project_id,investor_user_id,entrepreneur_user_id,status,metadata,${amountColumn},amount_usdc`
        )
        .or(`investor_user_id.eq.${userId},entrepreneur_user_id.eq.${userId}`)
  );

  if (investmentError && !isMissingRelationError(investmentError)) {
    throw new Error(investmentError.message);
  }

  const { data: repaymentRows, error: repaymentError } = await runWithAmountColumnFallback(
    (amountColumn) =>
      supabase
        .from('repayments')
        .select(
          `id,project_id,investor_user_id,entrepreneur_user_id,status,metadata,${amountColumn},amount_usdc`
        )
        .or(`investor_user_id.eq.${userId},entrepreneur_user_id.eq.${userId}`)
  );

  if (repaymentError && !isMissingRelationError(repaymentError)) {
    throw new Error(repaymentError.message);
  }

  const projectIds = uniqueTextValues([
    ...(((investmentRows ?? []) as Array<Record<string, unknown>>).map((row) =>
      String(row.project_id ?? '')
    )),
    ...(((repaymentRows ?? []) as Array<Record<string, unknown>>).map((row) =>
      String(row.project_id ?? '')
    )),
  ]);
  const projectMap = await loadProjectContextMap(projectIds);

  for (const investmentRow of (investmentRows ?? []) as Array<Record<string, unknown>>) {
    const investorUserId = asText(investmentRow.investor_user_id);
    const projectId = String(investmentRow.project_id ?? '');
    const payload = buildInvestmentEntryPayload({
      row: investmentRow,
      contractCreditId: investorUserId ? contractMap.get(`${projectId}:${investorUserId}`) ?? null : null,
      project: projectMap.get(projectId),
    });

    if (payload) {
      await upsertInternalLedgerEntry(payload);
    }
  }

  for (const repaymentRow of (repaymentRows ?? []) as Array<Record<string, unknown>>) {
    const investorUserId = asText(repaymentRow.investor_user_id);
    const projectId = String(repaymentRow.project_id ?? '');
    const payload = buildRepaymentEntryPayload({
      row: repaymentRow,
      contractCreditId: investorUserId ? contractMap.get(`${projectId}:${investorUserId}`) ?? null : null,
      project: projectMap.get(projectId),
    });

    if (payload) {
      await upsertInternalLedgerEntry(payload);
    }
  }
}

async function loadInternalEntriesForUser(userId: string, limit = 50, creditId?: string | null) {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from('internal_ledger_entries')
    .select(INTERNAL_LEDGER_ENTRY_SELECT)
    .contains('affected_user_ids', [userId])
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));

  if (creditId) {
    query = query.eq('credit_id', creditId);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map(normalizeInternalLedgerEntry);
}

function buildRelatedUsers(entries: InternalLedgerEntry[], userId: string): InternalRelatedUser[] {
  const related = new Map<string, InternalRelatedUser>();

  entries.forEach((entry) => {
    entry.participants.forEach((participant) => {
      if (!participant.user_id || participant.user_id === userId) return;
      const existing = related.get(participant.user_id);
      if (existing) {
        existing.total_entries += 1;
        if (!existing.last_entry_at || entry.created_at > existing.last_entry_at) {
          existing.last_entry_at = entry.created_at;
        }
        if (!existing.role && participant.role) {
          existing.role = participant.role;
        }
        return;
      }

      related.set(participant.user_id, {
        user_id: participant.user_id,
        role: participant.role ?? null,
        total_entries: 1,
        last_entry_at: entry.created_at,
      });
    });
  });

  return Array.from(related.values()).sort((left, right) =>
    (right.last_entry_at ?? '').localeCompare(left.last_entry_at ?? '')
  );
}

export async function syncInternalBalanceForUser(userId: string) {
  const supabase = getSupabaseAdminClient();
  await syncInternalEntriesForUser(userId);

  const [entries, walletSyncResult] = await Promise.all([
    loadInternalEntriesForUser(userId, 50),
    refreshCurrentUserWalletBalance(userId).catch(async (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown wallet balance error.';
      console.error('Error refreshing raw wallet balance:', message);
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('available_wallet_usd')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        throw new Error(userError.message);
      }

      return {
        available_wallet_usd: roundAmount(asNumber((userRow as { available_wallet_usd?: unknown } | null)?.available_wallet_usd)),
        wallet_address: null,
        synced: false,
      };
    }),
  ]);

  const walletBalance = roundAmount(asNumber(walletSyncResult.available_wallet_usd));

  const { data: storedBalanceRow, error: storedBalanceError } = await supabase
    .from('internal_account_balances')
    .select('currency,available_balance,locked_balance,pending_balance,withdrawable_balance,invested_balance')
    .eq('user_id', userId)
    .maybeSingle();

  if (storedBalanceError) {
    throw new Error(storedBalanceError.message);
  }

  const fallbackBalances = entries.reduce(
    (totals, entry) => {
      const delta = getUserDeltaForEntry(entry, userId);
      totals.available_balance = roundAmount(
        totals.available_balance + asNumber(delta.available_balance)
      );
      totals.locked_balance = roundAmount(totals.locked_balance + asNumber(delta.locked_balance));
      totals.pending_balance = roundAmount(totals.pending_balance + asNumber(delta.pending_balance));
      totals.withdrawable_balance = roundAmount(
        totals.withdrawable_balance + asNumber(delta.withdrawable_balance)
      );
      totals.invested_balance = roundAmount(
        totals.invested_balance + asNumber(delta.invested_balance)
      );
      return totals;
    },
    {
      available_balance: 0,
      locked_balance: 0,
      pending_balance: 0,
      withdrawable_balance: 0,
      invested_balance: 0,
    }
  );

  const lockedBalance = storedBalanceRow
    ? roundAmount(asNumber(storedBalanceRow.locked_balance))
    : fallbackBalances.locked_balance;
  const pendingBalance = storedBalanceRow
    ? roundAmount(asNumber(storedBalanceRow.pending_balance))
    : fallbackBalances.pending_balance;
  const withdrawableBalance = storedBalanceRow
    ? roundAmount(asNumber(storedBalanceRow.withdrawable_balance))
    : fallbackBalances.withdrawable_balance;
  const investedBalance = storedBalanceRow
    ? roundAmount(asNumber(storedBalanceRow.invested_balance))
    : fallbackBalances.invested_balance;
  const availableBalance = roundAmount(
    Math.max(walletBalance - lockedBalance - pendingBalance, 0)
  );

  const movementHistory = entries
    .slice(0, 25)
    .map((entry) => toMovementHistoryItem(entry, userId));
  const relatedUsers = buildRelatedUsers(entries, userId);

  const balancePayload: InternalAccountBalance = {
    user_id: userId,
    currency: storedBalanceRow?.currency ?? 'USD',
    available_balance: availableBalance,
    locked_balance: lockedBalance,
    pending_balance: pendingBalance,
    withdrawable_balance: withdrawableBalance,
    invested_balance: investedBalance,
    movement_history: movementHistory,
    related_users: relatedUsers,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('internal_account_balances').upsert(
    {
      user_id: balancePayload.user_id,
      currency: balancePayload.currency,
      available_balance: balancePayload.available_balance,
      locked_balance: balancePayload.locked_balance,
      pending_balance: balancePayload.pending_balance,
      withdrawable_balance: balancePayload.withdrawable_balance,
      invested_balance: balancePayload.invested_balance,
      movement_history: balancePayload.movement_history,
      related_users: balancePayload.related_users,
    },
    { onConflict: 'user_id' }
  );

  if (error && !isMissingRelationError(error)) {
    throw new Error(error.message);
  }

  return balancePayload;
}

export async function getCurrentUserInternalBalance(userId: string) {
  return syncInternalBalanceForUser(userId);
}

export async function getCurrentUserInternalEntries(
  userId: string,
  options?: { creditId?: string | null; limit?: number }
) {
  await syncInternalEntriesForUser(userId);
  return loadInternalEntriesForUser(userId, options?.limit ?? 25, options?.creditId ?? null);
}

export async function syncInternalLedgerForUsers(userIds: Array<string | null | undefined>) {
  for (const userId of uniqueTextValues(userIds)) {
    await syncInternalBalanceForUser(userId);
  }
}
