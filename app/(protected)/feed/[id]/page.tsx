'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import { SectionLoadingSkeleton } from '@/components/AppLoadingSkeleton';
import { DesktopAppShell } from '@/components/DesktopAppShell';
import InvestmentOpportunityDetail, {
  type OpportunityBadge,
  type OpportunityGalleryItem,
  type OpportunityMetric,
  type OpportunitySection,
} from '@/components/InvestmentOpportunityDetail';
import { useInvestApp } from '@/lib/investapp-context';
import { isProjectPubliclyVisible } from '@/lib/project-status';
import { toEnglishSector } from '@/lib/sector-labels';
import { fetchProjectById } from '@/utils/client/projects';

type ProjectDetail = {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  business_name: string | null;
  amount_requested: number | null;
  minimum_investment: number | null;
  amount_received: number | null;
  currency: string | null;
  term_months: number | null;
  installment_count: number | null;
  interest_rate: number | null;
  address: string | null;
  city: string | null;
  country: string | null;
  publication_end_date: string | null;
  status: string | null;
  photo_urls: string[] | null;
  video_url: string | null;
  owner_user_id: string | null;
  owner_id: string | null;
  owner_wallet: string | null;
  metadata?: Record<string, unknown> | null;
};

type Translate = (key: string, values?: Record<string, string | number>) => string;

const formatAmount = (amount: number | null, currency: string | null, noAmountLabel: string) => {
  if (amount === null || amount === undefined) return noAmountLabel;
  const code = currency ?? 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
};

const normalizePhotos = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const coerceText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const coerceNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const coerceTextList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => coerceText(item)).filter(Boolean);
  }

  const text = coerceText(value);
  if (!text) return [];

  return text
    .split(/\n+|;\s*|,\s(?=[A-Z0-9])/)
    .map((item) => item.replace(/^[-*\u2022]\s*/, '').trim())
    .filter(Boolean);
};

const getOptimizedSection = (optimized: Record<string, unknown>, keys: string[]) => {
  const sections = optimized.sections;

  if (isPlainObject(sections)) {
    for (const key of keys) {
      const value = sections[key];
      const textValue = coerceText(value);
      if (textValue) return textValue;

      if (isPlainObject(value)) {
        const paragraph = coerceText(value.paragraph) || coerceText(value.body) || coerceText(value.description);
        if (paragraph) return paragraph;
      }
    }
  }

  for (const key of keys) {
    const value = optimized[key];
    const textValue = coerceText(value);
    if (textValue) return textValue;

    if (isPlainObject(value)) {
      const paragraph = coerceText(value.paragraph);
      if (paragraph) return paragraph;
    }
  }
  return '';
};

const getMetadataObject = (project: ProjectDetail | null, key: string) => {
  const value = project?.metadata?.[key];
  return isPlainObject(value) ? value : {};
};

const buildDetailMetrics = (
  project: ProjectDetail,
  formFields: Record<string, unknown>,
  t: Translate
): OpportunityMetric[] => [
  {
    label: 'Operating time',
    value: coerceText(formFields.operating_time) || coerceText(project.metadata?.operating_time) || t('ratePending'),
    icon: 'time',
  },
  {
    label: 'Monthly clients',
    value: coerceText(formFields.monthly_clients) || coerceText(formFields.monthly_customers) || t('ratePending'),
    icon: 'clients',
  },
  {
    label: 'Monthly sales',
    value:
      coerceText(formFields.monthly_sales) ||
      coerceText(formFields.monthly_revenue) ||
      formatAmount(coerceNumber(formFields.monthly_sales), project.currency, t('noAmount')),
    icon: 'sales',
  },
  {
    label: 'Average ticket',
    value: coerceText(formFields.average_ticket) || coerceText(formFields.avg_ticket) || t('ratePending'),
    icon: 'ticket',
  },
];

const buildOptimizedDetailSections = (
  optimized: Record<string, unknown>,
  businessName: string
): OpportunitySection[] => {
  const definitions: Array<{
    title: string;
    icon: OpportunitySection['icon'];
    keys: string[];
    bullets?: string[];
  }> = [
    {
      title: `About ${businessName}`,
      icon: 'overview',
      keys: ['overview', 'about', 'what_we_do', 'whatWeDo'],
    },
    {
      title: 'Description',
      icon: 'what',
      keys: ['description', 'summary', 'overview'],
    },
    {
      title: 'Highlights',
      icon: 'traction',
      keys: ['highlights'],
      bullets: coerceTextList(optimized.highlights),
    },
    {
      title: 'Value',
      icon: 'traction',
      keys: ['traction', 'value', 'financialInformation', 'financial_information'],
    },
    {
      title: 'Market Opportunity',
      icon: 'market',
      keys: ['market_opportunity', 'marketOpportunity', 'target'],
    },
    {
      title: 'Use of Funds',
      icon: 'funds',
      keys: ['use_of_funds', 'useOfFunds', 'investment'],
    },
    {
      title: 'Investor Notes',
      icon: 'investment',
      keys: ['investor_notes', 'investorNotes'],
    },
    {
      title: 'Owner Profile',
      icon: 'team',
      keys: ['extras', 'team', 'owner_profile', 'founder_profile'],
    },
    {
      title: 'Gallery',
      icon: 'gallery',
      keys: ['gallery', 'media', 'multimedia'],
    },
  ];

  return definitions
    .map((definition) => {
      const body = getOptimizedSection(optimized, definition.keys);
      return {
        title: definition.title,
        body,
        bullets: definition.bullets,
        icon: definition.icon,
      };
    })
    .filter((section) => section.body || section.bullets?.length || section.icon === 'gallery');
};

const buildFallbackDetailSections = (
  project: ProjectDetail,
  formFields: Record<string, unknown>,
  t: Translate
): OpportunitySection[] => {
  const sections: OpportunitySection[] = [
    {
      title: t('Detail.overview'),
      body: project.description,
      icon: 'overview',
    },
    {
      title: t('Detail.whatWeDo'),
      body:
        [
          coerceText(formFields.product_description)
            ? t('Detail.productOrService', { value: coerceText(formFields.product_description) })
            : '',
          coerceText(formFields.problem_solved)
            ? t('Detail.problemSolved', { value: coerceText(formFields.problem_solved) })
            : '',
        ]
          .filter(Boolean)
          .join('\n\n') || project.description,
      icon: 'what',
    },
    {
      title: t('Detail.howWeDoIt'),
      body: coerceText(formFields.differentiation),
      icon: 'how',
    },
    {
      title: t('Detail.financialInformation'),
      body: [
        coerceText(formFields.monthly_revenue)
          ? t('Detail.monthlyRevenue', { value: coerceText(formFields.monthly_revenue) })
          : '',
        coerceText(formFields.avg_ticket) ? t('Detail.averageTicket', { value: coerceText(formFields.avg_ticket) }) : '',
        coerceText(formFields.monthly_customers)
          ? t('Detail.monthlyCustomers', { value: coerceText(formFields.monthly_customers) })
          : '',
        coerceText(formFields.growth_rate) ? t('Detail.growth', { value: coerceText(formFields.growth_rate) }) : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      icon: 'financial',
    },
    {
      title: t('Detail.investment'),
      body: [
        project.amount_requested !== null && project.amount_requested !== undefined
          ? t('Detail.capitalNeeded', {
              value: formatAmount(project.amount_requested, project.currency, t('noAmount')),
            })
          : '',
        coerceText(formFields.funds_usage) ? t('Detail.useOfFunds', { value: coerceText(formFields.funds_usage) }) : '',
        project.interest_rate ? t('Detail.annualInterestRate', { value: `${project.interest_rate}% EA` }) : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      icon: 'investment',
    },
    {
      title: t('Detail.target'),
      body: [formFields.target_customer, formFields.market_size, formFields.competition]
        .map(coerceText)
        .filter(Boolean)
        .join('\n\n'),
      icon: 'target',
    },
    {
      title: t('Detail.team'),
      body: [
        coerceText(formFields.founder_info) ? t('Detail.founder', { value: coerceText(formFields.founder_info) }) : '',
        coerceText(formFields.team_info) ? t('Detail.teamLabel', { value: coerceText(formFields.team_info) }) : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      icon: 'team',
    },
    {
      title: t('Detail.extras'),
      body: [
        coerceText(formFields.testimonials) ? t('Detail.testimonials', { value: coerceText(formFields.testimonials) }) : '',
        coerceText(formFields.achievements) ? t('Detail.achievements', { value: coerceText(formFields.achievements) }) : '',
        coerceText(formFields.timing_reason) ? t('Detail.timing', { value: coerceText(formFields.timing_reason) }) : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      icon: 'extras',
    },
  ];

  return sections.filter((section) => section.body);
};

const buildDetailSections = (
  project: ProjectDetail,
  formFields: Record<string, unknown>,
  optimized: Record<string, unknown>,
  t: Translate
): OpportunitySection[] => {
  const businessName = coerceText(formFields.business_name) || project.business_name || project.title || 'Business';
  const optimizedSections = buildOptimizedDetailSections(optimized, businessName);
  return optimizedSections.length ? optimizedSections : buildFallbackDetailSections(project, formFields, t);
};

const buildDetailBadges = (
  project: ProjectDetail,
  formFields: Record<string, unknown>,
  category: string,
  t: Translate
): OpportunityBadge[] => {
  const address =
    coerceText(formFields.business_address) ||
    coerceText(project.address) ||
    [project.city, project.country].map(coerceText).filter(Boolean).join(', ') ||
    t('locationPending');
  const minimumInvestment =
    coerceText(formFields.minimum_investment) ||
    (project.minimum_investment
      ? formatAmount(project.minimum_investment, project.currency, t('noAmount'))
      : 'Not connected yet');
  const interestRate = coerceText(formFields.interest_rate_ea) || (project.interest_rate ? `${project.interest_rate}% EA` : t('ratePending'));
  const roundCloseDate = coerceText(formFields.round_close_date) || project.publication_end_date || t('ratePending');

  return [
    { label: 'business_address', value: address, icon: 'location' },
    { label: 'business_category', value: coerceText(formFields.business_category) || category, icon: 'category' },
    { label: 'Minimum investment', value: minimumInvestment, icon: 'investment' },
    { label: 'interest_rate_ea', value: interestRate, icon: 'rate' },
    { label: 'round_close_date', value: roundCloseDate, icon: 'calendar' },
  ].filter((badge) => badge.value) as OpportunityBadge[];
};

const buildGalleryItems = (project: ProjectDetail): OpportunityGalleryItem[] => [
  ...(project.photo_urls ?? []).map((src, index) => ({
    type: 'image' as const,
    src,
    alt: `${project.title} ${index + 1}`,
  })),
  ...(project.video_url
    ? [
        {
          type: 'video' as const,
          src: project.video_url,
          alt: `${project.title} video`,
        },
      ]
    : []),
];

export default function FeedDetailPage() {
  const t = useTranslations('Feed');
  const router = useRouter();
  const params = useParams();
  const projectId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const { getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado } = useInvestApp();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        setStatus(t('Detail.listingNotFound'));
        setLoading(false);
        return;
      }
      setLoading(true);
      setStatus('');
      const { data, error } = await fetchProjectById(projectId, getAccessToken);

      if (error) {
        setStatus(t('Detail.loadListingError', { error }));
        setLoading(false);
        return;
      }

      const normalizedProject = data
        ? ({
            ...(data as ProjectDetail),
            photo_urls: normalizePhotos((data as ProjectDetail).photo_urls),
          } as ProjectDetail)
        : null;

      if (
        normalizedProject &&
        rolSeleccionado !== 'emprendedor' &&
        !isProjectPubliclyVisible(normalizedProject)
      ) {
        setProject(null);
        setStatus(t('Detail.inactiveListing'));
        setLoading(false);
        return;
      }

      setProject(normalizedProject);
      setLoading(false);
    };

    loadProject();
  }, [getAccessToken, projectId, rolSeleccionado, t]);

  const isEntrepreneurView = rolSeleccionado === 'emprendedor';

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/feed/${project?.id ?? projectId}`;
  };

  const openSharePopup = () => {
    setShareStatus('');
    setShowShareOptions(true);
  };

  const shareText = project?.title
    ? t('Detail.shareTextProject', { title: project.title })
    : t('Detail.shareTextGeneric');

  const copyShareLink = async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      setShareStatus(t('Detail.linkCopied'));
    } catch {
      setShareStatus(t('Detail.copyLinkError'));
    }
  };

  const openShareWindow = (url: string) => {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formFields = getMetadataObject(project, 'publication_form_fields');
  const optimizedPublication = getMetadataObject(project, 'optimized_publication');
  const detailTitle = project
    ? coerceText(optimizedPublication.tittle) || coerceText(optimizedPublication.title) || project.title
    : '';
  const detailSubtitle = project
    ? coerceText(optimizedPublication.summary) ||
      (project.business_name ? t('Detail.investInBusinessToday', { business: project.business_name }) : undefined)
    : undefined;
  const locationLabel = project
    ? coerceText(formFields.location) ||
      [project.city, project.country]
        .map((item) => coerceText(item))
        .filter((item) => item && item.toLowerCase() !== 'not specified')
        .join(', ') ||
      t('locationPending')
    : '';
  const categoryLabel = project?.sector ? toEnglishSector(project.sector) : t('Detail.business');
  const primaryActionLabel = isEntrepreneurView ? t('edit') : t('invest');
  const secondaryActionLabel = isEntrepreneurView ? t('Detail.share') : t('Detail.contactFounder');
  const detailT: Translate = (key, values) => t(key as never, values as never);

  const handlePrimaryAction = () => {
    if (!project) return;
    if (isEntrepreneurView) {
      router.push(`/portfolio?edit=${project.id}`);
      return;
    }
    router.push(`/feed/${project.id}/invest`);
  };

  const renderLoadingState = (desktop = false) => (
    <div className={desktop ? 'rounded-[24px] border border-[#E9ECF4] bg-white p-6 shadow-[0_18px_42px_rgba(21,28,44,0.055)]' : 'mx-auto max-w-xl'}>
      <SectionLoadingSkeleton rows={4} />
    </div>
  );

  const renderStatusState = (desktop = false) => (
    <div
      className={
        desktop
          ? 'rounded-[24px] border border-[#E9ECF4] bg-white p-6 text-sm font-medium text-[#65708A] shadow-[0_18px_42px_rgba(21,28,44,0.055)]'
          : 'mx-auto max-w-xl rounded-[28px] bg-white/88 p-5 text-sm text-[#65708A] shadow-[0_22px_64px_rgba(27,35,58,0.08)]'
      }
    >
      {status}
    </div>
  );

  const renderProjectDetail = () => {
    if (!project) return null;

    return (
      <InvestmentOpportunityDetail
        title={detailTitle}
        subtitle={detailSubtitle}
        location={locationLabel}
        category={categoryLabel}
        rate={project.interest_rate ? `${project.interest_rate}% EA` : undefined}
        images={project.photo_urls ?? []}
        videoUrl={project.video_url}
        badges={buildDetailBadges(project, formFields, categoryLabel, detailT)}
        galleryItems={buildGalleryItems(project)}
        metrics={buildDetailMetrics(project, formFields, detailT)}
        sections={buildDetailSections(project, formFields, optimizedPublication, detailT)}
        primaryActionLabel={primaryActionLabel}
        secondaryActionLabel={secondaryActionLabel}
        onPrimaryAction={handlePrimaryAction}
        onSecondaryAction={openSharePopup}
        onBack={() => router.back()}
        primaryDisabled={!isEntrepreneurView && !project.owner_wallet}
      />
    );
  };

  return (
    <>
      {loading ? (
        <>
          <main className="min-h-screen bg-[#F8FAFE] px-4 py-8 lg:hidden">
            {renderLoadingState()}
          </main>
          <DesktopAppShell title={t('Detail.ventureDetail')} hideHeader maxWidthClassName="max-w-none">
            {renderLoadingState(true)}
          </DesktopAppShell>
        </>
      ) : null}

      {!loading && status && !project ? (
        <>
          <main className="min-h-screen bg-[#F8FAFE] px-4 py-8 lg:hidden">
            {renderStatusState()}
          </main>
          <DesktopAppShell title={t('Detail.ventureDetail')} hideHeader maxWidthClassName="max-w-none">
            {renderStatusState(true)}
          </DesktopAppShell>
        </>
      ) : null}

      {!loading && project ? (
        <>
          <div className="lg:hidden">{renderProjectDetail()}</div>
          <DesktopAppShell title={t('Detail.ventureDetail')} hideHeader maxWidthClassName="max-w-none">
            {renderProjectDetail()}
          </DesktopAppShell>
        </>
      ) : null}

      {showShareOptions && project ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-white/25 bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(238,244,255,0.86))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B39F4]">{t('Detail.share')}</p>
                <h3 className="mt-2 text-xl font-semibold text-[#0F172A]">{project.title}</h3>
                <p className="mt-2 text-sm text-[#666D80]">{t('Detail.shareDescription')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowShareOptions(false)}
                className="rounded-full border border-white/40 bg-white/70 px-3 py-1 text-sm font-semibold text-[#0F172A]"
              >
                {t('Detail.close')}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {typeof navigator !== 'undefined' && navigator.share ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.share({ title: project.title, text: shareText, url: getShareUrl() });
                      setShowShareOptions(false);
                    } catch {
                      setShareStatus(t('Detail.shareCancelled'));
                    }
                  }}
                  className="rounded-[18px] border border-white/25 bg-white/80 px-4 py-4 text-sm font-semibold text-[#0F172A] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                >
                  {t('Detail.nativeShare')}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void copyShareLink()}
                className="rounded-[18px] border border-white/25 bg-white/80 px-4 py-4 text-sm font-semibold text-[#0F172A] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              >
                {t('Detail.copyLink')}
              </button>
              <button
                type="button"
                onClick={() =>
                  openShareWindow(
                    `https://wa.me/?text=${encodeURIComponent(`${shareText} ${getShareUrl()}`)}`
                  )
                }
                className="rounded-[18px] border border-white/25 bg-white/80 px-4 py-4 text-sm font-semibold text-[#0F172A] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() =>
                  openShareWindow(
                    `https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(shareText)}`
                  )
                }
                className="rounded-[18px] border border-white/25 bg-white/80 px-4 py-4 text-sm font-semibold text-[#0F172A] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              >
                Telegram
              </button>
              <button
                type="button"
                onClick={() =>
                  openShareWindow(
                    `mailto:?subject=${encodeURIComponent(project.title)}&body=${encodeURIComponent(`${shareText}\n\n${getShareUrl()}`)}`
                  )
                }
                className="col-span-2 rounded-[18px] border border-white/25 bg-white/80 px-4 py-4 text-sm font-semibold text-[#0F172A] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              >
                Email
              </button>
            </div>

            {shareStatus ? <p className="mt-4 text-sm text-[#6B39F4]">{shareStatus}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
