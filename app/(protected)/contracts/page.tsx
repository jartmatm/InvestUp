'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import PageFrame from '@/components/PageFrame';
import PaymentScheduleTable from '@/components/PaymentScheduleTable';
import {
  buildInvestmentContractSnapshot,
  buildInvestmentContractSource,
  type InvestmentContractSnapshot,
} from '@/lib/investment-contract';
import { normalizePaymentScheduleRecord } from '@/lib/payment-schedule';
import { useInvestApp } from '@/lib/investapp-context';
import { runUserDirectoryQuery } from '@/utils/supabase/user-directory';

type ProjectRow = {
  id: string | number;
  title: string | null;
  business_name: string | null;
  description: string | null;
  currency: string | null;
  owner_user_id: string | null;
  owner_wallet: string | null;
};

type UserProfile = {
  id: string;
  name: string | null;
  surname: string | null;
  avatar_url: string | null;
  country: string | null;
  wallet_address: string | null;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const nameFromProfile = (profile: UserProfile | undefined, fallback: string) => {
  const fullName = `${profile?.name ?? ''} ${profile?.surname ?? ''}`.trim();
  if (fullName) return fullName;
  if (profile?.wallet_address) return `${profile.wallet_address.slice(0, 6)}...`;
  return fallback;
};

const getMetadataText = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const statusClasses: Record<InvestmentContractSnapshot['status'], string> = {
  Pending: 'border-slate-200 bg-slate-50 text-slate-700',
  Active: 'border-[#40C4AA]/30 bg-[#EFFFF8] text-[#1A8E78]',
  Paid: 'border-[#6B39F4]/20 bg-[#F4EEFF] text-[#5A2DD6]',
  Defaulted: 'border-[#DF1C41]/20 bg-[#FFF1F3] text-[#B01835]',
};

const formatMoney = (value: number, currency: string) => {
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

const formatDate = (value: string | null) => {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
};

const normalizeProjectId = (value: string) =>
  Number.isFinite(Number(value)) ? Number(value) : value;

export default function ContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getAccessToken } = usePrivy();
  const { faseApp } = useInvestApp();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [snapshot, setSnapshot] = useState<InvestmentContractSnapshot | null>(null);
  const [contractSource, setContractSource] = useState('');

  const creditId = searchParams.get('credit') ?? '';

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

      return shouldFallback ? run(baseHeaders) : response;
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
    const loadContract = async () => {
      if (!creditId) {
        setStatus('Select a contract first.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setStatus('');

      const { data: scheduleData, error: scheduleError } = await supabase
        .from('payment_schedule')
        .select(
          'id,credit_id,project_id,investor_user_id,entrepreneur_user_id,annual_interest_rate,monthly_interest_rate,installment_count,current_installment_number,schedule_start_date,next_due_date,original_principal,total_paid_amount,current_installment_amount,outstanding_balance,status,tx_hash,payment_plan,metadata'
        )
        .eq('credit_id', creditId)
        .maybeSingle();

      if (scheduleError || !scheduleData) {
        setStatus('Could not load this contract right now.');
        setSnapshot(null);
        setContractSource('');
        setLoading(false);
        return;
      }

      const scheduleRecord = normalizePaymentScheduleRecord(
        scheduleData as Record<string, unknown>
      );

      if (
        user?.id &&
        scheduleRecord.investor_user_id !== user.id &&
        scheduleRecord.entrepreneur_user_id !== user.id
      ) {
        setStatus('You do not have access to this contract.');
        setSnapshot(null);
        setContractSource('');
        setLoading(false);
        return;
      }

      const normalizedProjectId = normalizeProjectId(scheduleRecord.project_id);
      const participantIds = [
        scheduleRecord.investor_user_id,
        scheduleRecord.entrepreneur_user_id,
      ].filter((value): value is string => Boolean(value));
      const [{ data: projectData }, { data: usersData }] = await Promise.all([
        supabase
          .from('projects')
          .select('id,title,business_name,description,currency,owner_user_id,owner_wallet')
          .eq('id', normalizedProjectId)
          .maybeSingle(),
        participantIds.length > 0
          ? runUserDirectoryQuery(supabase, (source) =>
              supabase
                .from(source)
                .select('id,name,surname,avatar_url,country,wallet_address')
                .in('id', participantIds)
            )
          : Promise.resolve({ data: [], error: null }),
      ]);

      const project = (projectData as ProjectRow | null) ?? null;
      const profileMap = new Map<string, UserProfile>();
      ((usersData ?? []) as UserProfile[]).forEach((profile) => {
        profileMap.set(profile.id, profile);
      });

      const lenderProfile = scheduleRecord.investor_user_id
        ? profileMap.get(scheduleRecord.investor_user_id)
        : undefined;
      const borrowerProfile = scheduleRecord.entrepreneur_user_id
        ? profileMap.get(scheduleRecord.entrepreneur_user_id)
        : undefined;
      const ventureName =
        project?.business_name ||
        project?.title ||
        getMetadataText(scheduleRecord.metadata?.project_title, 'Investment contract');

      const contractSnapshot = buildInvestmentContractSnapshot({
        record: scheduleRecord,
        ventureName,
        ventureDescription: project?.description,
        currency: project?.currency || getMetadataText(scheduleRecord.metadata?.currency, 'USD'),
        lender: {
          displayName: nameFromProfile(lenderProfile, 'Investor'),
          walletAddress: lenderProfile?.wallet_address ?? null,
          country: lenderProfile?.country ?? null,
          avatarUrl: lenderProfile?.avatar_url ?? null,
        },
        borrower: {
          displayName: nameFromProfile(borrowerProfile, 'Entrepreneur'),
          walletAddress: project?.owner_wallet ?? borrowerProfile?.wallet_address ?? null,
          country: borrowerProfile?.country ?? null,
          avatarUrl: borrowerProfile?.avatar_url ?? null,
        },
      });

      setSnapshot(contractSnapshot);
      setContractSource(buildInvestmentContractSource(contractSnapshot));
      setLoading(false);
    };

    void loadContract();
  }, [creditId, supabase, user?.id]);

  return (
    <PageFrame title="Smart contract" subtitle="Generated contract and payment plan">
      {loading ? <p className="text-sm text-slate-500">Loading contract...</p> : null}
      {status ? <p className="text-sm text-slate-500">{status}</p> : null}

      {!loading && snapshot ? (
        <div className="space-y-4 pb-8">
          <section className="rounded-[28px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contract overview</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{snapshot.contractTitle}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Draft contract generated from Supabase records. This organizes the venture agreement
                  in-app, but it is not an audited or deployed on-chain contract yet.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-full border border-white/25 bg-white/40 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Back
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[snapshot.status]}`}
              >
                {snapshot.status}
              </span>
              <span className="rounded-full border border-white/20 bg-white/35 px-3 py-1 text-xs font-semibold text-slate-600">
                Credit {snapshot.creditId}
              </span>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Principal</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {formatMoney(snapshot.principal, snapshot.currency)}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Fixed installment</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {formatMoney(snapshot.monthlyPayment, snapshot.currency)}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Interest</p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {snapshot.annualInterestRate.toFixed(2)}% EA
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {Number(snapshot.monthlyInterestRate * 100).toFixed(4)}% monthly
              </p>
            </div>
            <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Installments</p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {snapshot.installmentsPaid} / {snapshot.totalInstallments} paid
              </p>
              <p className="mt-1 text-sm text-slate-500">Next due {formatDate(snapshot.nextDueDate)}</p>
            </div>
            <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Investor</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{snapshot.lender.displayName}</p>
              <p className="mt-1 break-all text-sm text-slate-500">
                {snapshot.lender.walletAddress || 'Wallet pending'}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Entrepreneur</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{snapshot.borrower.displayName}</p>
              <p className="mt-1 break-all text-sm text-slate-500">
                {snapshot.borrower.walletAddress || 'Wallet pending'}
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Generated Solidity</h3>
                <p className="text-sm text-slate-500">
                  Adapted from your loan template and hydrated with the current venture data.
                </p>
              </div>
              <span className="rounded-full border border-white/20 bg-white/35 px-3 py-1 text-xs font-semibold text-slate-600">
                {snapshot.legalTermsHash.slice(0, 16)}...
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-900/10 bg-slate-950">
              <pre className="max-h-[520px] overflow-auto px-4 py-5 text-xs leading-6 text-slate-100">
                <code>{contractSource}</code>
              </pre>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Amortization table</h3>
              <p className="text-sm text-slate-500">
                Month-by-month schedule generated from the compact payment plan stored in Supabase.
              </p>
            </div>

            <div className="mt-4">
              <PaymentScheduleTable rows={snapshot.paymentRows} currency={snapshot.currency} />
            </div>
          </section>
        </div>
      ) : null}
    </PageFrame>
  );
}
