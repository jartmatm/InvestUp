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
      <div className="divide-y divide-white/20 overflow-hidden rounded-xl border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
        {children}
      </div>
    </div>
  );
}

function SettingItem({ label, value, danger, onClick }: SettingItemProps) {
  const baseClasses = `flex w-full items-center justify-between px-4 py-4 text-left transition ${
    danger ? 'font-semibold text-red-500' : 'text-gray-800'
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
      <button type="button" onClick={onClick} className={`${baseClasses} hover:bg-white/10`}>
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}

export default function ProfilePage() {
  const router = useRouter();
  const { faseApp, logoutApp } = useInvestUp();
  const { avatarUrl, displayName, loading } = useUserProfileSummary();
  const safeName = displayName || 'Usuario';
  const avatarNode = (
    <div className="h-20 w-20 overflow-hidden rounded-full border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
      {avatarUrl ? (
        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
      ) : loading ? (
        <div className="h-full w-full animate-pulse bg-white/30" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-base font-semibold text-gray-600">
          {safeName.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <PageFrame title="Perfil" subtitle="Configuracion de cuenta" topSlot={avatarNode}>
      <div className="space-y-6">
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
