'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import PageFrame from '@/components/PageFrame';
import ProjectPhotoCarousel from '@/components/ProjectPhotoCarousel';
import { useInvestUp } from '@/lib/investup-context';
import { calculateInvestmentProjection } from '@/lib/investment-math';
import { setPendingInvestment } from '@/lib/pending-investment';
import { ACTIVE_PROJECT_STATUSES } from '@/lib/project-status';
import { toEnglishSector } from '@/lib/sector-labels';

type ProjectInvestmentDetail = {
  id: string;
  title: string;
  description: string;
  business_name: string | null;
  sector: string | null;
  amount_requested: number | null;
  currency: string | null;
  term_months: number | null;
  interest_rate: number | null;
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

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const normalizePhotos = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

export default function ProjectInvestPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const { getAccessToken } = usePrivy();
  const { faseApp } = useInvestUp();
  const [project, setProject] = useState<ProjectInvestmentDetail | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [amount, setAmount] = useState('100.00');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const supabase = useMemo(() => {
    const authedFetch: typeof fetch = async (input, init = {}) => {
      const token = await getAccessToken();
      const baseHeaders = new Headers(init.headers ?? {});
      baseHeaders.set('apikey', SUPABASE_ANON_KEY);
      const run = (headers: Headers) => fetch(input, { ...init, headers });
      if (!token) return run(baseHeaders);

      const headersWithAuth = new Headers(baseHeaders);
      headersWithAuth.set('Authorization', `Bearer ${token}`);
      const response = await run(headersWithAuth);
      if (response.ok) return response;

      const raw = (await response.clone().text()).toLowerCase();
      const shouldFallback =
        response.status === 401 ||
        response.status === 403 ||
        raw.includes('no suitable key') ||
        raw.includes('wrong key type') ||
        raw.includes('invalid jwt');
      if (!shouldFallback) return response;
      return run(baseHeaders);
    };

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: authedFetch },
    });
  }, [getAccessToken]);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        setStatus('We could not find this venture.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setStatus('');

      const { data, error } = await supabase
        .from('projects')
        .select(
          'id,title,description,business_name,sector,amount_requested,currency,term_months,interest_rate,owner_user_id,owner_wallet,city,country,photo_urls'
        )
        .eq('id', projectId)
        .in('status', ACTIVE_PROJECT_STATUSES)
        .maybeSingle();

      if (error) {
        setStatus(`Could not load the project: ${error.message}`);
        setLoading(false);
        return;
      }

      const normalizedProject = data
        ? ({
            ...(data as ProjectInvestmentDetail),
            photo_urls: normalizePhotos((data as ProjectInvestmentDetail).photo_urls),
          } as ProjectInvestmentDetail)
        : null;
      setProject(normalizedProject);

      if (normalizedProject?.owner_user_id) {
        const { data: ownerData } = await supabase
          .from('users')
          .select('name,surname,email,wallet_address')
          .eq('id', normalizedProject.owner_user_id)
          .maybeSingle();
        setOwner((ownerData ?? null) as OwnerProfile | null);
      } else {
        setOwner(null);
      }

      const suggestedAmount = normalizedProject?.amount_requested
        ? Math.max(1, Math.min(Number(normalizedProject.amount_requested), 100))
        : 100;
      setAmount(suggestedAmount.toFixed(2));
      setLoading(false);
    };

    loadProject();
  }, [projectId, supabase]);

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
  const safeTermMonths = Number(project?.term_months ?? 0);
  const currencyCode = project?.currency ?? 'USD';
  const projection = useMemo(
    () =>
      calculateInvestmentProjection({
        amountUsdc: Number.isFinite(amountNumber) ? amountNumber : 0,
        interestRateEa: safeInterestRate,
        termMonths: safeTermMonths,
      }),
    [amountNumber, safeInterestRate, safeTermMonths]
  );

  const entrepreneurName = useMemo(() => {
    const ownerName = `${owner?.name ?? ''} ${owner?.surname ?? ''}`.trim();
    if (ownerName) return ownerName;
    if (owner?.email) return owner.email.split('@')[0];
    if (project?.business_name) return project.business_name;
    return 'Entrepreneur';
  }, [owner?.email, owner?.name, owner?.surname, project?.business_name]);

  const entrepreneurWallet = project?.owner_wallet ?? owner?.wallet_address ?? '';
  const canContinue = Boolean(project && entrepreneurWallet && amountNumber > 0);
  const quickAmounts = [50, 100, 250, 500];

  const handleContinue = () => {
    if (!project) {
      setStatus('The project needs to load first.');
      return;
    }
    if (!entrepreneurWallet) {
      setStatus('This venture does not have a wallet ready to receive the investment yet.');
      return;
    }
    if (!amountNumber || amountNumber <= 0) {
      setStatus('Enter a valid investment amount.');
      return;
    }

    setPendingInvestment({
      projectId: project.id,
      projectTitle: project.title,
      entrepreneurUserId: project.owner_user_id ?? '',
      entrepreneurName,
      entrepreneurWallet,
      amountUsdc: amountNumber.toFixed(2),
      interestRateEa: safeInterestRate,
      termMonths: safeTermMonths,
      projectedReturnUsdc: projection.projectedReturnUsdc.toFixed(2),
      projectedTotalUsdc: projection.projectedTotalUsdc.toFixed(2),
      currency: 'USDC',
      createdAt: new Date().toISOString(),
    });

    router.push('/invest');
  };

  return (
    <PageFrame title="Invest" subtitle="Simulate your return before transferring">
      {loading ? <p className="text-sm text-gray-500">Loading simulator...</p> : null}
      {status ? <p className="mb-4 text-sm text-rose-600">{status}</p> : null}

      {!loading && project ? (
        <div className="space-y-4 pb-8">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border border-white/25 bg-white/20 px-4 py-2 text-sm font-semibold text-gray-700 backdrop-blur-md"
            >
              Back
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
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Project</p>
                <h2 className="mt-1 text-xl font-semibold text-gray-900">{project.title}</h2>
                <p className="mt-2 text-sm text-gray-600">{entrepreneurName}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {project.city || project.country
                    ? `${project.city ?? ''} ${project.country ?? ''}`.trim()
                    : 'Location pending'}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200/50 bg-emerald-50/40 px-4 py-3 text-right backdrop-blur-md">
                <p className="text-xs text-emerald-700">Published target</p>
                <p className="mt-1 text-sm font-semibold text-emerald-900">
                  {formatCurrency(Number(project.amount_requested ?? 0), currencyCode)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-700">{project.description}</p>

            <div className="mt-4 rounded-2xl border border-white/25 bg-white/15 p-4">
              <p className="text-xs text-gray-500">Entrepreneur wallet</p>
              <p className="mt-1 break-all text-sm font-medium text-gray-800">
                {entrepreneurWallet || 'Configuration pending'}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/25 bg-white/20 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-sm font-semibold text-gray-900">Amount to invest</p>
            <div className="mt-4 rounded-2xl border border-white/25 bg-white/15 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Selected amount</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {(formatAmountInput(amount) || '0.00')} USDC
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
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Custom amount</p>
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/25 bg-white/20 px-4 py-4">
                <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  USDC
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => handleAmountChange(event.target.value)}
                  onBlur={() => setAmount(formatAmountInput(amount))}
                  placeholder="Enter the amount you want to invest"
                  className="w-full bg-transparent text-lg font-semibold text-gray-900 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <p className="text-xs text-gray-500">EA rate</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">{safeInterestRate}%</p>
            </div>
            <div className="rounded-3xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <p className="text-xs text-gray-500">Term</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">{safeTermMonths || 0} months</p>
            </div>
            <div className="rounded-3xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <p className="text-xs text-gray-500">Effective yield</p>
              <p className="mt-2 text-lg font-semibold text-emerald-700">{projection.effectiveRate}%</p>
            </div>
            <div className="rounded-3xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <p className="text-xs text-gray-500">Estimated return</p>
              <p className="mt-2 text-lg font-semibold text-emerald-700">
                {formatCurrency(projection.projectedReturnUsdc, 'USD')}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-primary/15 bg-primary/10 p-5 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Projected result</p>
            <p className="mt-3 text-3xl font-semibold text-primary">
              {formatCurrency(projection.projectedTotalUsdc, 'USD')}
            </p>
            <p className="mt-2 text-sm text-primary/80">
              This estimate uses the listing&apos;s effective annual rate and converts it to the project term.
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
            Confirm investment
          </button>
        </div>
      ) : null}
    </PageFrame>
  );
}
