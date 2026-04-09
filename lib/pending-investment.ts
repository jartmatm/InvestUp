export type PendingInvestment = {
  projectId: string;
  projectTitle: string;
  entrepreneurUserId: string;
  entrepreneurName: string;
  entrepreneurWallet: string;
  amountUsdc: string;
  interestRateEa: number;
  termMonths: number;
  installmentCount: number;
  projectedReturnUsdc: string;
  projectedTotalUsdc: string;
  currency: string;
  createdAt: string;
};

const getPendingInvestmentKeys = (userId: string) =>
  [`investapp_pending_investment_${userId}`, `investup_pending_investment_${userId}`] as const;

export function setPendingInvestment(
  value: PendingInvestment,
  userId: string | null | undefined
) {
  if (typeof window === 'undefined' || !userId) return;
  const serialized = JSON.stringify(value);
  getPendingInvestmentKeys(userId).forEach((key) => {
    window.localStorage.setItem(key, serialized);
  });
}

export function getPendingInvestment(
  userId: string | null | undefined
): PendingInvestment | null {
  if (typeof window === 'undefined' || !userId) return null;

  let raw = '';
  for (const key of getPendingInvestmentKeys(userId)) {
    const value = window.localStorage.getItem(key) ?? '';
    if (!value) continue;
    raw = value;
    break;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingInvestment;
    if (!parsed?.projectId || !parsed?.entrepreneurWallet) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingInvestment(userId: string | null | undefined) {
  if (typeof window === 'undefined' || !userId) return;
  getPendingInvestmentKeys(userId).forEach((key) => {
    window.localStorage.removeItem(key);
  });
}
