'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import {
  ProfileInfoTile,
  ProfileNotice,
  ProfilePageShell,
  ProfilePrimaryButton,
  ProfileSurface,
} from '@/components/profile/ProfilePageShell';
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

const getStatusTone = (message: string) => {
  if (/copied/i.test(message)) return 'success' as const;
  if (/could not|error/i.test(message)) return 'danger' as const;
  return 'neutral' as const;
};

function GiftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M12 10v11" />
      <path d="M3 10h18" />
      <path d="M12 10H7.8a2.3 2.3 0 1 1 0-4.6c2.2 0 4.2 4.6 4.2 4.6Z" />
      <path d="M12 10h4.2a2.3 2.3 0 1 0 0-4.6C14 5.4 12 10 12 10Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M5 15V7a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
      <path d="M3.5 10h17" />
    </svg>
  );
}

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

    void loadReferral();
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
    <>
      <ProfilePageShell
        title="Referral Code"
        subtitle="Share your invite code with a cleaner, more premium referral card."
        footer={
          <>
            {status ? <ProfileNotice tone={getStatusTone(status)}>{status}</ProfileNotice> : null}
            <ProfileSurface className="p-3">
              <div className="flex flex-col gap-3">
                <ProfilePrimaryButton onClick={copyCode} disabled={!referralCode || loadingProfile}>
                  {copied ? 'Copied' : 'Copy code'}
                </ProfilePrimaryButton>
                <button
                  type="button"
                  onClick={() => setShowPopup(true)}
                  className="flex min-h-[52px] w-full items-center justify-center rounded-full border border-[#D9CCFF] bg-[#F6F1FF] px-5 text-sm font-semibold text-[#6B39F4] transition hover:-translate-y-0.5 hover:bg-[#F1E8FF]"
                >
                  Preview card
                </button>
              </div>
            </ProfileSurface>
          </>
        }
      >
        <ProfileSurface className="bg-[linear-gradient(160deg,rgba(107,57,244,0.16)_0%,rgba(255,255,255,0.94)_46%,rgba(76,110,245,0.08)_100%)]">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
                Referral program
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
                Invite new users with a premium share code
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#7B879C]">
                Your code stays linked to your account and can be copied or previewed in a clean share card before sending it to someone else.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <ProfileInfoTile
                icon={<GiftIcon />}
                eyebrow="Status"
                title={loadingProfile ? 'Generating code...' : 'Active referral code'}
                description="Your invite code stays linked to your account."
                tone="purple"
              />
              <ProfileInfoTile
                icon={<CardIcon />}
                eyebrow="Preview"
                title="Share-ready referral card"
                description="Open the card preview before sending your invite."
                tone="blue"
              />
            </div>
          </div>
        </ProfileSurface>

        <ProfileSurface>
          <div className="flex flex-col gap-3">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
              Your personal code
            </p>
            <div className="rounded-[26px] border border-[#DDD3FF] bg-[linear-gradient(135deg,rgba(107,57,244,0.10),rgba(255,255,255,0.96))] px-4 py-5 shadow-[0_16px_32px_rgba(31,38,64,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8A93A8]">
                    Referral code
                  </p>
                  <p className="mt-3 break-all text-[1.7rem] font-semibold tracking-[0.18em] text-[#1C2336]">
                    {referralCode || 'Generating...'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyCode}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl bg-white text-[#6B39F4] shadow-[0_12px_24px_rgba(107,57,244,0.12)] transition hover:-translate-y-0.5"
                  aria-label="Copy referral code"
                >
                  <CopyIcon />
                </button>
              </div>
            </div>
          </div>
        </ProfileSurface>
      </ProfilePageShell>

      {showPopup ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/40 px-4 backdrop-blur-sm"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="w-full max-w-sm rounded-[32px] border border-white/90 bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(238,244,255,0.92))] p-6 text-center shadow-[0_30px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#8A93A8]">
              InvestApp referral
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#1C2336]">
              Invite with your code
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7B879C]">
              Share this code with a new user so they can join through your invitation.
            </p>
            <div className="mt-5 rounded-[24px] border border-[#DDD3FF] bg-white/90 px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#8A93A8]">Referral code</p>
              <p className="mt-3 break-all text-2xl font-semibold tracking-[0.2em] text-[#1C2336]">
                {referralCode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPopup(false)}
              className="mt-5 flex min-h-[48px] w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(107,57,244,0.24)] transition hover:-translate-y-0.5"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
