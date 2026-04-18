'use client';

import PageFrame from '@/components/PageFrame';

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function LanguagePage() {
  return (
    <PageFrame
      title="Language"
      subtitle="Manage the language experience used across your account"
      showBackButton
      backHref="/profile"
    >
      <div className="space-y-5">
        <div className="rounded-[28px] border border-white/30 bg-[linear-gradient(135deg,rgba(74,108,247,0.12),rgba(255,255,255,0.82),rgba(107,57,244,0.12))] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.10)] backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B39F4]">
            Language Setup
          </p>
          <h2 className="mt-3 text-[1.45rem] font-semibold text-gray-900">
            Keep the app consistent and easy to scan
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            English remains the base experience for the professional fintech interface, support
            flows, and account actions.
          </p>
        </div>

        <div className="flex w-full items-center justify-between rounded-[24px] border border-[#6B39F4] bg-[#6B39F4]/10 px-4 py-4 text-left text-[#6B39F4] shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div>
            <p className="text-sm font-semibold">English (US)</p>
            <p className="text-xs text-gray-500">Currently selected for the full app</p>
          </div>
          <CheckIcon />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-white/25 bg-white/20 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Current Mode
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">Single-language experience</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              This keeps onboarding, support, and wallet actions consistent for everyone.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/25 bg-white/20 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Performance
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">Lighter and faster load</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Fewer language packs help keep the app simpler and reduce bundle weight.
            </p>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/25 bg-white/20 px-4 py-4 text-sm leading-relaxed text-gray-600 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          Additional language packs were removed for now to keep the app lighter, faster, and more
          consistent while the core experience continues to mature.
        </div>
      </div>
    </PageFrame>
  );
}
