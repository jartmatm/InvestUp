'use client';

import PageFrame from '@/components/PageFrame';

export default function HelpCenterPage() {
  return (
    <PageFrame
      title="Help Center"
      subtitle="Get support quickly for account, wallet, and platform questions"
      showBackButton
      backHref="/profile"
    >
      <div className="space-y-6">
        <div className="rounded-[28px] border border-white/30 bg-[linear-gradient(140deg,rgba(107,57,244,0.14),rgba(255,255,255,0.84),rgba(74,108,247,0.12))] px-5 py-5 shadow-[0_18px_42px_rgba(15,23,42,0.10)] backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B39F4]">Support</p>
          <h2 className="mt-3 text-[1.45rem] font-semibold text-gray-900">
            We are here to help you move faster
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Start with the FAQ for quick answers, then contact support with the details of your
            issue so the team can help with more context.
          </p>
        </div>

        <div className="rounded-[24px] border border-white/25 bg-white/20 px-4 py-4 text-sm text-gray-700 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <p className="leading-relaxed">
            If you need assistance, our team is here to help. Browse the FAQ for quick answers, or
            reach out using the support options below.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="mailto:support@investapp.app"
            className="rounded-[24px] border border-white/25 bg-white/20 px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md transition hover:bg-white/30"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Email Support
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">support@investapp.app</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Best for account issues, wallet access questions, or profile updates.
            </p>
            <p className="mt-4 text-xs font-semibold text-[#6B39F4]">Send email →</p>
          </a>
          <div className="rounded-[24px] border border-white/25 bg-white/20 px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Response Window
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">Within 24 to 48 hours</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Share your user email, wallet address, and a short description so we can help faster.
            </p>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Need self-service help first?</p>
              <p className="mt-1 text-xs text-gray-500">
                Review common answers before opening a support request.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.assign('/profile/faq')}
              className="rounded-full bg-[#6B39F4] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(107,57,244,0.22)] transition hover:bg-[#5B31CF]"
            >
              Open FAQ
            </button>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
