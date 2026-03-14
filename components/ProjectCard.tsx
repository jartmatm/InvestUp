type ProjectCardProps = {
  title: string;
  description: string;
  progress?: number;
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
  const width = `${Math.max(0, Math.min(100, progress))}%`;
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {coverImage ? (
        <img src={coverImage} alt={title} className="mb-3 h-40 w-full rounded-lg object-cover" />
      ) : null}
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {sector ? <span>Sector: {sector}</span> : null}
        {city || country ? <span>{[city, country].filter(Boolean).join(', ')}</span> : null}
        {amountRequested != null ? (
          <span>
            Solicitado {currency ?? 'USD'} {Number(amountRequested).toLocaleString()}
          </span>
        ) : null}
        {termMonths != null ? <span>Plazo: {termMonths} meses</span> : null}
        {interestRate != null ? <span>Interes: {interestRate}%</span> : null}
        {targetAmountUsd != null ? <span>Meta USD {Number(targetAmountUsd).toLocaleString()}</span> : null}
        {interestRateEa != null ? <span>Interes {interestRateEa}% E.A.</span> : null}
        {publicationEndDate ? <span>Publica hasta {publicationEndDate}</span> : null}
      </div>
      <div className="mt-4 h-2 rounded-full bg-gray-200">
        <div className="h-2 rounded-full bg-primary" style={{ width }} />
      </div>
    </article>
  );
}
