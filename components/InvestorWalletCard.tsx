import {
  formatInvestmentCardNumber,
  getInvestmentCardBackground,
} from '@/lib/investor-overview';

type InvestorWalletCardProps = {
  businessName: string;
  thumbnailUrl?: string | null;
  investmentId: string;
  ownerName: string;
  nextRepayment: string;
  amountLabel: string;
  onClick?: () => void;
};

const initialsFrom = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'B';

export default function InvestorWalletCard({
  businessName,
  thumbnailUrl,
  investmentId,
  ownerName,
  nextRepayment,
  amountLabel,
  onClick,
}: InvestorWalletCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-[186px] w-[248px] overflow-hidden rounded-[24px] p-4 text-left text-white shadow-[0_18px_38px_rgba(15,23,42,0.18)]"
      style={{ backgroundImage: getInvestmentCardBackground(investmentId) }}
    >
      <div className="absolute inset-0 opacity-25">
        <div className="absolute left-[-10%] top-[18%] h-[1px] w-[120%] bg-white/50" />
        <div className="absolute left-[-10%] top-[52%] h-[1px] w-[120%] bg-white/40" />
        <div className="absolute left-[-10%] top-[76%] h-[1px] w-[120%] bg-white/35" />
      </div>

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/70">Business</p>
            <h3 className="mt-2 max-w-[8.6rem] break-words text-[15px] font-semibold leading-[1.1]">
              {businessName}
            </h3>
          </div>
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-white/20">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={businessName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                {initialsFrom(businessName)}
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <p className="text-xs uppercase tracking-[0.18em] text-white/60">Investment ID</p>
          <p className="mt-2 text-[15px] font-medium tracking-[0.22em] text-white/95">
            {formatInvestmentCardNumber(investmentId)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-white">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">Owner</p>
            <p className="mt-2 text-xs font-semibold leading-tight">{ownerName}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">Next repayment</p>
            <p className="mt-2 text-xs font-semibold leading-tight">{nextRepayment}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">Invested</p>
            <p className="mt-2 text-xs font-semibold leading-tight">{amountLabel}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
