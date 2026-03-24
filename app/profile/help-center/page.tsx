'use client';

import PageFrame from '@/components/PageFrame';

export default function HelpCenterPage() {
  return (
    <PageFrame title="Help Center" subtitle="Find the help you need">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <img src="/profile/HelpCenter.svg" alt="Help Center" className="w-full" />
        </div>
        <div className="rounded-2xl border border-white/25 bg-white/20 px-4 py-4 text-sm text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <p className="leading-relaxed">
            If you need assistance, our team is here to help. Browse the FAQ for quick answers, or reach out through
            the support options available in the app.
          </p>
        </div>
      </div>
    </PageFrame>
  );
}
