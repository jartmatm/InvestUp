export type CurrentUserInvestmentStatus = 'submitted' | 'confirmed' | 'failed';

export type CurrentUserInvestment = {
  id: string;
  created_at: string;
  project_id: string;
  project_title: string | null;
  investor_user_id: string | null;
  entrepreneur_user_id: string | null;
  tx_hash: string | null;
  from_wallet: string | null;
  to_wallet: string | null;
  amount: number | null;
  interest_rate_ea: number | null;
  term_months: number | null;
  projected_return_usdc: number | null;
  projected_total_usdc: number | null;
  status: CurrentUserInvestmentStatus;
};

export type CreateCurrentUserInvestmentPayload = {
  txHash: string;
  transactionId?: string | null;
  amountUsdc: string;
  fromWallet: string;
  toWallet: string;
  projectId: string;
  projectTitle: string;
  entrepreneurUserId?: string | null;
  entrepreneurName?: string | null;
  currency?: string | null;
  interestRateEa?: number | null;
  termMonths?: number | null;
  projectedReturnUsdc?: number | null;
  projectedTotalUsdc?: number | null;
};
