'use client';

import PageFrame from '@/components/PageFrame';

export default function HelpCenterPage() {
  return (
    <PageFrame title="Help Center" subtitle="Find the help you need">
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/25 bg-white/20 px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Support</p>
          <h2 className="mt-2 text-lg font-semibold text-gray-900">We are here to help you move fast</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            If something feels unclear, start with the FAQ and then contact support with the details of your issue.
          </p>
        </div>

        <div className="rounded-2xl border border-white/25 bg-white/20 px-4 py-4 text-sm text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <p className="leading-relaxed">
            If you need assistance, our team is here to help. Browse the FAQ for quick answers, or reach out through
            the support options available in the app.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/25 bg-white/20 px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-xs text-gray-500">Email support</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">support@investup.app</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">Best for account issues, wallet access questions, or profile updates.</p>
          </div>
          <div className="rounded-2xl border border-white/25 bg-white/20 px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-xs text-gray-500">Response window</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">Within 24 to 48 hours</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">Share your user email, wallet address, and a short description so we can help faster.</p>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
