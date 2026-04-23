import {
  formatInvestmentCardNumber,
  getInvestmentCardBackground,
} from '@/lib/investor-overview';

type InvestorWalletCardProps = {
  statusLabel: string;
  statusClassName: string;
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
  statusLabel,
  statusClassName,
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
      className="relative h-[186px] w-full overflow-hidden rounded-[26px] p-4 text-left text-white shadow-[0_24px_50px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5"
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
            <span
              className={`inline-flex rounded-full border bg-white/90 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] shadow-[0_8px_16px_rgba(15,23,42,0.18)] ${statusClassName}`}
            >
              {statusLabel}
            </span>
            <h3 className="mt-3 max-w-[11.4rem] break-words text-[15px] font-semibold leading-[1.1]">
              {businessName}
            </h3>
          </div>
          <div className="relative h-12 w-12 shrink-0">
            <div className="absolute inset-[-8px] rounded-full bg-white/35 blur-xl" />
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/25 bg-white/20">
              {thumbnailUrl ? (
                <span
                  className="block h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${thumbnailUrl})` }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                  {initialsFrom(businessName)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <p className="text-[15px] font-medium tracking-[0.22em] text-white/95">
            {formatInvestmentCardNumber(investmentId)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-white">
          <div>
            <p className="text-xs font-semibold leading-tight">{ownerName}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold leading-tight">{nextRepayment}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold leading-tight">{amountLabel}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
