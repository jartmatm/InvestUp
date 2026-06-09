export type InternalBalanceBuckets = {
  // Liquid balance visible on Home and spendable for new actions.
  available_balance: number;
  // Capital raised or otherwise restricted until the app releases it.
  locked_balance: number;
  // Money in flight between ledgers, wallets, or withdrawal processors.
  pending_balance: number;
  // Liquid balance that the user can request to withdraw.
  withdrawable_balance: number;
  // Outstanding capital the investor still has committed to a deal.
  invested_balance: number;
};

export type InternalLedgerEntryType =
  | 'buy'
  | 'transfer'
  | 'investment'
  | 'repayment'
  | 'withdrawal_requested'
  | 'withdrawal_submitted'
  | 'withdrawal_settled'
  | 'withdrawal_failed'
  | 'funding_released'
  | 'reversal'
  | 'adjustment';

export type InternalLedgerLifecycleStage =
  | 'initiated'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'reversed';

export type InternalLedgerProjectionTable =
  | 'transactions'
  | 'investments'
  | 'repayments'
  | 'withdraw_TEMP'
  | 'projects';

export type InternalLedgerProjectionPayload = {
  table: InternalLedgerProjectionTable;
  conflict_target: string;
  row: Record<string, unknown>;
  operation?: 'upsert' | 'delete';
};

export type InternalLedgerPosting = {
  user_id: string | null;
  account: keyof InternalBalanceBuckets | 'platform_internal';
  side: 'debit' | 'credit';
  amount: number;
  note: string | null;
};

export type InternalLedgerParticipant = {
  user_id: string | null;
  role: 'investor' | 'entrepreneur' | 'platform';
};

export type InternalUserBalanceDelta = Partial<InternalBalanceBuckets>;

export type InternalLedgerEntry = {
  id: string;
  created_at: string;
  event_key: string;
  source_table: string;
  source_id: string;
  lifecycle_stage: InternalLedgerLifecycleStage;
  wallet_action_id: string | null;
  entry_type: InternalLedgerEntryType;
  reference_type: string | null;
  reference_id: string | null;
  credit_id: string | null;
  project_id: string | null;
  primary_user_id: string | null;
  counterparty_user_id: string | null;
  affected_user_ids: string[];
  amount: number;
  currency: string;
  postings: InternalLedgerPosting[];
  participants: InternalLedgerParticipant[];
  balance_deltas: Record<string, InternalUserBalanceDelta>;
  projection_payload: InternalLedgerProjectionPayload;
  metadata: Record<string, unknown> | null;
};

export type InternalMovementHistoryItem = {
  entry_id: string;
  entry_type: string;
  created_at: string;
  amount: number;
  currency: string;
  credit_id: string | null;
  project_id: string | null;
  counterparty_user_id: string | null;
  delta: InternalUserBalanceDelta;
};

export type InternalRelatedUser = {
  user_id: string;
  role: 'investor' | 'entrepreneur' | 'platform' | null;
  total_entries: number;
  last_entry_at: string | null;
};

export type InternalAccountBalance = InternalBalanceBuckets & {
  user_id: string;
  currency: string;
  movement_history: InternalMovementHistoryItem[];
  related_users: InternalRelatedUser[];
  updated_at: string | null;
};
