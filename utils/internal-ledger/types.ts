export type InternalBalanceBuckets = {
  available_balance: number;
  locked_balance: number;
  pending_balance: number;
  withdrawable_balance: number;
  invested_balance: number;
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
  entry_type: string;
  reference_type: string;
  reference_id: string;
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
