'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { useInvestApp } from '@/lib/investapp-context';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';

type SectionProps = {
  title: string;
  children: ReactNode;
};

type SettingItemProps = {
  label: string;
  value?: string;
  danger?: boolean;
  onClick?: () => void;
  icon: ReactNode;
};

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

function IconEditProfile() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconPersonalData() {
  return (
    <svg viewBox="0 0 19 19" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13.5 16.5518V15.5833C13.5 13.7424 12.0076 12.25 10.1667 12.25H8.5C6.65905 12.25 5.16667 13.7424 5.16667 15.5833V16.5518M13.5 16.5518C15.9908 15.1109 17.6667 12.4178 17.6667 9.33333C17.6667 4.73096 13.9357 1 9.33333 1C4.73096 1 1 4.73096 1 9.33333C1 12.4178 2.67583 15.1109 5.16667 16.5518M13.5 16.5518C12.2743 17.2609 10.8512 17.6667 9.33333 17.6667C7.81547 17.6667 6.39239 17.2609 5.16667 16.5518M11.8333 6.83333C11.8333 8.21404 10.714 9.33333 9.33333 9.33333C7.95262 9.33333 6.83333 8.21404 6.83333 6.83333C6.83333 5.45262 7.95262 4.33333 9.33333 4.33333C10.714 4.33333 11.8333 5.45262 11.8333 6.83333Z" />
    </svg>
  );
}

function IconSocialMedia() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M10 14.0433C10.9925 14.1485 11.9657 14.4023 12.8866 14.7978L15.2122 15.7965C16.5319 16.3633 18 15.3933 18 13.9545V7.00629C18 5.56749 16.5319 4.59743 15.2122 5.1642L12.8866 6.16292C11.6418 6.6975 10.3017 6.97314 8.94742 6.97314H6.5C4.567 6.97314 3 8.54338 3 10.4804C3 12.4174 4.567 13.9876 6.5 13.9876H7M10 14.0433C9.65105 14.0063 9.29971 13.9876 8.94742 13.9876H7M10 14.0433V18.9979C10 19.5514 9.55228 20 9 20H8.84713C8.35829 20 7.9411 19.6459 7.86073 19.1627L7 13.9876M10 9.5V11.5M21 8V13" />
    </svg>
  );
}

function IconFavorites() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M6.50828 6.44612C8.26182 4.9003 10.5957 5.3544 11.9952 7.04253C13.3948 5.3544 15.6984 4.91656 17.4821 6.44612C19.2658 7.97568 19.4825 10.5765 18.1055 12.4047C17.048 13.8086 14.0116 16.6506 12.659 17.8942C12.2819 18.2409 11.7085 18.2409 11.3314 17.8942C9.9788 16.6506 6.94238 13.8086 5.88494 12.4047C4.50788 10.5765 4.75475 7.99194 6.50828 6.44612Z" />
    </svg>
  );
}

function IconReferralCode() {
  return (
    <svg viewBox="0 0 17 9" className="h-4 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 4.33333H11M6 1H4.33333C2.49238 1 1 2.49238 1 4.33333C1 6.17428 2.49238 7.66667 4.33333 7.66667H6M11 1H12.6667C14.5076 1 16 2.49238 16 4.33333C16 6.17428 14.5076 7.66667 12.6667 7.66667H11" />
    </svg>
  );
}

function IconBankAccount() {
  return (
    <svg viewBox="0 0 17 17" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 6.73625H2.25C1.55964 6.73625 1 6.17068 1 5.47301V5.30437C1 4.63874 1.38789 4.03555 1.98977 3.76522L7.8231 1.14517C8.25404 0.95161 8.74596 0.951611 9.1769 1.14517L15.0102 3.76522C15.6121 4.03555 16 4.63874 16 5.30437V5.47301C16 6.17068 15.4404 6.73625 14.75 6.73625H13.5M3.5 6.73625V12.6314M3.5 6.73625H6.83333M3.5 12.6314H2.25C1.55964 12.6314 1 13.1969 1 13.8946V14.7368C1 15.4344 1.55964 16 2.25 16H14.75C15.4404 16 16 15.4344 16 14.7368V13.8946C16 13.1969 15.4404 12.6314 14.75 12.6314H13.5M3.5 12.6314H6.83333M13.5 6.73625V12.6314M13.5 6.73625H10.1667M13.5 12.6314H10.1667M10.1667 6.73625V12.6314M10.1667 6.73625H6.83333M10.1667 12.6314H6.83333M6.83333 6.73625V12.6314" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9.54339 5.78994L5.78994 9.54339M3.28764 7.04109L2.03649 8.29224C0.654504 9.67423 0.654504 11.9149 2.03649 13.2968C3.41847 14.6788 5.65911 14.6788 7.04109 13.2968L8.29224 12.0457M7.04109 3.28764L8.29224 2.03649C9.67423 0.654504 11.9149 0.654504 13.2968 2.03649C14.6788 3.41847 14.6788 5.65911 13.2968 7.04109L12.0457 8.29224" />
    </svg>
  );
}

function IconLanguage() {
  return (
    <svg viewBox="0 0 17 14" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.33333 12.6667L12.25 5.16667L15.1667 12.6667M10.0625 11H14.4375M1 2.66667H6.83333M6.83333 2.66667H8.5M6.83333 2.66667C6.83333 4.025 6.1725 5.93833 4.9675 7.37917M4.9675 7.37917C4.15833 8.35 3.10083 9.10417 1.83333 9.33333M4.9675 7.37917L2.66667 5.16667M4.9675 7.37917L7 9.33333M4.75 2.515V1" />
    </svg>
  );
}

function IconHelpCenter() {
  return (
    <svg viewBox="0 0 19 19" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9.5" cy="9.5" r="7.5" />
      <path d="M7.8 7.3a1.9 1.9 0 0 1 3.4 1.2c0 1.3-1.9 1.8-1.9 3.1" />
      <circle cx="9.5" cy="13.2" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconFaq() {
  return (
    <svg viewBox="0 0 17 17" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5.16667 5.16667H7.66667M5.16667 8.5H10.1667M2.66667 1H14.3333C15.2538 1 16 1.74289 16 2.65929V10.9594C16 11.8758 15.2538 12.6187 14.3333 12.6187H4.73385C4.4807 12.6187 4.24127 12.7333 4.08313 12.9301L1.74203 15.8435C1.49598 16.1497 1 15.9765 1 15.5844V2.65929C1 1.74289 1.74619 1 2.66667 1Z" />
    </svg>
  );
}

function IconPrivacyPolicy() {
  return (
    <svg viewBox="0 0 17 17" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 1.5c1.6 1.1 3.3 1.9 5.4 2.3a1 1 0 0 1 .8 1C14.5 9.4 12.8 13.7 8.5 15c-4.3-1.3-6-5.6-6.2-10.2a1 1 0 0 1 .8-1C5.2 3.4 6.9 2.6 8.5 1.5Z" />
      <path d="M8.5 7v2.8" />
      <circle cx="8.5" cy="11.4" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTerms() {
  return (
    <svg viewBox="0 0 15 19" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.41667 11.5833V9.91667C2.41667 7.15524 4.65524 4.91667 7.41667 4.91667C10.1781 4.91667 12.4167 7.15524 12.4167 9.91667V11.5833M4.91667 9.91667C4.91667 8.53595 6.03595 7.41667 7.41667 7.41667M7.41667 0.75V2.41667M12.4167 4.08333L13.3092 3.19078M2.41667 4.08333L1.58333 3.25M2.41667 14.0833H12.4167C13.3371 14.0833 14.0833 14.8295 14.0833 15.75C14.0833 16.6705 13.3371 17.4167 12.4167 17.4167H2.41667C1.49619 17.4167 0.75 16.6705 0.75 15.75C0.75 14.8295 1.49619 14.0833 2.41667 14.0833Z" />
    </svg>
  );
}

function IconAboutApp() {
  return (
    <svg viewBox="0 0 19 19" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9.5" cy="9.5" r="7.5" />
      <path d="M9.5 8v3.4" />
      <circle cx="9.5" cy="5.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.1667 1.48464C7.76089 0.51302 4.9029 1.00235 2.95262 2.95262C0.349126 5.55612 0.349126 9.77722 2.95262 12.3807C4.9029 14.331 7.76089 14.8203 10.1667 13.8487M5.99999 7.66667H14.3333M14.3333 7.66667L11.4167 4.75M14.3333 7.66667L11.4167 10.5833" />
    </svg>
  );
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-[0.84rem] font-semibold tracking-[-0.025em] text-[#737D91]">
        {title}
      </h2>
      <div className="rounded-[28px] border border-white/85 bg-white/88 p-2 shadow-[0_18px_44px_rgba(34,42,70,0.07)] ring-1 ring-[#EEF0F8]/70 backdrop-blur-xl">
        <div className="space-y-1.5">{children}</div>
      </div>
    </section>
  );
}

function SettingItem({ label, value, danger, onClick, icon }: SettingItemProps) {
  const baseClasses = `group flex min-h-[64px] w-full cursor-pointer items-center justify-between rounded-[22px] px-3.5 py-3 text-left transition duration-200 active:scale-[0.995] ${
    danger
      ? 'bg-[#FFF6F7] text-[#E5484D] hover:bg-[#FFEFF1]'
      : 'text-[#20283A] hover:bg-[#F8F7FF]'
  }`;

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3.5">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] ${
            danger
              ? 'border-[#FFE1E4] bg-[#FFF1F3] text-[#EF4444] shadow-[0_12px_24px_rgba(239,68,68,0.08)]'
              : 'border-[#EEE9FF] bg-[#F4F0FF] text-[#6B4EFF] shadow-[0_12px_24px_rgba(107,78,255,0.10)]'
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p
            className={`truncate text-[0.95rem] font-semibold tracking-[-0.03em] ${
              danger ? 'text-[#E5484D]' : 'text-[#20283A]'
            }`}
          >
            {label}
          </p>
          {value ? (
            <p className="mt-0.5 truncate text-[0.78rem] font-medium tracking-[-0.015em] text-[#7A8497]">
              {value}
            </p>
          ) : null}
        </div>
      </div>
      <IconChevronRight
        className={`h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 ${
          danger ? 'text-[#D6A2A7]' : 'text-[#AAB2C1]'
        }`}
      />
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClasses}>
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}

export default function ProfilePage() {
  const router = useRouter();
  const { faseApp, logoutApp, rolSeleccionado } = useInvestApp();
  const { avatarUrl, displayName, loading } = useUserProfileSummary();
  const languageLabel = 'English (US)';
  const safeName = displayName || 'User';

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.12),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-36 text-[#101828]">
      <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-56 h-64 w-64 rounded-full bg-[#B9A8FF]/16 blur-3xl" />

      <div className="relative mx-auto w-full max-w-xl px-5 pb-8 pt-10 sm:px-6">
        <header className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-0.5 text-[2rem] font-semibold tracking-[-0.07em] text-[#1C2336]">
            <span>Invest</span>
            <span className="text-[#6B39F4]">App</span>
            <span className="ml-0.5 mt-0.5 h-3 w-3 rounded-full bg-[#6B39F4]" />
          </div>
        </header>

        <section className="relative mb-7 overflow-hidden rounded-[34px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,247,255,0.88)_100%)] px-6 py-8 text-center shadow-[0_24px_70px_rgba(31,38,64,0.10)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-white/70 blur-3xl" />
          <div className="pointer-events-none absolute left-1/2 top-9 h-28 w-28 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-2xl" />

          <button
            type="button"
            aria-label="Edit profile photo"
            onClick={() => router.push('/profile/personal-data')}
            className="relative mx-auto block rounded-full transition hover:scale-[1.02]"
          >
            <span className="block h-[88px] w-[88px] overflow-hidden rounded-full border-[3px] border-white bg-[#F4F0FF] shadow-[0_18px_42px_rgba(31,38,64,0.14)] ring-1 ring-[#DFD8FF]">
              {avatarUrl ? (
                <span
                  className="block h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${avatarUrl})` }}
                />
              ) : loading ? (
                <span className="block h-full w-full animate-pulse bg-[#ECE7FF]" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#6B39F4]">
                  {safeName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
            <span className="absolute bottom-1 right-0 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white shadow-[0_12px_28px_rgba(107,57,244,0.32)]">
              <IconEditProfile />
            </span>
          </button>

          <p className="mt-5 text-[0.78rem] font-semibold uppercase tracking-[0.28em] text-[#8A93A6]">
            INVESTAPP
          </p>
          <h1 className="mt-1 text-[2.05rem] font-semibold tracking-[-0.06em] text-[#1D2538]">
            Profile
          </h1>
          <p className="mt-1 text-[1rem] font-medium tracking-[-0.025em] text-[#7A8497]">
            Account settings
          </p>
        </section>

        <div className="space-y-6">
          <Section title="Account">
            <SettingItem
              icon={<IconPersonalData />}
              label="Personal Data"
              onClick={() => router.push('/profile/personal-data')}
            />
            <SettingItem
              icon={<IconSocialMedia />}
              label="Social Media"
              onClick={() => router.push('/profile/social-media')}
            />
            <SettingItem
              icon={<IconReferralCode />}
              label="Referral Code"
              onClick={() => router.push('/profile/referral-code')}
            />
          </Section>

          <Section title="Transactions">
            <SettingItem
              icon={<IconBankAccount />}
              label="Bank Account"
              onClick={() => router.push('/profile/bank-account')}
            />
            {rolSeleccionado === 'inversor' ? (
              <SettingItem
                icon={<IconFavorites />}
                label="Favorites"
                onClick={() => router.push('/profile/favorites')}
              />
            ) : null}
          </Section>

          <Section title="Preferences">
            <SettingItem
              icon={<IconSettings />}
              label="Settings"
              onClick={() => router.push('/profile/settings')}
            />
            <SettingItem
              icon={<IconLanguage />}
              label="Language"
              value={languageLabel}
              onClick={() => router.push('/profile/language')}
            />
            <SettingItem
              icon={<IconHelpCenter />}
              label="Help Center"
              onClick={() => router.push('/profile/help-center')}
            />
            <SettingItem icon={<IconFaq />} label="FAQ" onClick={() => router.push('/profile/faq')} />
            <SettingItem
              icon={<IconPrivacyPolicy />}
              label="Privacy Policy"
              onClick={() => router.push('/profile/privacy-policy')}
            />
            <SettingItem
              icon={<IconTerms />}
              label="Terms & Conditions"
              onClick={() => router.push('/profile/terms-conditions')}
            />
            <SettingItem
              icon={<IconAboutApp />}
              label="About App"
              onClick={() => router.push('/profile/about')}
            />
            <SettingItem
              icon={<IconLogout />}
              label="Log out"
              danger
              onClick={logoutApp}
            />
          </Section>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
