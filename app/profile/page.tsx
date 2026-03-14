'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';
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
};

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
        {children}
      </div>
    </div>
  );
}

function SettingItem({ label, value, danger, onClick }: SettingItemProps) {
  const baseClasses = `flex w-full items-center justify-between px-4 py-4 text-left ${
    danger ? 'text-red-500 font-semibold' : 'text-gray-800'
  }`;

  const content = (
    <>
      <div>
        <p className="text-sm">{label}</p>
        {value ? <p className="text-xs text-gray-500">{value}</p> : null}
      </div>
      <IconChevronRight className="h-4 w-4 text-gray-400" />
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} transition hover:bg-gray-50`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}

export default function ProfilePage() {
  const router = useRouter();
  const { faseApp, logoutApp } = useInvestUp();
  const { avatarUrl, displayName } = useUserProfileSummary();
  const safeName = displayName || 'Usuario';

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <PageFrame title="Perfil" subtitle="Configuracion de cuenta">
      <div className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-gray-200">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-base font-semibold text-gray-600">
                {safeName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <Section title="Account">
          <SettingItem label="Personal Data" onClick={() => router.push('/profile/personal-data')} />
          <SettingItem label="Social Media" />
          <SettingItem label="Referral Code" />
        </Section>

        <Section title="Transaction">
          <SettingItem label="Payment Method" />
          <SettingItem label="Bank Account" />
        </Section>

        <Section title="Preference">
          <SettingItem label="Setting" />
          <SettingItem label="Language" value="English (USA)" />
          <SettingItem label="Help Center" />
          <SettingItem label="FAQ" />
          <SettingItem label="Privacy Policy" />
          <SettingItem label="Term & Condition" />
          <SettingItem label="About App" />
          <SettingItem label="Logout" danger onClick={logoutApp} />
        </Section>
      </div>
    </PageFrame>
  );
}
