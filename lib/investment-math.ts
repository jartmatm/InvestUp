export type InvestmentProjection = {
  effectiveRate: number;
  projectedReturnUsdc: number;
  projectedTotalUsdc: number;
};

const roundToTwo = (value: number) => Number(value.toFixed(2));

export function calculateInvestmentProjection({
  amountUsdc,
  interestRateEa,
  termMonths,
}: {
  amountUsdc: number;
  interestRateEa: number;
  termMonths: number;
}): InvestmentProjection {
  const capital = Number.isFinite(amountUsdc) ? Math.max(amountUsdc, 0) : 0;
  const rate = Number.isFinite(interestRateEa) ? Math.max(interestRateEa, 0) : 0;
  const months = Number.isFinite(termMonths) ? Math.max(termMonths, 0) : 0;

  if (capital <= 0) {
    return {
      effectiveRate: 0,
      projectedReturnUsdc: 0,
      projectedTotalUsdc: 0,
    };
  }

  if (rate <= 0 || months <= 0) {
    return {
      effectiveRate: 0,
      projectedReturnUsdc: 0,
      projectedTotalUsdc: roundToTwo(capital),
    };
  }

  const effectiveRate = Math.pow(1 + rate / 100, months / 12) - 1;
  const projectedTotalUsdc = roundToTwo(capital * (1 + effectiveRate));
  const projectedReturnUsdc = roundToTwo(projectedTotalUsdc - capital);

  return {
    effectiveRate: Number((effectiveRate * 100).toFixed(2)),
    projectedReturnUsdc,
    projectedTotalUsdc,
  };
}
