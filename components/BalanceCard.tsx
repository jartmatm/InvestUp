type BalanceCardProps = {
  balanceUSDC: string;
};

export default function BalanceCard({ balanceUSDC }: BalanceCardProps) {
  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">Saldo total</p>
      <h2 className="text-3xl font-semibold text-gray-900">${balanceUSDC}</h2>
      <p className="mt-2 text-xs text-gray-500">Disponible para enviar</p>
    </section>
  );
}
