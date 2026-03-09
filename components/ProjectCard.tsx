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
    <article className="rounded-3xl border border-white/35 bg-white/90 p-4 shadow-xl shadow-violet-800/12">
      {coverImage ? (
        <img src={coverImage} alt={title} className="mb-3 h-40 w-full rounded-2xl object-cover" />
      ) : null}
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
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
      <div className="mt-4 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-gradient-to-r from-violet-600 to-teal-400" style={{ width }} />
      </div>
    </article>
  );
}
