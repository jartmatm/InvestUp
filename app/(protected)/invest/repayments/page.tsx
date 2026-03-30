'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import PageFrame from '@/components/PageFrame';
import { useInvestApp } from '@/lib/investapp-context';
import { getAmountValue, runWithAmountColumnFallback } from '@/lib/supabase-amount';

type InvestmentRow = {
  id: string;
  created_at: string;
  investor_user_id: string | null;
  from_wallet: string | null;
  amount?: number | null;
  amount_usdc?: number | null;
  interest_rate_ea: number | null;
  term_months: number | null;
  projected_total_usdc: number | null;
  project_title: string | null;
  status: 'submitted' | 'confirmed' | 'failed';
};

type InvestorProfile = {
  id: string;
  email: string | null;
  name: string | null;
  surname: string | null;
  avatar_url: string | null;
  country: string | null;
  wallet_address: string | null;
};

type RepaymentCard = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  walletAddress: string;
  amountInvested: number;
  interestRateEa: number | null;
  repaymentDate: string;
  projectTitle: string | null;
  repaymentAmount: number;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const themes = [
  'bg-gradient-to-br from-[#40C4AA] via-[#1EA48D] to-[#137F70]',
  'bg-gradient-to-br from-[#FFBE4C] via-[#F59E0B] to-[#EA580C]',
  'bg-gradient-to-br from-[#6B39F4] via-[#5C6CFF] to-[#3290FF]',
  'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155]',
];

const nameFrom = (profile: InvestorProfile | undefined) => {
  const full = `${profile?.name ?? ''} ${profile?.surname ?? ''}`.trim();
  if (full) return full;
  if (profile?.email) return profile.email.split('@')[0];
  return 'Investor';
};

const initialsFrom = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'I';

const money = (value: number) => `${value.toFixed(2)} USDC`;

const dueDateFrom = (createdAt: string, termMonths: number | null) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Date pending';
  date.setMonth(date.getMonth() + Number(termMonths ?? 0));
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function RepaymentsPage() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado } = useInvestApp();
  const [cards, setCards] = useState<RepaymentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [flippedId, setFlippedId] = useState<string | null>(null);

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
        response.status === 401 || response.status === 403 || raw.includes('wrong key type') || raw.includes('invalid jwt');
      return shouldFallback ? run(baseHeaders) : response;
    };

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { fetch: authedFetch } });
  }, [getAccessToken]);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadCards = async () => {
      if (rolSeleccionado !== 'emprendedor' || !user?.id) {
        setCards([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await runWithAmountColumnFallback((amountColumn) =>
        supabase
          .from('investments')
          .select(`id,created_at,investor_user_id,from_wallet,${amountColumn},interest_rate_ea,term_months,projected_total_usdc,project_title,status`)
          .eq('entrepreneur_user_id', user.id)
          .in('status', ['submitted', 'confirmed'])
          .order('created_at', { ascending: false })
      );

      if (error) {
        setCards([]);
        setLoading(false);
        return;
      }

      const investments = ((data ?? []) as InvestmentRow[]).map((item) => ({
        ...item,
        amount: getAmountValue(item),
      }));
      const investorIds = Array.from(
        new Set(investments.map((investment) => investment.investor_user_id).filter(Boolean))
      ) as string[];

      const profileMap = new Map<string, InvestorProfile>();
      if (investorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('users')
          .select('id,email,name,surname,avatar_url,country,wallet_address')
          .in('id', investorIds);
        ((profilesData ?? []) as InvestorProfile[]).forEach((profile) => {
          profileMap.set(profile.id, profile);
        });
      }

      setCards(
        investments
          .filter((investment) => Boolean(investment.from_wallet))
          .map((investment) => {
            const profile = investment.investor_user_id ? profileMap.get(investment.investor_user_id) : undefined;
            return {
              id: investment.id,
              displayName: nameFrom(profile),
              avatarUrl: profile?.avatar_url ?? null,
              country: profile?.country ?? null,
              walletAddress: profile?.wallet_address ?? investment.from_wallet ?? '',
              amountInvested: Number(investment.amount ?? 0),
              interestRateEa: investment.interest_rate_ea,
              repaymentDate: dueDateFrom(investment.created_at, investment.term_months),
              projectTitle: investment.project_title,
              repaymentAmount: Number(investment.projected_total_usdc ?? investment.amount ?? 0),
            };
          })
      );
      setLoading(false);
    };

    void loadCards();
  }, [rolSeleccionado, supabase, user?.id]);

  return (
    <PageFrame title="Repayments" subtitle="Review each investor and launch the payment flow">
      {rolSeleccionado !== 'emprendedor' ? (
        <div className="rounded-[20px] border border-white/25 bg-white/20 p-5 text-sm text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          Repayments are available only for entrepreneur accounts.
        </div>
      ) : (
        <>
          {loading ? <p className="text-sm text-gray-500">Loading investors...</p> : null}

          {!loading && cards.length === 0 ? (
            <div className="rounded-[20px] border border-white/25 bg-white/20 p-5 text-sm text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              No repayment candidates yet. Once an investor funds your business, they will appear here.
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            {cards.map((card, index) => {
              const isFlipped = flippedId === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setFlippedId((prev) => (prev === card.id ? null : card.id))}
                  className="text-left [perspective:1000px]"
                >
                  <div className={`relative h-64 w-full transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                    <div className={`absolute inset-0 flex flex-col items-center justify-center rounded-[24px] p-5 text-center text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)] [backface-visibility:hidden] ${themes[index % themes.length]}`}>
                      <div className="h-20 w-20 overflow-hidden rounded-full border border-white/25 bg-white/20">
                        {card.avatarUrl ? (
                          <img src={card.avatarUrl} alt={card.displayName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">
                            {initialsFrom(card.displayName)}
                          </div>
                        )}
                      </div>
                      <p className="mt-4 text-lg font-semibold">{card.displayName}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/70">Tap to view repayment details</p>
                    </div>

                    <div className={`absolute inset-0 rounded-[24px] p-4 text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)] [backface-visibility:hidden] [transform:rotateY(180deg)] ${themes[index % themes.length]}`}>
                      <div className="flex h-full flex-col justify-between">
                        <div>
                          <p className="text-sm font-semibold">{card.displayName}</p>
                          <p className="mt-1 text-xs text-white/70">{card.projectTitle || 'Business investment'}</p>
                          <div className="mt-4 space-y-2 text-xs">
                            <div className="flex items-center justify-between gap-3"><span className="text-white/70">Invested</span><span className="font-semibold">{money(card.amountInvested)}</span></div>
                            <div className="flex items-center justify-between gap-3"><span className="text-white/70">Interest</span><span className="font-semibold">{card.interestRateEa ? `${card.interestRateEa}% EA` : '--'}</span></div>
                            <div className="flex items-center justify-between gap-3"><span className="text-white/70">Repayment date</span><span className="font-semibold">{card.repaymentDate}</span></div>
                            <div className="flex items-center justify-between gap-3"><span className="text-white/70">Country</span><span className="font-semibold">{card.country || 'Pending'}</span></div>
                            <div className="flex items-center justify-between gap-3"><span className="text-white/70">To repay</span><span className="font-semibold">{money(card.repaymentAmount)}</span></div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/invest/wallet?mode=repayment&wallet=${encodeURIComponent(card.walletAddress)}&amount=${encodeURIComponent(card.repaymentAmount.toFixed(2))}&name=${encodeURIComponent(card.displayName)}`);
                          }}
                          disabled={!card.walletAddress}
                          className={`mt-4 rounded-full px-4 py-2 text-xs font-semibold ${card.walletAddress ? 'bg-white text-slate-900' : 'bg-white/20 text-white/60'}`}
                        >
                          Pay now
                        </button>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </PageFrame>
  );
}
