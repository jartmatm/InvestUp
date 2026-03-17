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
        className="rounded-lg border border-white/25 bg-white/20 p-4 text-xs font-semibold text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition hover:bg-white/30"
      >
        {primaryLabel}
      </button>
      <button
        onClick={onWithdraw}
        className="rounded-lg border border-white/25 bg-white/20 p-4 text-xs font-semibold text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition hover:bg-white/30"
      >
        Retirar
      </button>
      <button
        onClick={onBuy}
        className="rounded-lg border border-white/25 bg-white/20 p-4 text-xs font-semibold text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition hover:bg-white/30"
      >
        Comprar
      </button>
    </div>
  );
}
