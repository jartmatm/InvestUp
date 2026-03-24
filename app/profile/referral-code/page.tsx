'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const generateReferralCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'INV-';
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
};

export default function ReferralCodePage() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp } = useInvestUp();
  const [referralCode, setReferralCode] = useState('');
  const [availableColumns, setAvailableColumns] = useState<Set<string>>(new Set());
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  const supabase = useMemo(() => {
    const authedFetch: typeof fetch = async (input, init = {}) => {
      const token = await getAccessToken();
      const baseHeaders = new Headers(init.headers ?? {});
      baseHeaders.set('apikey', SUPABASE_ANON_KEY);

      const run = (headers: Headers) => fetch(input, { ...init, headers });

      if (!token) {
        return run(baseHeaders);
      }

      const headersWithAuth = new Headers(baseHeaders);
      headersWithAuth.set('Authorization', `Bearer ${token}`);
      const response = await run(headersWithAuth);

      if (response.ok) return response;

      const raw = await response.clone().text();
      const lower = raw.toLowerCase();
      const shouldFallback =
        response.status === 401 ||
        response.status === 403 ||
        lower.includes('no suitable key') ||
        lower.includes('wrong key type') ||
        lower.includes('invalid jwt');

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
    const loadReferral = async () => {
      if (!user?.id) return;
      setLoadingProfile(true);
      setStatus('');

      const { data, error } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();

      if (error) {
        setStatus('Could not load your referral code.');
      }

      const cols = new Set<string>(Object.keys(data ?? {}));
      setAvailableColumns(cols);

      const existingCode = (data?.referral_code as string | null) ?? '';
      setReferralCode(existingCode || generateReferralCode());
      setLoadingProfile(false);
    };

    loadReferral();
  }, [supabase, user?.id]);

  const saveReferralCode = async () => {
    if (!user?.id) return;
    setSaving(true);
    setStatus('');

    const payload: Record<string, unknown> = { id: user.id };
    if (availableColumns.has('referral_code')) {
      payload.referral_code = referralCode || null;
    }

    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
    if (error) {
      setStatus(`Could not save to Supabase: ${error.message}`);
      setSaving(false);
      return;
    }

    setStatus('Referral code saved successfully.');
    setSaving(false);
  };

  return (
    <PageFrame title="Referral Code" subtitle="Share and earn rewards">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <img src="/profile/ReferalCode.svg" alt="Referral code" className="w-full" />
        </div>

        {loadingProfile ? <p className="text-sm text-slate-500">Loading code...</p> : null}

        <div className="rounded-2xl border border-white/25 bg-white/20 px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <p className="text-xs text-gray-500">Your personal code</p>
          <button
            type="button"
            onClick={() => setShowPopup(true)}
            className="mt-2 w-full rounded-xl border border-white/30 bg-white/40 px-4 py-3 text-left text-base font-semibold text-gray-900 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
          >
            {referralCode || 'Generating...'}
          </button>
          <p className="mt-2 text-xs text-gray-500">Tap the code to view the popup card.</p>
        </div>

        <div className="rounded-2xl border border-white/25 bg-white/20 px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <Input value={referralCode} readOnly placeholder="Referral code" />
        </div>

        <Button onClick={saveReferralCode} disabled={saving || loadingProfile} className="rounded-xl py-4 text-base">
          {saving ? 'Saving...' : 'Save referral code'}
        </Button>

        {status ? <p className="text-xs text-slate-500">{status}</p> : null}
      </div>

      {showPopup ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="relative w-full max-w-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <img src="/profile/referalcode_popup.svg" alt="Referral code popup" className="w-full" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <p className="text-xs text-gray-500">Your referral code</p>
              <p className="mt-2 text-lg font-semibold text-[#1A1B25]">{referralCode}</p>
              <Button onClick={() => setShowPopup(false)} className="mt-4 rounded-xl px-6 py-2 text-sm">
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
}
