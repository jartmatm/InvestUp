'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { PRE_AUTH_TERMS_KEY } from '@/lib/legal-consent';

export default function LoginClient() {
  const router = useRouter();
  const { login, ready, authenticated } = usePrivy();
  const [acceptsTerms, setAcceptsTerms] = useState(false);

  useEffect(() => {
    if (ready && authenticated) {
      router.replace('/continue');
    }
  }, [authenticated, ready, router]);

  useEffect(() => {
    setAcceptsTerms(window.localStorage.getItem(PRE_AUTH_TERMS_KEY) === '1');
  }, []);

  const handleTermsChange = (checked: boolean) => {
    setAcceptsTerms(checked);
    if (checked) {
      window.localStorage.setItem(PRE_AUTH_TERMS_KEY, '1');
      return;
    }
    window.localStorage.removeItem(PRE_AUTH_TERMS_KEY);
  };

  if (!ready || authenticated) {
    return <div className="min-h-screen bg-transparent" />;
  }

  return (
    <div className="relative flex h-screen w-screen flex-col justify-center overflow-hidden px-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/fondo_home.jpg')" }}
      />
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />

      <div className="relative rounded-[28px] border border-white/25 bg-white/20 p-8 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <div className="mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-white/30 bg-white/20">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-700"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
            </svg>
          </div>
        </div>

        <h1 className="mb-3 text-3xl font-bold leading-tight text-gray-800">
          Sign in with email, <br /> passkey, Google or X
        </h1>

        <p className="mb-10 text-gray-600">
          Choose the login method that feels best for you and continue securely into InvestApp.
        </p>

        <label className="mb-6 flex items-start gap-3 rounded-2xl border border-white/45 bg-white/45 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={acceptsTerms}
            onChange={(event) => handleTermsChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#6B39F4]"
          />
          <span>
            I accept the{' '}
            <a
              href="https://www.investappgroup.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#6B39F4] underline decoration-[#6B39F4]/40 underline-offset-2"
            >
              terms and conditions
            </a>
            .
          </span>
        </label>

        <button
          onClick={() => {
            if (!acceptsTerms) return;
            login();
          }}
          disabled={!acceptsTerms}
          className="w-full rounded-xl bg-gradient-to-r from-[#6C4CF1] to-[#7A5AF8] py-4 font-semibold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
