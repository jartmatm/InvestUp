'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useLocale, useTranslations } from 'next-intl';
import PageFrame from '@/components/PageFrame';
import { SectionLoadingSkeleton } from '@/components/AppLoadingSkeleton';
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
  owner_user_id: string | null;
  owner_wallet: string | null;
  city: string | null;
  country: string | null;
  photo_urls: string[] | null;
};

type OwnerProfile = {
  name: string | null;
  surname: string | null;
  email: string | null;
  wallet_address: string | null;
};

const normalizePhotos = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

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

  return (
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
  );
}
