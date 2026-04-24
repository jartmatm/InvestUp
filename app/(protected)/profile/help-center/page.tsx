'use client';

import {
  ProfileInfoTile,
  ProfilePageShell,
  ProfileSurface,
} from '@/components/profile/ProfilePageShell';

function MailIcon() {
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
      <path d="m5.5 8 6.5 4.75L18.5 8" />
    </svg>
  );
}

function ClockIcon() {
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
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.5" />
    </svg>
  );
}

function HelpIcon() {
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
      <circle cx="12" cy="12" r="8" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 4.1 1.9c-.8.7-1.6 1.2-1.6 2.4" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

export default function HelpCenterPage() {
  return (
    <ProfilePageShell
      title="Help Center"
      subtitle="Get support quickly for account, wallet and platform questions."
    >
      <ProfileSurface className="bg-[linear-gradient(160deg,rgba(107,57,244,0.14)_0%,rgba(255,255,255,0.94)_46%,rgba(76,110,245,0.08)_100%)]">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
              Support
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
              We are here to help you move faster
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7B879C]">
              Start with the FAQ for quick answers, then contact support with the details of your issue so the team can help with more context.
            </p>
          </div>

          <ProfileInfoTile
            icon={<ClockIcon />}
            eyebrow="Response window"
            title="Within 24 to 48 hours"
            description="Share your user email, wallet address and a short description so we can help faster."
            tone="blue"
          />
        </div>
      </ProfileSurface>

      <ProfileSurface>
        <div className="flex flex-col gap-3">
          <a
            href="mailto:support@investapp.app"
            className="rounded-[26px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 shadow-[0_16px_32px_rgba(31,38,64,0.05)] transition hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F1FF] text-[#6B39F4]">
                <MailIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8A93A8]">
                  Email support
                </p>
                <p className="mt-1 text-sm font-semibold text-[#1C2336]">support@investapp.app</p>
                <p className="mt-2 text-xs leading-5 text-[#7B879C]">
                  Best for account issues, wallet access questions or profile updates.
                </p>
              </div>
            </div>
          </a>

          <ProfileInfoTile
            icon={<HelpIcon />}
            eyebrow="Self-service"
            title="Check common answers first"
            description="Review common questions before opening a support request."
            tone="purple"
          />

          <a
            href="/profile/faq"
            className="flex min-h-[56px] w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] px-5 text-base font-semibold tracking-[-0.02em] text-white shadow-[0_22px_38px_rgba(107,57,244,0.28)] transition hover:-translate-y-0.5"
          >
            Open FAQ
          </a>
        </div>
      </ProfileSurface>
    </ProfilePageShell>
  );
}
