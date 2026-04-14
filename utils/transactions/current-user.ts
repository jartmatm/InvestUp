export type TransactionMovementType =
  | 'investment'
  | 'repayment'
  | 'transfer'
  | 'buy'
  | 'withdrawal';

export type TransactionStatus = 'submitted' | 'confirmed' | 'failed';

export type CurrentUserTransaction = {
  id: string;
  uuid?: string | null;
  created_at: string;
  movement_type: TransactionMovementType;
  status: TransactionStatus;
  tx_hash: string | null;
  from_wallet: string | null;
  to_wallet: string | null;
  amount: number | null;
};

export type CreateCurrentUserTransactionPayload = {
  txHash: string;
  fromWallet: string;
  toWallet: string;
  amountUsdc: string;
  movementType: TransactionMovementType;
  status?: TransactionStatus | 'completed';
  role?: 'investor' | 'entrepreneur' | null;
  metadata?: Record<string, unknown>;
};
