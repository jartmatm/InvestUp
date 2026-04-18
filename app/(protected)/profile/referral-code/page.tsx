'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PageFrame from '@/components/PageFrame';
import { useInvestApp } from '@/lib/investapp-context';
import {
  fetchCurrentUserProfile,
  patchCurrentUserProfile,
} from '@/utils/client/current-user-profile';

const getReferralStorageKey = (userId: string) => `investapp_referral_code_${userId}`;

const generateStableReferralCode = (seed: string) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'INV-';
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  for (let i = 0; i < 8; i += 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    code += alphabet[hash % alphabet.length];
  }
  return code;
};

export default function ReferralCodePage() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp } = useInvestApp();
  const [referralCode, setReferralCode] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [status, setStatus] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadReferral = async () => {
      if (!user?.id) return;
      setLoadingProfile(true);
      setStatus('');

      const { data, error } = await fetchCurrentUserProfile<Record<string, unknown> | null>(
        getAccessToken
      );

      if (error) {
        setStatus('Could not load your referral code.');
      }

      const cols = new Set<string>(Object.keys(data ?? {}));

      const existingCode = (data?.referral_code as string | null) ?? '';
      const cachedCode =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(getReferralStorageKey(user.id)) ?? ''
          : '';
      const stableCode = existingCode || cachedCode || generateStableReferralCode(user.id);

      setReferralCode(stableCode);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(getReferralStorageKey(user.id), stableCode);
      }

      if (!existingCode && cols.has('referral_code')) {
        await patchCurrentUserProfile(getAccessToken, { referral_code: stableCode });
      }

      setLoadingProfile(false);
    };

    loadReferral();
  }, [getAccessToken, user?.id]);

  const copyCode = async () => {
    if (!referralCode || typeof navigator === 'undefined' || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setStatus('Referral code copied to clipboard.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setStatus('We could not copy the referral code right now.');
    }
  };

  return (
    <PageFrame
      title="Referral Code"
      subtitle="Share your invite code with a cleaner, more premium referral card"
      showBackButton
      backHref="/profile"
    >
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[28px] border border-white/30 bg-[linear-gradient(135deg,rgba(107,57,244,0.18),rgba(255,255,255,0.72),rgba(74,108,247,0.12))] px-5 py-5 shadow-[0_18px_42px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B39F4]">
            Referral Program
          </p>
          <h2 className="mt-3 text-[1.55rem] font-semibold text-gray-900">
            Invite new users with a premium share code
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Your code stays linked to your account and can be copied or previewed in a cleaner
            share card before sending it to someone else.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={copyCode}
              className="rounded-[20px] border border-white/45 bg-white/70 px-4 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition hover:bg-white"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Quick Copy
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {copied ? 'Copied successfully' : 'Copy code to clipboard'}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setShowPopup(true)}
              className="rounded-[20px] border border-[#6B39F4]/15 bg-[#6B39F4]/8 px-4 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition hover:bg-[#6B39F4]/12"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B39F4]">
                Preview
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                Open the referral share card
              </p>
            </button>
          </div>
        </div>

        {loadingProfile ? <p className="text-sm text-slate-500">Loading code...</p> : null}

        <div className="rounded-[28px] border border-white/25 bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(236,242,255,0.78))] px-5 py-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Your Personal Code
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-[0.16em] text-[#0F172A]">
                {referralCode || 'Generating...'}
              </p>
            </div>
            <div className="rounded-full border border-[#D3C4FC] bg-white/80 px-3 py-2 text-xs font-semibold text-[#6B39F4]">
              Active
            </div>
          </div>

          <div className="mt-4 rounded-[22px] border border-white/50 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <Input value={referralCode} readOnly placeholder="Referral code" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button
              onClick={copyCode}
              className="rounded-full !bg-[#0F172A] !text-white shadow-[0_16px_32px_rgba(15,23,42,0.22)] hover:!bg-[#111F38]"
            >
              {copied ? 'Copied' : 'Copy Code'}
            </Button>
            <Button
              onClick={() => setShowPopup(true)}
              className="rounded-full !bg-[#6B39F4] !text-white shadow-[0_16px_32px_rgba(107,57,244,0.22)] hover:!bg-[#5B31CF]"
            >
              Preview Card
            </Button>
          </div>
        </div>

        {status ? <p className="text-xs text-slate-500">{status}</p> : null}
      </div>

      {showPopup ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="w-full max-w-sm rounded-[30px] border border-white/35 bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(238,244,255,0.82))] p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">InvestApp referral</p>
            <h3 className="mt-2 text-xl font-semibold text-[#1A1B25]">Invite with your code</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Share this code with a new user so they can join through your invitation.
            </p>
            <div className="mt-5 rounded-2xl border border-[#4a6cf7]/20 bg-white/80 px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Referral code</p>
              <p className="mt-2 text-2xl font-semibold tracking-[0.2em] text-[#1A1B25]">{referralCode}</p>
            </div>
            <Button
              onClick={() => setShowPopup(false)}
              className="mt-5 rounded-xl px-6 py-2 text-sm !bg-[#6B39F4] !text-white shadow-[0_14px_28px_rgba(107,57,244,0.22)] hover:!bg-[#5B31CF]"
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
}
