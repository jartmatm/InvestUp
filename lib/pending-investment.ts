export type PendingInvestment = {
  projectId: string;
  projectTitle: string;
  entrepreneurUserId: string;
  entrepreneurName: string;
  entrepreneurWallet: string;
  amountUsdc: string;
  interestRateEa: number;
  termMonths: number;
  projectedReturnUsdc: string;
  projectedTotalUsdc: string;
  currency: string;
  createdAt: string;
};

const PENDING_INVESTMENT_KEY = 'investup_pending_investment';

export function setPendingInvestment(value: PendingInvestment) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PENDING_INVESTMENT_KEY, JSON.stringify(value));
}

export function getPendingInvestment(): PendingInvestment | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PENDING_INVESTMENT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingInvestment;
    if (!parsed?.projectId || !parsed?.entrepreneurWallet) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingInvestment() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PENDING_INVESTMENT_KEY);
}
