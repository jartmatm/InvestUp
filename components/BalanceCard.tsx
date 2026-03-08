type BalanceCardProps = {
  balanceUSDC: string;
  balancePOL: string;
};

export default function BalanceCard({ balanceUSDC, balancePOL }: BalanceCardProps) {
  return (
    <section className="mb-6 rounded-3xl border border-white/35 bg-white/18 p-6 text-white shadow-2xl shadow-violet-800/20 backdrop-blur-xl">
      <p className="text-sm opacity-85">Saldo total</p>
      <h2 className="text-4xl font-bold">${balanceUSDC}</h2>
      <p className="mt-2 text-xs opacity-90">POL disponible para red: {balancePOL}</p>
    </section>
  );
}
