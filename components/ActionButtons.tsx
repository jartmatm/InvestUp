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
      <button onClick={onInvest} className="rounded-xl bg-white p-4 text-xs font-semibold shadow-sm">
        {primaryLabel}
      </button>
      <button onClick={onWithdraw} className="rounded-xl bg-white p-4 text-xs font-semibold shadow-sm">
        Retirar
      </button>
      <button onClick={onBuy} className="rounded-xl bg-white p-4 text-xs font-semibold shadow-sm">
        Comprar
      </button>
    </div>
  );
}
