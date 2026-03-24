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
    <PageFrame title="Language" subtitle="English is enabled for the full app experience">
      <div className="space-y-3">
        <div className="flex w-full items-center justify-between rounded-2xl border border-[#6B39F4] bg-[#6B39F4]/10 px-4 py-4 text-left text-[#6B39F4] shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div>
            <p className="text-sm font-semibold">English (US)</p>
            <p className="text-xs text-gray-500">Currently selected</p>
          </div>
          <CheckIcon />
        </div>
        <div className="rounded-2xl border border-white/25 bg-white/20 px-4 py-4 text-sm text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          Additional language packs were removed to keep the app lighter and faster on load.
        </div>
      </div>
    </PageFrame>
  );
}
