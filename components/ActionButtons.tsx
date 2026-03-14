type ActionButtonsProps = {
  role: 'inversor' | 'emprendedor' | null;
  onInvest: () => void;
  onBuy: () => void;
  onWithdraw: () => void;
};

export default function ActionButtons({ role, onInvest, onBuy, onWithdraw }: ActionButtonsProps) {
  const primaryLabel = role === 'emprendedor' ? 'Repayments' : 'Inversiones';

  return (
    <div className="grid grid-cols-3 gap-3">
      <button
        onClick={onInvest}
        className="rounded-lg border border-gray-200 bg-white p-4 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
      >
        {primaryLabel}
      </button>
      <button
        onClick={onWithdraw}
        className="rounded-lg border border-gray-200 bg-white p-4 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
      >
        Retirar
      </button>
      <button
        onClick={onBuy}
        className="rounded-lg border border-gray-200 bg-white p-4 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
      >
        Comprar
      </button>
    </div>
  );
}
