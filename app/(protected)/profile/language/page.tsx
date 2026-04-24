'use client';

import {
  ProfileInfoTile,
  ProfilePageShell,
  ProfileSurface,
} from '@/components/profile/ProfilePageShell';

function CheckIcon() {
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
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function GlobeIcon() {
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
      <path d="M4 12h16" />
      <path d="M12 4a12 12 0 0 1 0 16" />
      <path d="M12 4a12 12 0 0 0 0 16" />
    </svg>
  );
}

function SparkIcon() {
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
      <path d="m12 3 1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3Z" />
    </svg>
  );
}

export default function LanguagePage() {
  return (
    <ProfilePageShell
      title="Language"
      subtitle="Manage the language experience used across your account."
    >
      <ProfileSurface className="bg-[linear-gradient(160deg,rgba(74,108,247,0.12)_0%,rgba(255,255,255,0.96)_46%,rgba(107,57,244,0.08)_100%)]">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
              Language setup
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
              Keep the app consistent and easy to scan
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7B879C]">
              English remains the base experience for support flows, wallet actions and account navigation.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-[24px] border border-[#DDD3FF] bg-[linear-gradient(135deg,rgba(107,57,244,0.12),rgba(255,255,255,0.96))] px-4 py-4 shadow-[0_16px_32px_rgba(31,38,64,0.06)]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5F1FF] text-[#6B39F4]">
                <GlobeIcon />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1C2336]">English (US)</p>
                <p className="mt-1 text-xs leading-5 text-[#7B879C]">Currently selected for the full app</p>
              </div>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#6B39F4] shadow-[0_12px_24px_rgba(107,57,244,0.12)]">
              <CheckIcon />
            </span>
          </div>
        </div>
      </ProfileSurface>

      <ProfileSurface>
        <div className="flex flex-col gap-3">
          <ProfileInfoTile
            icon={<SparkIcon />}
            eyebrow="Current mode"
            title="Single-language experience"
            description="This keeps onboarding, support and wallet actions consistent for everyone."
            tone="purple"
          />
          <ProfileInfoTile
            icon={<GlobeIcon />}
            eyebrow="Performance"
            title="Lighter and faster load"
            description="Fewer language packs help keep the app simpler and reduce bundle weight."
            tone="blue"
          />
          <div className="rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 text-sm leading-6 text-[#7B879C] shadow-[0_16px_32px_rgba(31,38,64,0.05)]">
            Additional language packs were removed for now to keep the app lighter, faster and more
            consistent while the core experience continues to mature.
          </div>
        </div>
      </ProfileSurface>
    </ProfilePageShell>
  );
}
