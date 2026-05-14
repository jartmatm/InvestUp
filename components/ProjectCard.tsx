import { useLocale, useTranslations } from 'next-intl';
import { isLocale, type AppLocale } from '@/i18n/locales';
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
  const t = useTranslations('Components');
  const locale = useLocale();
  const activeLocale: AppLocale = isLocale(locale) ? locale : 'en';
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
        {sector ? <span>{t('sector')}: {toEnglishSector(sector)}</span> : null}
        {city || country ? <span>{[city, country].filter(Boolean).join(', ')}</span> : null}
        {amountRequested != null ? (
          <span>
            {t('requested')} {currency ?? 'USD'} {Number(amountRequested).toLocaleString(activeLocale)}
          </span>
        ) : null}
        {amountRaised != null ? (
          <span>{t('raised')} {currency ?? 'USD'} {Number(amountRaised).toLocaleString(activeLocale)}</span>
        ) : null}
        {termMonths != null ? <span>{t('installments')}: {termMonths} {t('months')}</span> : null}
        {interestRate != null ? <span>{t('interest')}: {interestRate}%</span> : null}
        {targetAmountUsd != null ? (
          <span>{t('targetUsd')} {Number(targetAmountUsd).toLocaleString(activeLocale)}</span>
        ) : null}
        {interestRateEa != null ? <span>{t('interestEa', { value: interestRateEa })}</span> : null}
        {publicationEndDate ? <span>{t('publishedUntil', { date: publicationEndDate })}</span> : null}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-gray-600">
        <span>{t('fundingProgress')}</span>
        <span>{normalizedProgress.toFixed(0)}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gray-200">
        <div className="h-2 rounded-full bg-primary" style={{ width }} />
      </div>
    </article>
  );
}
