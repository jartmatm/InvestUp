'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { useLocale, useTranslations } from 'next-intl';
import PageFrame from '@/components/PageFrame';
import { SectionLoadingSkeleton } from '@/components/AppLoadingSkeleton';
import { Avatar } from '@/components/tailgrids/core/avatar';
import { TextArea } from '@/components/tailgrids/core/text-area';
import ProjectPhotoCarousel from '@/components/ProjectPhotoCarousel';
import { useInvestApp } from '@/lib/investapp-context';
import { calculateInvestmentProjection } from '@/lib/investment-math';
import { setPendingInvestment } from '@/lib/pending-investment';
import { isProjectPubliclyVisible } from '@/lib/project-status';
import { toEnglishSector } from '@/lib/sector-labels';
import { fetchProjectById } from '@/utils/client/projects';
import { fetchRecipientDirectory } from '@/utils/client/recipient-directory';

type ProjectInvestmentDetail = {
  id: string;
  title: string;
  description: string;
  business_name: string | null;
  sector: string | null;
  amount_requested: number | null;
  minimum_investment: number | null;
  currency: string | null;
  term_months: number | null;
  installment_count: number | null;
  interest_rate: number | null;
  status: string | null;
  publication_end_date: string | null;
  owner_user_id: string | null;
  owner_wallet: string | null;
  city: string | null;
  country: string | null;
  photo_urls: string[] | null;
  metadata: Record<string, unknown> | null;
};

type OwnerProfile = {
  name: string | null;
  surname: string | null;
  email: string | null;
  wallet_address: string | null;
  avatar_url: string | null;
};

type PublicationSection = {
  title: string;
  body?: string;
  bullets?: string[];
};

const normalizePhotos = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const asRecord = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : [];

const splitParagraphs = (value?: string) =>
  (value ?? '')
    .split(/\n{2,}|\r\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

const buildBasicInfoRows = (
  project: ProjectInvestmentDetail,
  publicationFields: Record<string, unknown>
) => [
  {
    label: 'Business name',
    value: asString(publicationFields.business_name) || project.business_name || project.title,
  },
  {
    label: 'Location',
    value:
      asString(publicationFields.business_address) ||
      [project.city, project.country].map(asString).filter(Boolean).join(', ') ||
      'Location pending',
  },
  {
    label: 'Category',
    value:
      asString(publicationFields.business_category) ||
      (project.sector ? toEnglishSector(project.sector) : 'Business'),
  },
  {
    label: 'Operating time',
    value: asString(publicationFields.operating_time) || 'Pending',
  },
];

const getPublicationBody = (publication: Record<string, unknown>, keys: string[]) => {
  const sections = asRecord(publication.sections);

  for (const key of keys) {
    const sectionValue = sections[key];
    const sectionText = asString(sectionValue);
    if (sectionText) return sectionText;

    if (sectionValue && typeof sectionValue === 'object' && !Array.isArray(sectionValue)) {
      const nested = asRecord(sectionValue);
      const paragraph = asString(nested.paragraph) || asString(nested.body) || asString(nested.description);
      if (paragraph) return paragraph;
    }
  }

  for (const key of keys) {
    const value = publication[key];
    const textValue = asString(value);
    if (textValue) return textValue;
  }

  return '';
};

const buildPublicationSections = (
  project: ProjectInvestmentDetail,
  publicationFields: Record<string, unknown>,
  publicationSource: Record<string, unknown>
): PublicationSection[] => {
  const overviewFallback = project.description || '';
  const highlights = asStringArray(publicationSource.highlights);

  const sections: PublicationSection[] = [
    {
      title: 'Overview',
      body: getPublicationBody(publicationSource, ['overview', 'about', 'what_we_do', 'whatWeDo']) || overviewFallback,
    },
    {
      title: 'Description',
      body: getPublicationBody(publicationSource, ['description', 'summary', 'overview']) || overviewFallback,
    },
    {
      title: 'What we do',
      body: getPublicationBody(publicationSource, ['what_we_do', 'whatWeDo', 'product_or_service', 'productOrService']),
    },
    {
      title: 'How we do it',
      body: getPublicationBody(publicationSource, ['how_we_do_it', 'howWeDoIt']),
    },
    {
      title: 'Target',
      body: getPublicationBody(publicationSource, ['target', 'market_opportunity', 'marketOpportunity']),
    },
    {
      title: 'Market opportunity',
      body: getPublicationBody(publicationSource, ['market_opportunity', 'marketOpportunity']),
    },
    {
      title: 'Traction',
      body: getPublicationBody(publicationSource, ['traction', 'value', 'financial_information', 'financialInformation']),
    },
    {
      title: 'Highlights',
      bullets: highlights,
    },
    {
      title: 'Investment',
      body:
        getPublicationBody(publicationSource, ['investment', 'use_of_funds', 'useOfFunds']) ||
        asString(publicationFields.funds_usage),
    },
    {
      title: 'Financial information',
      body: getPublicationBody(publicationSource, ['financial_information', 'financialInformation']),
    },
    {
      title: 'Investor notes',
      body: getPublicationBody(publicationSource, ['investor_notes', 'investorNotes']),
    },
    {
      title: 'Team',
      body:
        getPublicationBody(publicationSource, ['team', 'owner_profile', 'founder_profile']) ||
        asString(publicationFields.team_profile) ||
        asString(publicationFields.founder_profile),
    },
    {
      title: 'Extras',
      body:
        getPublicationBody(publicationSource, ['extras', 'gallery']) ||
        asString(publicationFields.business_achievements),
    },
  ];

  return sections.filter((section) => section.body || section.bullets?.length);
};

function InvestAppWordmark() {
  return (
    <div className="flex items-center gap-0.5 text-[1.45rem] font-semibold tracking-[-0.07em] text-[#1C2336]">
      <span>Invest</span>
      <span className="text-[#6B39F4]">App</span>
      <span className="ml-0.5 mt-0.5 h-2.5 w-2.5 rounded-full bg-[#6B39F4]" />
    </div>
  );
}

function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${filled ? 'text-amber-400' : 'text-amber-200'}`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 2.9 5.89 6.49.94-4.69 4.57 1.11 6.46L12 17.98 6.19 20.86l1.11-6.46-4.69-4.57 6.49-.94L12 3Z" />
    </svg>
  );
}

const formatCurrency = (value: number, currency: string, locale: string) => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

export default function ProjectInvestPage() {
  const t = useTranslations('Feed');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const projectId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const { user, getAccessToken } = usePrivy();
  const { faseApp } = useInvestApp();
  const [project, setProject] = useState<ProjectInvestmentDetail | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [amount, setAmount] = useState('100.00');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryStatus, setInquiryStatus] = useState('');
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        setStatus(t('InvestFlow.notFound'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setStatus('');

      const { data, error } = await fetchProjectById(projectId, getAccessToken);

      if (error) {
        setStatus(t('InvestFlow.loadError', { error }));
        setLoading(false);
        return;
      }

      const normalizedProject = data
        ? ({
            ...(data as ProjectInvestmentDetail),
            photo_urls: normalizePhotos((data as ProjectInvestmentDetail).photo_urls),
          } as ProjectInvestmentDetail)
        : null;

      if (normalizedProject && !isProjectPubliclyVisible(normalizedProject)) {
        setProject(null);
        setStatus(t('Detail.inactiveListing'));
        setLoading(false);
        return;
      }

      setProject(normalizedProject);

      if (normalizedProject?.owner_user_id) {
        const { data: ownerData } = await fetchRecipientDirectory(getAccessToken, {
          ids: [normalizedProject.owner_user_id],
          limit: 1,
        });
        setOwner(((ownerData ?? [])[0] ?? null) as OwnerProfile | null);
      } else {
        setOwner(null);
      }

      const suggestedAmount = normalizedProject?.minimum_investment
        ? Number(normalizedProject.minimum_investment)
        : 50;
      setAmount(suggestedAmount.toFixed(2));
      setLoading(false);
    };

    loadProject();
  }, [getAccessToken, projectId, t]);

  const handleAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
    setAmount(normalized);
  };

  const formatAmountInput = (value: string) => {
    if (!value) return '';
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return '';
    return numberValue.toFixed(2);
  };

  const amountNumber = Number(amount || 0);
  const safeInterestRate = Number(project?.interest_rate ?? 0);
  const safeInstallmentCount = Number(project?.installment_count ?? project?.term_months ?? 0);
  const currencyCode = project?.currency ?? 'USD';
  const minimumInvestment = Number(project?.minimum_investment ?? 0);
  const projection = useMemo(
    () =>
      calculateInvestmentProjection({
        amountUsdc: Number.isFinite(amountNumber) ? amountNumber : 0,
        interestRateEa: safeInterestRate,
        termMonths: safeInstallmentCount,
      }),
    [amountNumber, safeInterestRate, safeInstallmentCount]
  );

  const entrepreneurName = (() => {
    const ownerName = `${owner?.name ?? ''} ${owner?.surname ?? ''}`.trim();
    if (ownerName) return ownerName;
    if (owner?.email?.trim()) return owner.email.trim();
    if (project?.business_name) return project.business_name;
    return t('InvestFlow.entrepreneur');
  })();

  const entrepreneurEmail = owner?.email?.trim() ?? '';
  const entrepreneurWallet = project?.owner_wallet ?? owner?.wallet_address ?? '';
  const canContinue = Boolean(project && entrepreneurWallet && amountNumber > 0);
  const quickAmounts = Array.from(
    new Set([minimumInvestment || 50, (minimumInvestment || 50) * 2, (minimumInvestment || 50) * 5, (minimumInvestment || 50) * 10])
  ).slice(0, 4);
  const projectMetadata = asRecord(project?.metadata);
  const publicationFields = asRecord(projectMetadata.publication_form_fields);
  const optimizedPublication = asRecord(projectMetadata.optimized_publication);
  const generatedPublication = asRecord(projectMetadata.generated_publication);
  const publicationSource =
    Object.keys(optimizedPublication).length > 0 ? optimizedPublication : generatedPublication;
  const mobileBasicInfoRows = project ? buildBasicInfoRows(project, publicationFields) : [];
  const mobilePublicationSections = project
    ? buildPublicationSections(project, publicationFields, publicationSource)
    : [];
  const entrepreneurAvatarFallback = (
    `${owner?.name ?? ''} ${owner?.surname ?? ''}`.trim() || owner?.email?.trim() || 'U'
  )
    .slice(0, 2)
    .toUpperCase();
  const mobileGalleryItems = project?.photo_urls ?? [];

  const handleContinue = () => {
    if (!project) {
      setStatus(t('InvestFlow.projectLoadFirst'));
      return;
    }
    if (!entrepreneurWallet) {
      setStatus(t('InvestFlow.walletNotReady'));
      return;
    }
    if (!amountNumber || amountNumber <= 0) {
      setStatus(t('InvestFlow.invalidAmount'));
      return;
    }
    if (minimumInvestment > 0 && amountNumber < minimumInvestment) {
      setStatus(t('InvestFlow.minimumInvestmentError', { amount: minimumInvestment.toFixed(2) }));
      return;
    }

    setPendingInvestment({
      projectId: project.id,
      projectTitle: project.title,
      entrepreneurUserId: project.owner_user_id ?? '',
      entrepreneurName,
      entrepreneurEmail,
      entrepreneurWallet,
      amountUsdc: amountNumber.toFixed(2),
      interestRateEa: safeInterestRate,
      termMonths: safeInstallmentCount,
      installmentCount: safeInstallmentCount,
      projectedReturnUsdc: projection.projectedReturnUsdc.toFixed(2),
      projectedTotalUsdc: projection.projectedTotalUsdc.toFixed(2),
      currency: 'USDC',
      createdAt: new Date().toISOString(),
    }, user?.id);

    router.push('/invest');
  };

  const handleSendInquiry = () => {
    if (!inquiryMessage.trim()) {
      setInquiryStatus('Write a message first.');
      return;
    }

    setInquiryStatus('Inquiry draft ready.');
    setInquiryMessage('');
  };

  const handleOpenInvestModal = () => {
    setInquiryStatus('');
    setIsInvestModalOpen(true);
  };

  const handleMobileContinue = () => {
    setIsInvestModalOpen(false);
    handleContinue();
  };

  const roundCloseDateLabel = asString(publicationFields.round_close_date) || project?.publication_end_date || 'Not selected';
  const mobileKpis = [
    {
      label: 'Capital to raise',
      value: formatCurrency(Number(project?.amount_requested ?? 0), currencyCode, locale),
    },
    {
      label: 'Minimum investment',
      value: formatCurrency(minimumInvestment || 0, currencyCode, locale),
    },
    {
      label: 'EA rate',
      value: `${safeInterestRate}%`,
    },
    {
      label: 'Round close date',
      value: roundCloseDateLabel,
    },
  ];

  return (
    <>
      <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(124,92,255,0.16),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F5F7FC_56%,#FFFFFF_100%)] text-[#101828] lg:hidden">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-6">
          <header className="flex items-center justify-between gap-3">
            <InvestAppWordmark />
            {project?.sector ? (
              <span className="rounded-full border border-[#E6DBFF] bg-white/92 px-3 py-1 text-[11px] font-semibold text-[#6B39F4] shadow-[0_10px_24px_rgba(107,57,244,0.08)]">
                {toEnglishSector(project.sector)}
              </span>
            ) : null}
          </header>

          {loading ? <SectionLoadingSkeleton rows={4} /> : null}
          {status ? <p className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{status}</p> : null}

          {!loading && project ? (
            <>
              <section className="overflow-hidden rounded-[28px] border border-white/85 bg-white shadow-[0_24px_68px_rgba(21,28,44,0.08)]">
                <ProjectPhotoCarousel
                  images={project.photo_urls}
                  alt={project.title}
                  autoPlay
                  showControls={false}
                  className="h-[300px] w-full"
                  imageClassName="h-[300px] w-full object-cover"
                />
              </section>

              <section className="rounded-[26px] border border-white/85 bg-white p-4 shadow-[0_18px_46px_rgba(21,28,44,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.64rem] font-bold uppercase tracking-[0.22em] text-[#6B39F4]">
                      Business info
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#10172F]">
                      {project.business_name || project.title}
                    </h2>
                  </div>
                  <span className="rounded-full border border-[#E6ECF5] bg-[#F8FAFF] px-3 py-1 text-[11px] font-semibold text-[#65708A]">
                    {project.city || project.country ? [project.city, project.country].filter(Boolean).join(', ') : t('locationPending')}
                  </span>
                </div>

                <div className="mt-4 overflow-hidden rounded-[18px] border border-[#E6ECF5]">
                  <table className="w-full divide-y divide-[#E6ECF5]">
                    <tbody>
                      {mobileBasicInfoRows.map((row) => (
                        <tr key={row.label} className="bg-white">
                          <th className="w-[42%] px-4 py-3 text-left text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#8A94A8]">
                            {row.label}
                          </th>
                          <td className="px-4 py-3 text-sm font-semibold leading-5 text-[#10172F]">
                            {row.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[26px] border border-white/85 bg-white p-4 shadow-[0_18px_46px_rgba(21,28,44,0.06)]">
                <div className="flex items-start gap-3">
                  <Avatar
                    src={owner?.avatar_url ?? undefined}
                    alt={entrepreneurName}
                    fallback={entrepreneurAvatarFallback}
                    size="lg"
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.64rem] font-bold uppercase tracking-[0.22em] text-[#6B39F4]">
                      Entrepreneur
                    </p>
                    <h3 className="mt-1 truncate text-lg font-semibold tracking-[-0.04em] text-[#10172F]">
                      {entrepreneurName}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <StarIcon key={`rating-star-${index}`} filled={false} />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-[#10172F]">0.0</span>
                      <span className="text-sm text-[#65708A]">(0)</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[26px] border border-white/85 bg-white p-4 shadow-[0_18px_46px_rgba(21,28,44,0.06)]">
                <p className="text-sm font-semibold text-[#10172F]">Send a message to the entrepreneur</p>
                <p className="mt-1 text-xs leading-5 text-[#65708A]">
                  Send inquiry... ask for extra context before moving to the investment step.
                </p>
                <div className="mt-4 space-y-3">
                  <TextArea
                    value={inquiryMessage}
                    onChange={(event) => setInquiryMessage(event.target.value)}
                    placeholder="Send inquiry..."
                    className="h-28 rounded-[18px] border border-[#E3E8F2] bg-[#FBFCFE] px-4 py-3 text-sm text-[#10172F] placeholder:text-[#9AA3B2] focus:border-[#6B39F4] focus:ring-[#6B39F4]/15"
                  />
                  <button
                    type="button"
                    onClick={handleSendInquiry}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#10172F] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(16,23,47,0.16)] transition hover:-translate-y-0.5"
                  >
                    Send
                  </button>
                </div>
                {inquiryStatus ? <p className="mt-3 text-xs font-medium text-[#6B39F4]">{inquiryStatus}</p> : null}
              </section>

              <section className="grid grid-cols-2 gap-3">
                {mobileKpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-[22px] border border-white/85 bg-white p-4 shadow-[0_14px_34px_rgba(21,28,44,0.05)]"
                  >
                    <p className="text-[0.64rem] font-extrabold uppercase tracking-[0.14em] text-[#8A94A8]">
                      {kpi.label}
                    </p>
                    <p className="mt-2 text-[1.05rem] font-extrabold leading-none tracking-[-0.05em] text-[#10172F]">
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </section>

              <section className="space-y-3">
                {mobilePublicationSections.map((section) => (
                  <article
                    key={section.title}
                    className="rounded-[26px] border border-white/85 bg-white p-4 shadow-[0_18px_46px_rgba(21,28,44,0.06)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-8 w-8 rounded-full bg-[#F4EFFF] text-[#6B39F4]" />
                      <h4 className="text-sm font-semibold tracking-[-0.03em] text-[#10172F]">
                        {section.title}
                      </h4>
                    </div>
                    {section.body ? (
                      <div className="mt-3 space-y-3 text-sm leading-6 text-[#59657F]">
                        {splitParagraphs(section.body).map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    ) : null}
                    {section.bullets?.length ? (
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-[#59657F]">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6B39F4]" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}

                {mobileGalleryItems.length > 0 ? (
                  <article className="rounded-[26px] border border-white/85 bg-white p-4 shadow-[0_18px_46px_rgba(21,28,44,0.06)]">
                    <div className="flex items-center gap-2">
                      <span className="h-8 w-8 rounded-full bg-[#EEF4FF] text-[#4C6EF5]" />
                      <h4 className="text-sm font-semibold tracking-[-0.03em] text-[#10172F]">Gallery</h4>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {mobileGalleryItems.map((image, index) => (
                        <div
                          key={`${image}-${index}`}
                          className="relative h-32 overflow-hidden rounded-[18px] border border-[#E7ECF5] bg-[#F5F7FB]"
                        >
                          <Image
                            src={image}
                            alt={`${project.title} ${index + 1}`}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </article>
                ) : null}
              </section>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenInvestModal}
                  className="mx-auto flex min-h-12 w-full max-w-[240px] items-center justify-center rounded-full bg-[#6B39F4] px-6 text-sm font-bold text-white shadow-[0_18px_36px_rgba(107,57,244,0.24)] transition active:scale-[0.985]"
                >
                  Invest
                </button>
              </div>
            </>
          ) : null}
        </div>

        {isInvestModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-[6px]">
            <div className="w-full rounded-t-[30px] border-t border-white/60 bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFBFF_100%)] px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-[0_-20px_60px_rgba(16,23,47,0.18)]">
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#D7DDEA]" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[#6B39F4]">
                    Amount to invest
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-[#10172F]">
                    Choose your investment amount
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInvestModalOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E6ECF5] bg-white text-[#10172F] shadow-[0_10px_22px_rgba(21,28,44,0.06)]"
                  aria-label="Close investment modal"
                >
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>

              <div className="mt-4 rounded-[22px] border border-[#E6ECF5] bg-white p-4 shadow-[0_14px_34px_rgba(21,28,44,0.05)]">
                <p className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#8A94A8]">
                  Selected amount
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#10172F]">
                  {(formatAmountInput(amount) || '0.00')} USD
                </p>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {quickAmounts.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => setAmount(quickAmount.toFixed(2))}
                    className={`rounded-2xl border px-2 py-3 text-sm font-semibold transition ${
                      Number(amount) === quickAmount
                        ? 'border-[#6B39F4] bg-[#6B39F4] text-white'
                        : 'border-[#E6ECF5] bg-white text-[#10172F]'
                    }`}
                  >
                    ${quickAmount}
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-[22px] border border-[#E6ECF5] bg-white p-4 shadow-[0_14px_34px_rgba(21,28,44,0.05)]">
                <p className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#8A94A8]">
                  Custom amount
                </p>
                <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-[#E6ECF5] bg-[#FBFCFE] px-4 py-4">
                  <span className="rounded-full border border-[#E6D8FF] bg-[#F4EFFF] px-3 py-1 text-xs font-semibold text-[#6B39F4]">
                    USD
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => handleAmountChange(event.target.value)}
                    onBlur={() => setAmount(formatAmountInput(amount))}
                    placeholder={t('InvestFlow.amountPlaceholder')}
                    className="w-full bg-transparent text-lg font-semibold text-[#10172F] outline-none placeholder:text-[#9AA3B2]"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-[#E6ECF5] bg-white p-4">
                  <p className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#8A94A8]">
                    EA rate
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#10172F]">{safeInterestRate}%</p>
                </div>
                <div className="rounded-[22px] border border-[#E6ECF5] bg-white p-4">
                  <p className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#8A94A8]">
                    Installments
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#10172F]">
                    {t('InvestFlow.monthsCount', { count: safeInstallmentCount || 0 })}
                  </p>
                </div>
                <div className="rounded-[22px] border border-[#E6ECF5] bg-white p-4">
                  <p className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#8A94A8]">
                    Effective yield
                  </p>
                  <p className="mt-2 text-lg font-semibold text-emerald-700">{projection.effectiveRate}%</p>
                </div>
                <div className="rounded-[22px] border border-[#E6ECF5] bg-white p-4">
                  <p className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#8A94A8]">
                    Estimated return
                  </p>
                  <p className="mt-2 text-lg font-semibold text-emerald-700">
                    {formatCurrency(projection.projectedReturnUsdc, 'USD', locale)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-[#E6D8FF] bg-[#F4EFFF] p-4">
                <p className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#6B39F4]">
                  Projected result
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#6B39F4]">
                  {formatCurrency(projection.projectedTotalUsdc, 'USD', locale)}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#6F6096]">
                  {t('InvestFlow.estimateDescription')}
                </p>
              </div>

              <button
                type="button"
                onClick={handleMobileContinue}
                disabled={!canContinue}
                className={`mt-4 flex w-full items-center justify-center rounded-full px-5 py-4 text-sm font-semibold text-white shadow-lg transition ${
                  canContinue ? 'bg-[#6B39F4]' : 'bg-[#6B39F4]/40'
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

      </main>

      <div className="hidden lg:block">
        <PageFrame title={t('invest')} subtitle={t('InvestFlow.subtitle')}>
      {loading ? <SectionLoadingSkeleton rows={4} /> : null}
      {status ? <p className="mb-4 text-sm text-rose-600">{status}</p> : null}

      {!loading && project ? (
        <div className="space-y-4 pb-8">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border border-white/25 bg-white/20 px-4 py-2 text-sm font-semibold text-gray-700 backdrop-blur-md"
            >
              {t('InvestFlow.back')}
            </button>
            {project.sector ? (
              <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {toEnglishSector(project.sector)}
              </span>
            ) : null}
          </div>

          <ProjectPhotoCarousel
            images={project.photo_urls}
            alt={project.title}
            className="h-56 w-full rounded-3xl border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
            imageClassName="h-56 w-full object-cover"
          />

          <div className="rounded-3xl border border-white/25 bg-white/20 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{t('InvestFlow.project')}</p>
                <h2 className="mt-1 text-xl font-semibold text-gray-900">{project.title}</h2>
                <p className="mt-2 text-sm text-gray-600">{entrepreneurName}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {project.city || project.country
                    ? `${project.city ?? ''} ${project.country ?? ''}`.trim()
                    : t('locationPending')}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200/50 bg-emerald-50/40 px-4 py-3 text-right backdrop-blur-md">
                <p className="text-xs text-emerald-700">{t('InvestFlow.publishedTarget')}</p>
                <p className="mt-1 text-sm font-semibold text-emerald-900">
                  {formatCurrency(Number(project.amount_requested ?? 0), currencyCode, locale)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-700">{project.description}</p>

            <div className="mt-4 rounded-2xl border border-white/25 bg-white/15 p-4">
              <p className="text-xs text-gray-500">{t('InvestFlow.userEmail')}</p>
              <p className="mt-1 break-all text-sm font-medium text-gray-800">
                {entrepreneurEmail || t('InvestFlow.emailPending')}
              </p>
            </div>
            <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-primary/70">{t('minimumInvestment')}</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {formatCurrency(minimumInvestment || 0, currencyCode, locale)}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/25 bg-white/20 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-sm font-semibold text-gray-900">{t('InvestFlow.amountToInvest')}</p>
            <div className="mt-4 rounded-2xl border border-white/25 bg-white/15 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('InvestFlow.selectedAmount')}</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {(formatAmountInput(amount) || '0.00')} USD
              </p>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmount(quickAmount.toFixed(2))}
                  className={`rounded-2xl border px-2 py-3 text-sm font-semibold transition ${
                    Number(amount) === quickAmount
                      ? 'border-[#6B39F4] bg-[#6B39F4] text-white'
                      : 'border-white/25 bg-white/15 text-gray-700'
                  }`}
                >
                  ${quickAmount}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/25 bg-white/15 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('InvestFlow.customAmount')}</p>
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/25 bg-white/20 px-4 py-4">
                <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  USD
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => handleAmountChange(event.target.value)}
                  onBlur={() => setAmount(formatAmountInput(amount))}
                  placeholder={t('InvestFlow.amountPlaceholder')}
                  className="w-full bg-transparent text-lg font-semibold text-gray-900 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <p className="text-xs text-gray-500">{t('InvestFlow.eaRate')}</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">{safeInterestRate}%</p>
            </div>
            <div className="rounded-3xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <p className="text-xs text-gray-500">{t('InvestFlow.installments')}</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {t('InvestFlow.monthsCount', { count: safeInstallmentCount || 0 })}
              </p>
            </div>
            <div className="rounded-3xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <p className="text-xs text-gray-500">{t('InvestFlow.effectiveYield')}</p>
              <p className="mt-2 text-lg font-semibold text-emerald-700">{projection.effectiveRate}%</p>
            </div>
            <div className="rounded-3xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <p className="text-xs text-gray-500">{t('InvestFlow.estimatedReturn')}</p>
              <p className="mt-2 text-lg font-semibold text-emerald-700">
                {formatCurrency(projection.projectedReturnUsdc, 'USD', locale)}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-primary/15 bg-primary/10 p-5 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.2em] text-primary/70">{t('InvestFlow.projectedResult')}</p>
            <p className="mt-3 text-3xl font-semibold text-primary">
              {formatCurrency(projection.projectedTotalUsdc, 'USD', locale)}
            </p>
            <p className="mt-2 text-sm text-primary/80">
              {t('InvestFlow.estimateDescription')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className={`w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-lg transition ${
              canContinue ? 'bg-[#6B39F4]' : 'bg-[#6B39F4]/40'
            }`}
          >
            {t('InvestFlow.confirmInvestment')}
          </button>
        </div>
      ) : null}
        </PageFrame>
      </div>
    </>
  );
}
