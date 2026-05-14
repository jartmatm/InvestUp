'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ProjectPhotoCarousel from '@/components/ProjectPhotoCarousel';

export type OpportunityMetric = {
  label: string;
  value: string;
  icon: 'goal' | 'rate' | 'sales' | 'clients';
};

export type OpportunitySection = {
  title: string;
  body?: string;
  bullets?: string[];
  icon:
    | 'overview'
    | 'what'
    | 'how'
    | 'financial'
    | 'investment'
    | 'target'
    | 'team'
    | 'gallery'
    | 'extras'
    | 'problem'
    | 'solution'
    | 'business'
    | 'traction'
    | 'market'
    | 'funds';
};

export type InvestmentOpportunityDetailProps = {
  title: string;
  subtitle?: string;
  location?: string;
  category?: string;
  rate?: string;
  images?: string[];
  metrics: OpportunityMetric[];
  sections: OpportunitySection[];
  primaryActionLabel: string;
  secondaryActionLabel: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onBack: () => void;
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
  bottomOffsetClassName?: string;
};

const iconPaths = {
  back: 'M15 18l-6-6 6-6M9 12h12',
  location:
    'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0ZM12 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  category:
    'M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 7h14v13H5V7ZM9 11h6',
  trend: 'M4 17l6-6 4 4 6-8M16 7h4v4',
  goal: 'M4 19h16M7 16V9M12 16V5M17 16v-7',
  rate: 'M12 21a9 9 0 1 0-9-9h9V3M13 13l5 5',
  sales:
    'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6',
  clients:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  overview: 'M4 5h16M4 12h16M4 19h10',
  problem: 'M12 9v4M12 17h.01M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  solution:
    'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2Z',
  business:
    'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h.01M9 13h.01M9 17h.01M15 13h.01M15 17h.01',
  traction: 'M3 17l6-6 4 4 8-10M17 5h4v4',
  market: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  funds: 'M21 8V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1M16 12h6M19 9v6',
  what: 'M4 7h16M4 12h10M4 17h16',
  how: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3ZM12 12l8-4.5M12 12v9M12 12 4 7.5',
  financial: 'M4 19V5M8 17v-5M12 17V8M16 17v-7M20 17V6',
  investment: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
  team: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  gallery: 'M4 5h16v14H4V5ZM8 13l2.5-2.5L14 14l2-2 4 4M8 9h.01',
  extras: 'M12 3l2.2 4.46 4.92.72-3.56 3.47.84 4.9L12 14.23 7.6 16.55l.84-4.9-3.56-3.47 4.92-.72L12 3Z',
} as const;

function DetailIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: keyof typeof iconPaths;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d={iconPaths[name]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

const splitParagraphs = (value?: string) =>
  (value ?? '')
    .split(/\n{2,}|\r\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

const sectionTone = {
  overview: 'bg-[#F4EFFF] text-[#6B39F4]',
  problem: 'bg-[#F4EFFF] text-[#6B39F4]',
  solution: 'bg-[#EAFBF5] text-[#10A76F]',
  business: 'bg-[#FFF5E5] text-[#F59E0B]',
  traction: 'bg-[#EEF6FF] text-[#4D8DFF]',
  market: 'bg-[#F4EFFF] text-[#6B39F4]',
  funds: 'bg-[#EAFBF5] text-[#10A76F]',
  what: 'bg-[#EAFBF5] text-[#10A76F]',
  how: 'bg-[#FFF5E5] text-[#F59E0B]',
  financial: 'bg-[#EEF6FF] text-[#4D8DFF]',
  investment: 'bg-[#F4EFFF] text-[#6B39F4]',
  target: 'bg-[#FFF5E5] text-[#F59E0B]',
  team: 'bg-[#F4EFFF] text-[#6B39F4]',
  gallery: 'bg-[#EEF6FF] text-[#4D8DFF]',
  extras: 'bg-[#EAFBF5] text-[#10A76F]',
} as const;

export default function InvestmentOpportunityDetail({
  title,
  subtitle,
  location,
  category,
  rate,
  images,
  metrics,
  sections,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onBack,
  primaryDisabled,
  secondaryDisabled,
  bottomOffsetClassName = 'bottom-0',
}: InvestmentOpportunityDetailProps) {
  const t = useTranslations('Components');
  const normalizedImages = (images ?? []).filter(Boolean);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const activeSectionIndexSafe =
    sections.length > 0 ? Math.min(activeSectionIndex, sections.length - 1) : 0;
  const activeSection = sections.length > 0 ? sections[activeSectionIndexSafe] ?? sections[0] : null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(124,92,255,0.12),transparent_30%),linear-gradient(180deg,#FBFCFF_0%,#F6F8FC_45%,#FFFFFF_100%)] text-[#10172F] lg:min-h-0 lg:bg-transparent">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-40 pt-8 lg:max-w-none lg:px-0 lg:pb-0 lg:pt-0">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-white/86 text-[#10172F] shadow-[0_18px_45px_rgba(27,35,58,0.08)] backdrop-blur-xl transition active:scale-95"
          >
            <DetailIcon name="back" className="h-6 w-6" />
          </button>
        </div>

        <section className="rounded-[24px] bg-white/92 p-4 shadow-[0_24px_70px_rgba(27,35,58,0.08)] ring-1 ring-white/80 backdrop-blur-2xl">
          <div className="grid gap-5 md:grid-cols-[1fr_0.88fr] md:items-center">
            <div className="order-2 md:order-1">
              <h1 className="text-[1.95rem] font-semibold leading-[1.08] tracking-normal text-[#10172F] md:text-[2.25rem]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-3 text-base font-medium leading-6 text-[#65708A]">{subtitle}</p>
              ) : null}
              {location ? (
                <div className="mt-5 flex items-center gap-2 text-sm font-medium text-[#65708A]">
                  <DetailIcon name="location" className="h-5 w-5 text-[#6B39F4]" />
                  <span>{location}</span>
                </div>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3">
                {category ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#F4EFFF] px-4 py-2 text-sm font-semibold text-[#6B39F4]">
                    <DetailIcon name="category" className="h-4 w-4" />
                    {category}
                  </span>
                ) : null}
                {rate ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#EAFBF5] px-4 py-2 text-sm font-semibold text-[#0A9F69]">
                    <DetailIcon name="trend" className="h-4 w-4" />
                    {rate}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="order-1 md:order-2">
              <div className="relative">
                <ProjectPhotoCarousel
                  images={normalizedImages}
                  alt={title}
                  className="aspect-[1.03/1] rounded-[24px] bg-[#EEF1F7] shadow-[0_18px_45px_rgba(27,35,58,0.12)]"
                  imageClassName="h-full w-full object-cover"
                  emptyClassName="flex h-full w-full items-center justify-center rounded-[24px] bg-[#EEF1F7] text-xs font-semibold text-[#6B7280]"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 rounded-b-[24px] bg-gradient-to-t from-black/24 to-transparent" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] bg-white/92 px-3 py-5 shadow-[0_24px_70px_rgba(27,35,58,0.07)] ring-1 ring-white/80 backdrop-blur-2xl">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {metrics.slice(0, 4).map((metric, index) => (
              <div
                key={`${metric.label}-${index}`}
                className="flex min-h-[116px] flex-col items-center justify-center gap-2 rounded-[22px] px-2 text-center sm:border-r sm:border-[#E8ECF4] sm:last:border-r-0"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4EFFF] text-[#6B39F4]">
                  <DetailIcon name={metric.icon} className="h-6 w-6" />
                </span>
                <p className="text-lg font-semibold tracking-normal text-[#10172F]">{metric.value}</p>
                <p className="text-xs font-medium leading-4 text-[#65708A]">{metric.label}</p>
              </div>
            ))}
          </div>
        </section>

        <nav className="sticky top-0 z-20 -mx-4 overflow-x-auto bg-[#F8FAFE]/86 px-4 py-2 backdrop-blur-xl lg:top-[68px] lg:rounded-2xl lg:border lg:border-[#E9ECF4] lg:bg-white/88 lg:shadow-[0_18px_42px_rgba(21,28,44,0.045)]">
          <div className="flex min-w-max items-center gap-8 text-sm font-semibold text-[#65708A]">
            {sections.map((section, index) => (
              <button
                type="button"
                key={section.title}
                onClick={() => setActiveSectionIndex(index)}
                className={`relative cursor-pointer py-3 text-left transition ${
                  index === activeSectionIndexSafe ? 'text-[#6B39F4]' : 'hover:text-[#10172F]'
                }`}
              >
                {section.title}
                {index === activeSectionIndexSafe ? (
                  <span className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-[#6B39F4]" />
                ) : null}
              </button>
            ))}
          </div>
        </nav>

        <section className="rounded-[24px] bg-white/78 p-5 shadow-[0_22px_64px_rgba(27,35,58,0.06)] ring-1 ring-white/80 backdrop-blur-2xl">
          {activeSection ? (
            <article>
              <div className="flex gap-4">
                <span
                  className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] ${sectionTone[activeSection.icon]}`}
                >
                  <DetailIcon name={activeSection.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold tracking-normal text-[#10172F]">
                    {activeSection.title}
                  </h2>
                  {splitParagraphs(activeSection.body).length ? (
                    <div className="mt-3 space-y-3 text-[0.95rem] leading-7 text-[#59657F]">
                      {splitParagraphs(activeSection.body).map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ) : (
            <p className="text-sm leading-6 text-[#59657F]">{t('publicationDetailsEmpty')}</p>
          )}
        </section>
      </div>

      <div
        className={`fixed inset-x-0 ${bottomOffsetClassName} z-50 mx-auto max-w-3xl px-4 pb-[max(env(safe-area-inset-bottom),1rem)] lg:static lg:mx-0 lg:max-w-none lg:px-0 lg:pb-0`}
      >
        <div className="rounded-[24px] bg-white/90 p-4 shadow-[0_-18px_60px_rgba(27,35,58,0.12)] ring-1 ring-white/80 backdrop-blur-2xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.9fr_1.1fr]">
            <button
              type="button"
              onClick={onSecondaryAction}
              disabled={secondaryDisabled}
              className="min-h-[56px] cursor-pointer rounded-full border border-[#E4E8F2] bg-white px-5 text-sm font-semibold text-[#10172F] shadow-[0_12px_28px_rgba(27,35,58,0.05)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {secondaryActionLabel}
            </button>
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={primaryDisabled}
              className="min-h-[56px] cursor-pointer rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B2FF4_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(107,57,244,0.28)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {primaryActionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
