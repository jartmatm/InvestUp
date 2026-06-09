import { randomUUID } from 'node:crypto';
import type {
  InternalLedgerEntry,
  InternalLedgerEntryType,
  InternalLedgerLifecycleStage,
  InternalLedgerParticipant,
  InternalLedgerPosting,
  InternalLedgerProjectionPayload,
  InternalLedgerProjectionTable,
  InternalUserBalanceDelta,
} from '@/utils/internal-ledger/types';
import type {
  TransactionMovementType,
  TransactionStatus,
} from '@/utils/transactions/current-user';

export type InternalLedgerEntryInsert = Omit<InternalLedgerEntry, 'id' | 'created_at'>;

export type BuildTransactionLedgerEntryInput = {
  amount: number;
  counterpartyUserId?: string | null;
  currency?: string | null;
  fromWallet: string;
  metadata?: Record<string, unknown> | null;
  movementType: TransactionMovementType;
  projectId?: string | null;
  role?: string | null;
  sourceId?: string | null;
  status?: TransactionStatus | 'completed';
  toWallet: string;
  txHash: string;
  userId: string;
};

export type BuildInvestmentLedgerEntryInput = {
  amount: number;
  currency?: string | null;
  creditId?: string | null;
  entrepreneurUserId?: string | null;
  fromWallet: string;
  interestRateEa?: number | null;
  metadata?: Record<string, unknown> | null;
  projectedReturnUsdc?: number | null;
  projectedTotalUsdc?: number | null;
  projectId: string;
  projectTitle?: string | null;
  sourceId?: string | null;
  status?: 'submitted' | 'confirmed' | 'failed';
  termMonths?: number | null;
  toWallet: string;
  transactionId?: string | null;
  txHash: string;
  userId: string;
};

export type BuildRepaymentLedgerEntryInput = {
  amount: number;
  currency?: string | null;
  creditId?: string | null;
  entrepreneurUserId: string;
  fromWallet: string;
  metadata?: Record<string, unknown> | null;
  projectId?: string | null;
  projectTitle?: string | null;
  sourceId?: string | null;
  status?: 'submitted' | 'confirmed' | 'failed';
  toWallet: string;
  transactionId?: string | null;
  txHash: string;
  userId: string;
  investorUserId?: string | null;
};

export type BuildWithdrawalLedgerEntryInput = {
  amount: number;
  bankAccountType?: string | null;
  bankName?: string | null;
  currency?: string | null;
  destinationWallet: string;
  identificationNumber?: string | null;
  identificationType?: string | null;
  metadata?: Record<string, unknown> | null;
  payoutMethod: 'bank' | 'breve';
  phoneNumber?: string | null;
  breveKey?: string | null;
  requestStatus: 'awaiting_transfer' | 'submitted' | 'processing' | 'processed' | 'failed';
  role?: string | null;
  sourceId?: string | null;
  sourceWallet?: string | null;
  txHash?: string | null;
  userId: string;
};

export type BuildFundingReleaseLedgerEntryInput = {
  amount: number;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
  projectId: string;
  projectTitle?: string | null;
  sourceId?: string | null;
  userId: string;
};

export type BuildAdjustmentLedgerEntryInput = {
  amount: number;
  balanceDeltas: Record<string, InternalUserBalanceDelta>;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
  projectId?: string | null;
  sourceId?: string | null;
  sourceTable: string;
  userId?: string | null;
};

const DEFAULT_CURRENCY = 'USD';
const DEFAULT_CHAIN = 'polygon';

const roundAmount = (value: number) => Number(value.toFixed(6));

const asText = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const uniqueTextValues = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const stageFromStatus = (
  status: TransactionStatus | 'completed' | 'submitted' | 'confirmed' | 'failed' | undefined
): InternalLedgerLifecycleStage => {
  if (status === 'failed') return 'failed';
  if (status === 'submitted') return 'initiated';
  return 'confirmed';
};

const entryTypeFromWithdrawalStatus = (
  status: BuildWithdrawalLedgerEntryInput['requestStatus']
): InternalLedgerEntryType => {
  if (status === 'failed') return 'withdrawal_failed';
  if (status === 'processed') return 'withdrawal_settled';
  if (status === 'submitted' || status === 'processing') return 'withdrawal_submitted';
  return 'withdrawal_requested';
};

const withdrawalStageFromStatus = (
  status: BuildWithdrawalLedgerEntryInput['requestStatus']
): InternalLedgerLifecycleStage => {
  if (status === 'failed') return 'failed';
  if (status === 'processed') return 'confirmed';
  if (status === 'submitted' || status === 'processing') return 'submitted';
  return 'initiated';
};

const buildProjectionPayload = (
  table: InternalLedgerProjectionTable,
  row: Record<string, unknown>,
  conflictTarget = 'id',
  operation: 'upsert' | 'delete' = 'upsert'
): InternalLedgerProjectionPayload => ({
  table,
  conflict_target: conflictTarget,
  row,
  operation,
});

const buildLedgerEntry = (input: Omit<InternalLedgerEntryInsert, 'projection_payload'> & {
  projection_payload: InternalLedgerProjectionPayload;
}): InternalLedgerEntryInsert => input;

const buildTransactionBalanceDeltas = (
  input: BuildTransactionLedgerEntryInput & { lifecycleStage: InternalLedgerLifecycleStage }
): Record<string, InternalUserBalanceDelta> => {
  const amount = roundAmount(input.amount);
  const deltas: Record<string, InternalUserBalanceDelta> = {};

  if (input.movementType === 'investment' || input.movementType === 'repayment') {
    return deltas;
  }

  if (input.movementType === 'buy') {
    if (input.lifecycleStage === 'failed') {
      return deltas;
    }

    if (input.lifecycleStage === 'initiated') {
      deltas[input.userId] = {
        pending_balance: amount,
      };
      return deltas;
    }

    deltas[input.userId] = {
      available_balance: amount,
      withdrawable_balance: amount,
    };
    return deltas;
  }

  if (input.movementType === 'withdrawal') {
    if (input.lifecycleStage === 'initiated' || input.lifecycleStage === 'submitted') {
      deltas[input.userId] = {
        available_balance: -amount,
        withdrawable_balance: -amount,
        pending_balance: amount,
      };
      return deltas;
    }

    if (input.lifecycleStage === 'failed') {
      deltas[input.userId] = {
        available_balance: amount,
        withdrawable_balance: amount,
        pending_balance: -amount,
      };
      return deltas;
    }

    deltas[input.userId] = {
      pending_balance: -amount,
    };
    return deltas;
  }

  if (input.lifecycleStage === 'failed') {
    return deltas;
  }

  const recipientId = asText(input.counterpartyUserId);
  if (input.lifecycleStage === 'initiated' || input.lifecycleStage === 'submitted') {
    deltas[input.userId] = {
      available_balance: -amount,
      withdrawable_balance: -amount,
      pending_balance: amount,
    };

    if (recipientId) {
      deltas[recipientId] = {
        pending_balance: amount,
      };
    }

    return deltas;
  }

  deltas[input.userId] = {
    available_balance: -amount,
    withdrawable_balance: -amount,
  };

  if (recipientId) {
    deltas[recipientId] = {
      available_balance: amount,
      withdrawable_balance: amount,
    };
  }

  return deltas;
};

export function buildTransactionLedgerEntry(
  input: BuildTransactionLedgerEntryInput
): InternalLedgerEntryInsert {
  const sourceId = input.sourceId || randomUUID();
  const lifecycleStage = stageFromStatus(input.status);
  const amount = roundAmount(input.amount);
  const movementType =
    input.movementType === 'withdrawal' && lifecycleStage === 'failed'
      ? 'withdrawal_failed'
      : input.movementType === 'withdrawal' && lifecycleStage === 'initiated'
        ? 'withdrawal_requested'
        : input.movementType === 'withdrawal' && lifecycleStage === 'submitted'
          ? 'withdrawal_submitted'
      : input.movementType === 'withdrawal' && lifecycleStage === 'confirmed'
        ? 'withdrawal_submitted'
        : input.movementType;
  const entryType = movementType as InternalLedgerEntryType;
  const balanceDeltas = buildTransactionBalanceDeltas({ ...input, lifecycleStage });
  const primaryDelta = balanceDeltas[input.userId];
  const primaryBalanceDelta = primaryDelta?.available_balance ?? primaryDelta?.pending_balance ?? amount;
  const affectedUserIds = uniqueTextValues([
    input.userId,
    input.counterpartyUserId ?? null,
  ]);

  return buildLedgerEntry({
    event_key: `transactions:${input.txHash}:${lifecycleStage}`,
    source_table: 'transactions',
    source_id: sourceId,
    lifecycle_stage: lifecycleStage,
    wallet_action_id: input.txHash,
    entry_type: entryType,
    reference_type: 'transactions',
    reference_id: input.txHash,
    credit_id: null,
    project_id: input.projectId ?? null,
    primary_user_id: input.userId,
    counterparty_user_id: input.counterpartyUserId ?? null,
    affected_user_ids: affectedUserIds,
    amount,
    currency: input.currency?.trim() || DEFAULT_CURRENCY,
    postings: [
      {
        user_id: input.userId,
        account: 'available_balance',
        side: primaryBalanceDelta < 0 ? 'debit' : 'credit',
        amount: Math.abs(primaryBalanceDelta),
        note: 'Public transaction ledger projection.',
      } as InternalLedgerPosting,
    ].filter(Boolean),
    participants: [
      { user_id: input.userId, role: (input.role as InternalLedgerParticipant['role']) ?? 'platform' },
      input.counterpartyUserId
        ? {
            user_id: input.counterpartyUserId,
            role: 'platform',
          }
        : null,
    ].filter(Boolean) as InternalLedgerParticipant[],
    balance_deltas: balanceDeltas,
    projection_payload: buildProjectionPayload('transactions', {
      id: sourceId,
      user_id: input.userId,
      role: input.role ?? null,
      movement_type: input.movementType,
      status: input.status === 'completed' ? 'confirmed' : input.status ?? 'confirmed',
      chain: DEFAULT_CHAIN,
      tx_hash: input.txHash,
      from_wallet: input.fromWallet,
      to_wallet: input.toWallet,
      amount_usdc: amount,
      metadata: {
        app: 'investapp-web',
        currency: input.currency?.trim() || DEFAULT_CURRENCY,
        ...(input.metadata ?? {}),
      },
    }),
    metadata: {
      app: 'investapp-web',
      currency: input.currency?.trim() || DEFAULT_CURRENCY,
      ...(input.metadata ?? {}),
    },
  });
}

export function buildInvestmentLedgerEntry(
  input: BuildInvestmentLedgerEntryInput
): InternalLedgerEntryInsert {
  const sourceId = input.sourceId || randomUUID();
  const amount = roundAmount(input.amount);
  const lifecycleStage: InternalLedgerLifecycleStage =
    input.status === 'failed' ? 'failed' : input.status === 'submitted' ? 'initiated' : 'confirmed';
  const balanceDeltas: Record<string, InternalUserBalanceDelta> = {};

  if (input.status !== 'failed') {
    balanceDeltas[input.userId] = {
      available_balance: -amount,
      withdrawable_balance: -amount,
      invested_balance: amount,
    };

    if (input.entrepreneurUserId) {
      balanceDeltas[input.entrepreneurUserId] = {
        locked_balance: amount,
      };
    }
  }

  const affectedUserIds = uniqueTextValues([input.userId, input.entrepreneurUserId ?? null]);

  return buildLedgerEntry({
    event_key: `investments:${input.txHash}:${lifecycleStage}`,
    source_table: 'investments',
    source_id: sourceId,
    lifecycle_stage: lifecycleStage,
    wallet_action_id: input.txHash,
    entry_type: 'investment',
    reference_type: 'investments',
    reference_id: input.txHash,
    credit_id: input.creditId ?? null,
    project_id: input.projectId,
    primary_user_id: input.userId,
    counterparty_user_id: input.entrepreneurUserId ?? null,
    affected_user_ids: affectedUserIds,
    amount,
    currency: input.currency?.trim() || DEFAULT_CURRENCY,
    postings: [],
    participants: [
      { user_id: input.userId, role: 'investor' },
      input.entrepreneurUserId ? { user_id: input.entrepreneurUserId, role: 'entrepreneur' } : null,
    ].filter(Boolean) as InternalLedgerParticipant[],
    balance_deltas: balanceDeltas,
    projection_payload: buildProjectionPayload('investments', {
      id: sourceId,
      transaction_id: input.transactionId ?? null,
      investor_user_id: input.userId,
      entrepreneur_user_id: input.entrepreneurUserId ?? null,
      project_id: input.projectId,
      project_title: input.projectTitle ?? null,
      tx_hash: input.txHash,
      from_wallet: input.fromWallet,
      to_wallet: input.toWallet,
      amount_usdc: amount,
      interest_rate_ea: input.interestRateEa ?? null,
      term_months: input.termMonths ?? null,
      projected_return_usdc: input.projectedReturnUsdc ?? null,
      projected_total_usdc: input.projectedTotalUsdc ?? null,
      status: input.status ?? 'confirmed',
      metadata: {
        app: 'investapp-web',
        currency: input.currency?.trim() || DEFAULT_CURRENCY,
        ...(input.metadata ?? {}),
      },
    }),
    metadata: {
      app: 'investapp-web',
      currency: input.currency?.trim() || DEFAULT_CURRENCY,
      ...(input.metadata ?? {}),
    },
  });
}

export function buildRepaymentLedgerEntry(
  input: BuildRepaymentLedgerEntryInput
): InternalLedgerEntryInsert {
  const sourceId = input.sourceId || randomUUID();
  const amount = roundAmount(input.amount);
  const lifecycleStage: InternalLedgerLifecycleStage =
    input.status === 'failed' ? 'failed' : input.status === 'submitted' ? 'initiated' : 'confirmed';
  const balanceDeltas: Record<string, InternalUserBalanceDelta> = {};

  if (input.status !== 'failed') {
    balanceDeltas[input.entrepreneurUserId] = {
      available_balance: -amount,
      withdrawable_balance: -amount,
    };

    if (input.investorUserId) {
      balanceDeltas[input.investorUserId] = {
        available_balance: amount,
        withdrawable_balance: amount,
        invested_balance: -amount,
      };
    }
  }

  const affectedUserIds = uniqueTextValues([input.investorUserId ?? null, input.entrepreneurUserId]);

  return buildLedgerEntry({
    event_key: `repayments:${input.txHash}:${lifecycleStage}`,
    source_table: 'repayments',
    source_id: sourceId,
    lifecycle_stage: lifecycleStage,
    wallet_action_id: input.txHash,
    entry_type: 'repayment',
    reference_type: 'repayments',
    reference_id: input.txHash,
    credit_id: input.creditId ?? null,
    project_id: input.projectId ?? null,
    primary_user_id: input.entrepreneurUserId,
    counterparty_user_id: input.investorUserId ?? null,
    affected_user_ids: affectedUserIds,
    amount,
    currency: input.currency?.trim() || DEFAULT_CURRENCY,
    postings: [],
    participants: [
      { user_id: input.investorUserId ?? null, role: 'investor' },
      { user_id: input.entrepreneurUserId, role: 'entrepreneur' },
    ].filter(Boolean) as InternalLedgerParticipant[],
    balance_deltas: balanceDeltas,
    projection_payload: buildProjectionPayload('repayments', {
      id: sourceId,
      transaction_id: input.transactionId ?? null,
      entrepreneur_user_id: input.entrepreneurUserId,
      investor_user_id: input.investorUserId ?? null,
      tx_hash: input.txHash,
      from_wallet: input.fromWallet,
      to_wallet: input.toWallet,
      amount: amount,
      amount_usdc: amount,
      status: input.status ?? 'confirmed',
      metadata: {
        app: 'investapp-web',
        currency: input.currency?.trim() || DEFAULT_CURRENCY,
        ...(input.metadata ?? {}),
      },
    }),
    metadata: {
      app: 'investapp-web',
      currency: input.currency?.trim() || DEFAULT_CURRENCY,
      ...(input.metadata ?? {}),
    },
  });
}

export function buildWithdrawalLedgerEntry(
  input: BuildWithdrawalLedgerEntryInput
): InternalLedgerEntryInsert {
  const sourceId = input.sourceId || randomUUID();
  const amount = roundAmount(input.amount);
  const entryType = entryTypeFromWithdrawalStatus(input.requestStatus);
  const lifecycleStage = withdrawalStageFromStatus(input.requestStatus);
  const balanceDeltas: Record<string, InternalUserBalanceDelta> = {};

  if (input.requestStatus === 'failed') {
    balanceDeltas[input.userId] = {
      available_balance: amount,
      withdrawable_balance: amount,
      pending_balance: -amount,
    };
  } else if (input.requestStatus === 'processed') {
    balanceDeltas[input.userId] = {
      pending_balance: -amount,
    };
  } else if (input.requestStatus === 'submitted' || input.requestStatus === 'processing') {
    balanceDeltas[input.userId] = {};
  } else {
    balanceDeltas[input.userId] = {
      available_balance: -amount,
      withdrawable_balance: -amount,
      pending_balance: amount,
    };
  }

  return buildLedgerEntry({
    event_key: `withdrawals:${sourceId}:${lifecycleStage}`,
    source_table: 'withdraw_TEMP',
    source_id: sourceId,
    lifecycle_stage: lifecycleStage,
    wallet_action_id: input.txHash ?? null,
    entry_type: entryType,
    reference_type: 'withdraw_TEMP',
    reference_id: sourceId,
    credit_id: null,
    project_id: null,
    primary_user_id: input.userId,
    counterparty_user_id: null,
    affected_user_ids: [input.userId],
    amount,
    currency: input.currency?.trim() || DEFAULT_CURRENCY,
    postings: [],
    participants: [{ user_id: input.userId, role: 'platform' }],
    balance_deltas: balanceDeltas,
    projection_payload: buildProjectionPayload('withdraw_TEMP', {
      id: sourceId,
      user_id: input.userId,
      role: input.role ?? null,
      source_wallet: input.sourceWallet ?? null,
      destination_wallet: input.destinationWallet,
      payout_method: input.payoutMethod,
      bank_name: input.bankName ?? null,
      bank_account_number: input.metadata?.bank_account_number ?? null,
      bank_account_type: input.bankAccountType ?? null,
      identification_type: input.identificationType ?? null,
      identification_number: input.identificationNumber ?? null,
      phone_number: input.phoneNumber ?? null,
      breve_key: input.breveKey ?? null,
      amount_usdc: amount,
      onchain_tx_hash: input.txHash ?? null,
      request_status: input.requestStatus,
      metadata: {
        app: 'investapp-web',
        currency: input.currency?.trim() || DEFAULT_CURRENCY,
        ...(input.metadata ?? {}),
      },
    }),
    metadata: {
      app: 'investapp-web',
      currency: input.currency?.trim() || DEFAULT_CURRENCY,
      ...(input.metadata ?? {}),
    },
  });
}

export function buildFundingReleaseLedgerEntry(
  input: BuildFundingReleaseLedgerEntryInput
): InternalLedgerEntryInsert {
  const sourceId = input.sourceId || randomUUID();
  const amount = roundAmount(input.amount);

  return buildLedgerEntry({
    event_key: `projects:${input.projectId}:funding_released`,
    source_table: 'projects',
    source_id: sourceId,
    lifecycle_stage: 'confirmed',
    wallet_action_id: null,
    entry_type: 'funding_released',
    reference_type: 'projects',
    reference_id: input.projectId,
    credit_id: null,
    project_id: input.projectId,
    primary_user_id: input.userId,
    counterparty_user_id: null,
    affected_user_ids: [input.userId],
    amount,
    currency: input.currency?.trim() || DEFAULT_CURRENCY,
    postings: [],
    participants: [{ user_id: input.userId, role: 'entrepreneur' }],
    balance_deltas: {
      [input.userId]: {
        locked_balance: -amount,
        available_balance: amount,
        withdrawable_balance: amount,
      },
    },
    projection_payload: buildProjectionPayload('projects', {
      id: input.projectId,
      amount_received: amount,
      status: 'financing_in_progress',
      metadata: {
        app: 'investapp-web',
        currency: input.currency?.trim() || DEFAULT_CURRENCY,
        ...(input.metadata ?? {}),
      },
    }),
    metadata: {
      app: 'investapp-web',
      currency: input.currency?.trim() || DEFAULT_CURRENCY,
      ...(input.metadata ?? {}),
    },
  });
}

export function buildAdjustmentLedgerEntry(
  input: BuildAdjustmentLedgerEntryInput
): InternalLedgerEntryInsert {
  const sourceId = input.sourceId || randomUUID();
  const amount = roundAmount(input.amount);

  return buildLedgerEntry({
    event_key: `${input.sourceTable}:${sourceId}:adjustment`,
    source_table: input.sourceTable,
    source_id: sourceId,
    lifecycle_stage: 'confirmed',
    wallet_action_id: null,
    entry_type: 'adjustment',
    reference_type: input.sourceTable,
    reference_id: input.sourceId ?? sourceId,
    credit_id: null,
    project_id: input.projectId ?? null,
    primary_user_id: input.userId ?? null,
    counterparty_user_id: null,
    affected_user_ids: uniqueTextValues(Object.keys(input.balanceDeltas)),
    amount,
    currency: input.currency?.trim() || DEFAULT_CURRENCY,
    postings: [],
    participants: input.userId ? [{ user_id: input.userId, role: 'platform' }] : [],
    balance_deltas: input.balanceDeltas,
    projection_payload: buildProjectionPayload(
      input.sourceTable as InternalLedgerProjectionTable,
      {
        id: sourceId,
        ...(input.metadata ?? {}),
      }
    ),
    metadata: {
      app: 'investapp-web',
      currency: input.currency?.trim() || DEFAULT_CURRENCY,
      ...(input.metadata ?? {}),
    },
  });
}
