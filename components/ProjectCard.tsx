import { toEnglishSector } from '@/lib/sector-labels';

type ProjectCardProps = {
  title: string;
  description: string;
  progress?: number;
  amountRaised?: number | null;
  sector?: string | null;
  city?: string | null;
  country?: string | null;
  amountRequested?: number | null;
  currency?: string | null;
  termMonths?: number | null;
  interestRate?: number | null;
  targetAmountUsd?: number | null;
  interestRateEa?: number | null;
  publicationEndDate?: string | null;
  coverImage?: string | null;
};

export default function ProjectCard({
  title,
  description,
  progress = 0,
  amountRaised,
  sector,
  city,
  country,
  amountRequested,
  currency,
  termMonths,
  interestRate,
  targetAmountUsd,
  interestRateEa,
  publicationEndDate,
  coverImage,
}: ProjectCardProps) {
  const computedProgress =
    amountRequested && amountRequested > 0 && amountRaised != null
      ? (Number(amountRaised) / Number(amountRequested)) * 100
      : progress;
  const normalizedProgress = Math.max(0, Math.min(100, computedProgress));
  const width = `${normalizedProgress}%`;
  return (
    <article className="glass-card rounded-xl p-4">
      {coverImage ? (
        <img src={coverImage} alt={title} className="mb-3 h-40 w-full rounded-lg object-cover" />
      ) : null}
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {sector ? <span>Sector: {toEnglishSector(sector)}</span> : null}
        {city || country ? <span>{[city, country].filter(Boolean).join(', ')}</span> : null}
        {amountRequested != null ? (
          <span>
            Requested {currency ?? 'USD'} {Number(amountRequested).toLocaleString()}
          </span>
        ) : null}
        {amountRaised != null ? <span>Raised {currency ?? 'USD'} {Number(amountRaised).toLocaleString()}</span> : null}
        {termMonths != null ? <span>Installments: {termMonths} months</span> : null}
        {interestRate != null ? <span>Interest: {interestRate}%</span> : null}
        {targetAmountUsd != null ? <span>Target USD {Number(targetAmountUsd).toLocaleString()}</span> : null}
        {interestRateEa != null ? <span>Interest {interestRateEa}% EA</span> : null}
        {publicationEndDate ? <span>Published until {publicationEndDate}</span> : null}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-gray-600">
        <span>Funding progress</span>
        <span>{normalizedProgress.toFixed(0)}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gray-200">
        <div className="h-2 rounded-full bg-primary" style={{ width }} />
      </div>
    </article>
  );
}
