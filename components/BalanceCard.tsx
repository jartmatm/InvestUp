type BalanceCardProps = {
  balanceUSDC: string;
  balancePOL: string;
};

export default function BalanceCard({ balanceUSDC, balancePOL }: BalanceCardProps) {
  return (
    <section className="mb-6 rounded-2xl p-6 text-white shadow-lg investup-gradient">
      <p className="text-sm opacity-80">Saldo total</p>
      <h2 className="text-4xl font-bold">${balanceUSDC}</h2>
      <p className="mt-2 text-xs opacity-90">POL disponible para red: {balancePOL}</p>
    </section>
  );
}
