'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { SectionLoadingSkeleton } from '@/components/AppLoadingSkeleton';
import InvestmentOpportunityDetail, {
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
  city: string | null;
  country: string | null;
  publication_end_date: string | null;
  status: string | null;
  photo_urls: string[] | null;
  video_url: string | null;
  owner_user_id: string | null;
  owner_wallet: string | null;
  metadata?: Record<string, unknown> | null;
};

const formatAmount = (amount: number | null, currency: string | null) => {
  if (amount === null || amount === undefined) return 'No amount';
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

const getOptimizedSection = (optimized: Record<string, unknown>, keys: string[]) => {
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
  formFields: Record<string, unknown>
): OpportunityMetric[] => [
  {
    label: 'Funding Goal',
    value: formatAmount(project.amount_requested, project.currency),
    icon: 'goal',
  },
  {
    label: 'Annual Rate',
    value: project.interest_rate ? `${project.interest_rate}% EA` : 'Pending',
    icon: 'rate',
  },
  {
    label: 'Monthly Sales',
    value: formatAmount(coerceNumber(formFields.monthly_revenue), project.currency),
    icon: 'sales',
  },
  {
    label: 'Active Clients',
    value: coerceText(formFields.monthly_customers) || 'Pending',
    icon: 'clients',
  },
];

const buildOptimizedDetailSections = (optimized: Record<string, unknown>): OpportunitySection[] => {
  const definitions: Array<{
    title: string;
    icon: OpportunitySection['icon'];
    keys: string[];
  }> = [
    {
      title: 'Overview',
      icon: 'overview',
      keys: ['overview'],
    },
    {
      title: 'What we do',
      icon: 'what',
      keys: ['whatWeDo', 'what_we_do'],
    },
    {
      title: 'How we do it',
      icon: 'how',
      keys: ['howWeDoIt', 'how_we_do_it'],
    },
    {
      title: 'Financial information',
      icon: 'financial',
      keys: ['financialInformation', 'financial_information'],
    },
    {
      title: 'Investment',
      icon: 'investment',
      keys: ['investment'],
    },
    {
      title: 'Target',
      icon: 'target',
      keys: ['target'],
    },
    {
      title: 'Team',
      icon: 'team',
      keys: ['team'],
    },
    {
      title: 'Gallery',
      icon: 'gallery',
      keys: ['gallery'],
    },
    {
      title: 'Extras',
      icon: 'extras',
      keys: ['extras'],
    },
  ];

  return definitions
    .map((definition) => ({
      title: definition.title,
      body: getOptimizedSection(optimized, definition.keys),
      icon: definition.icon,
    }))
    .filter((section) => section.body);
};

const buildFallbackDetailSections = (
  project: ProjectDetail,
  formFields: Record<string, unknown>
): OpportunitySection[] => {
  const sections: OpportunitySection[] = [
    {
      title: 'Overview',
      body: project.description,
      icon: 'overview',
    },
    {
      title: 'What we do',
      body:
        [
          coerceText(formFields.product_description)
            ? `Product or service: ${coerceText(formFields.product_description)}`
            : '',
          coerceText(formFields.problem_solved)
            ? `Problem solved: ${coerceText(formFields.problem_solved)}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n') || project.description,
      icon: 'what',
    },
    {
      title: 'How we do it',
      body: coerceText(formFields.differentiation),
      icon: 'how',
    },
    {
      title: 'Financial information',
      body: [
        coerceText(formFields.monthly_revenue)
          ? `Monthly revenue: ${coerceText(formFields.monthly_revenue)}`
          : '',
        coerceText(formFields.avg_ticket) ? `Average ticket: ${coerceText(formFields.avg_ticket)}` : '',
        coerceText(formFields.monthly_customers)
          ? `Monthly customers: ${coerceText(formFields.monthly_customers)}`
          : '',
        coerceText(formFields.growth_rate) ? `Growth: ${coerceText(formFields.growth_rate)}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      icon: 'financial',
    },
    {
      title: 'Investment',
      body: [
        project.amount_requested !== null && project.amount_requested !== undefined
          ? `Capital needed: ${formatAmount(project.amount_requested, project.currency)}`
          : '',
        coerceText(formFields.funds_usage) ? `Use of funds: ${coerceText(formFields.funds_usage)}` : '',
        project.interest_rate ? `Annual interest rate: ${project.interest_rate}% EA` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      icon: 'investment',
    },
    {
      title: 'Target',
      body: [formFields.target_customer, formFields.market_size, formFields.competition]
        .map(coerceText)
        .filter(Boolean)
        .join('\n\n'),
      icon: 'target',
    },
    {
      title: 'Team',
      body: [
        coerceText(formFields.founder_info) ? `Founder: ${coerceText(formFields.founder_info)}` : '',
        coerceText(formFields.team_info) ? `Team: ${coerceText(formFields.team_info)}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      icon: 'team',
    },
    {
      title: 'Extras',
      body: [
        coerceText(formFields.testimonials) ? `Testimonials: ${coerceText(formFields.testimonials)}` : '',
        coerceText(formFields.achievements) ? `Achievements: ${coerceText(formFields.achievements)}` : '',
        coerceText(formFields.timing_reason) ? `Timing: ${coerceText(formFields.timing_reason)}` : '',
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
  optimized: Record<string, unknown>
): OpportunitySection[] => {
  const optimizedSections = buildOptimizedDetailSections(optimized);
  return optimizedSections.length ? optimizedSections : buildFallbackDetailSections(project, formFields);
};

export default function FeedDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const { user, getAccessToken } = usePrivy();
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
        setStatus('Listing not found.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setStatus('');
      const { data, error } = await fetchProjectById(projectId, getAccessToken);

      if (error) {
        setStatus(`Could not load the listing: ${error}`);
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
        setStatus('This listing is no longer active for new investments.');
        setLoading(false);
        return;
      }

      setProject(normalizedProject);
      setLoading(false);
    };

    loadProject();
  }, [getAccessToken, projectId, rolSeleccionado]);

  const isEntrepreneurView = rolSeleccionado === 'emprendedor';
  const canEditProject = Boolean(isEntrepreneurView && user?.id && project?.owner_user_id === user.id);

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/feed/${project?.id ?? projectId}`;
  };

  const openSharePopup = () => {
    setShareStatus('');
    setShowShareOptions(true);
  };

  const shareText = project?.title ? `Check out ${project.title} on InvestApp` : 'Check out this venture on InvestApp';

  const copyShareLink = async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      setShareStatus('Link copied.');
    } catch {
      setShareStatus('Could not copy the link.');
    }
  };

  const openShareWindow = (url: string) => {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formFields = getMetadataObject(project, 'publication_form_fields');
  const optimizedPublication = getMetadataObject(project, 'optimized_publication');
  const detailTitle = project
    ? coerceText(optimizedPublication.title) || coerceText(optimizedPublication.tittle) || project.title
    : '';
  const detailSubtitle = project
    ? coerceText(optimizedPublication.summary) ||
      (project.business_name ? `Invest in ${project.business_name} today.` : undefined)
    : undefined;
  const locationLabel = project
    ? coerceText(formFields.location) ||
      [project.city, project.country]
        .map((item) => coerceText(item))
        .filter((item) => item && item.toLowerCase() !== 'not specified')
        .join(', ') ||
      'Location pending'
    : '';
  const primaryActionLabel = canEditProject ? 'Edit' : isEntrepreneurView ? 'Share' : 'Invest';
  const secondaryActionLabel = isEntrepreneurView ? 'Share' : 'Contact Founder';

  const handlePrimaryAction = () => {
    if (!project) return;
    if (canEditProject) {
      router.push(`/portfolio?edit=${project.id}`);
      return;
    }
    if (isEntrepreneurView) {
      openSharePopup();
      return;
    }
    router.push(`/feed/${project.id}/invest`);
  };

  return (
    <>
      {loading ? (
        <main className="min-h-screen bg-[#F8FAFE] px-4 py-8">
          <div className="mx-auto max-w-xl">
            <SectionLoadingSkeleton rows={4} />
          </div>
        </main>
      ) : null}

      {!loading && status && !project ? (
        <main className="min-h-screen bg-[#F8FAFE] px-4 py-8">
          <div className="mx-auto max-w-xl rounded-[28px] bg-white/88 p-5 text-sm text-[#65708A] shadow-[0_22px_64px_rgba(27,35,58,0.08)]">
            {status}
          </div>
        </main>
      ) : null}

      {!loading && project ? (
        <InvestmentOpportunityDetail
          title={detailTitle}
          subtitle={detailSubtitle}
          location={locationLabel}
          category={project.sector ? toEnglishSector(project.sector) : 'Business'}
          rate={project.interest_rate ? `${project.interest_rate}% EA` : undefined}
          images={project.photo_urls ?? []}
          metrics={buildDetailMetrics(project, formFields)}
          sections={buildDetailSections(project, formFields, optimizedPublication)}
          primaryActionLabel={primaryActionLabel}
          secondaryActionLabel={secondaryActionLabel}
          onPrimaryAction={handlePrimaryAction}
          onSecondaryAction={openSharePopup}
          onBack={() => router.back()}
          primaryDisabled={!isEntrepreneurView && !project.owner_wallet}
        />
      ) : null}

      {showShareOptions && project ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-white/25 bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(238,244,255,0.86))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B39F4]">Share</p>
                <h3 className="mt-2 text-xl font-semibold text-[#0F172A]">{project.title}</h3>
                <p className="mt-2 text-sm text-[#666D80]">Choose how you want to share this venture.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowShareOptions(false)}
                className="rounded-full border border-white/40 bg-white/70 px-3 py-1 text-sm font-semibold text-[#0F172A]"
              >
                Close
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
                      setShareStatus('Share was cancelled.');
                    }
                  }}
                  className="rounded-[18px] border border-white/25 bg-white/80 px-4 py-4 text-sm font-semibold text-[#0F172A] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                >
                  Native share
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void copyShareLink()}
                className="rounded-[18px] border border-white/25 bg-white/80 px-4 py-4 text-sm font-semibold text-[#0F172A] shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              >
                Copy link
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
