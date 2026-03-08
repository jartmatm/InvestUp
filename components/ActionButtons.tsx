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
        className="rounded-2xl border border-white/35 bg-white/22 p-4 text-xs font-semibold text-white shadow-lg shadow-violet-800/15 backdrop-blur-xl"
      >
        {primaryLabel}
      </button>
      <button
        onClick={onWithdraw}
        className="rounded-2xl border border-white/35 bg-white/22 p-4 text-xs font-semibold text-white shadow-lg shadow-violet-800/15 backdrop-blur-xl"
      >
        Retirar
      </button>
      <button
        onClick={onBuy}
        className="rounded-2xl border border-white/35 bg-white/22 p-4 text-xs font-semibold text-white shadow-lg shadow-violet-800/15 backdrop-blur-xl"
      >
        Comprar
      </button>
    </div>
  );
}
