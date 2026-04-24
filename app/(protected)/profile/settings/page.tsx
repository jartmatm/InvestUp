'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ProfileInfoTile,
  ProfilePageShell,
  ProfileSurface,
} from '@/components/profile/ProfilePageShell';
import { useAppTheme } from '@/lib/app-theme';
import { useInvestApp } from '@/lib/investapp-context';

function IconMoon() {
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
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function IconBell() {
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
      <path d="M6.5 9.5a5.5 5.5 0 1 1 11 0c0 5.2 2 6.5 2 6.5h-15s2-1.3 2-6.5" />
      <path d="M10 18.5a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

function PreferenceSwitchCard({
  title,
  description,
  checked,
  onToggle,
  statusLabel,
  icon,
  activeTone,
}: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  statusLabel: string;
  icon: React.ReactNode;
  activeTone: 'purple' | 'green';
}) {
  const activeClasses =
    activeTone === 'green'
      ? 'bg-[linear-gradient(135deg,rgba(20,132,90,0.14),rgba(255,255,255,0.96))] border-[#BEE8D2]'
      : 'bg-[linear-gradient(135deg,rgba(107,57,244,0.14),rgba(255,255,255,0.96))] border-[#DDD3FF]';

  return (
    <div
      className={`rounded-[26px] border px-4 py-4 shadow-[0_18px_36px_rgba(31,38,64,0.07)] ${
        checked ? activeClasses : 'border-[#EBEEF7] bg-white/82'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            activeTone === 'green' ? 'bg-[#EEF9F2] text-[#14845A]' : 'bg-[#F5F1FF] text-[#6B39F4]'
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1C2336]">{title}</p>
              <p className="mt-1 text-xs leading-5 text-[#7B879C]">{description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={checked}
              onClick={onToggle}
              className={`relative h-8 w-14 rounded-full transition ${
                checked
                  ? activeTone === 'green'
                    ? 'bg-[#14845A]'
                    : 'bg-[#6B39F4]'
                  : 'bg-[#D8DDEB]'
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] transition ${
                  checked ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="mt-4 rounded-[20px] border border-white/75 bg-white/78 px-3 py-2.5 text-xs font-medium text-[#5F6B82]">
            {statusLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const {
    faseApp,
    notificationsEnabled,
    unreadNotificationsCount,
    setNotificationsEnabled,
  } = useInvestApp();
  const { mode, toggleMode } = useAppTheme();

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <ProfilePageShell
      title="Settings"
      subtitle="Control appearance, notifications and the way InvestApp behaves for you."
    >
      <ProfileSurface className="bg-[linear-gradient(160deg,rgba(107,57,244,0.14)_0%,rgba(255,255,255,0.94)_46%,rgba(76,110,245,0.08)_100%)]">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
              Preferences
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
              Personalize your fintech workspace
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7B879C]">
              Keep the interface readable, quiet and aligned with how you monitor your activity.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <ProfileInfoTile
              icon={<IconMoon />}
              eyebrow="Theme"
              title={mode === 'dark' ? 'Dark mode enabled' : 'Light mode enabled'}
              description="Switch the full interface between light and dark appearance."
              tone="purple"
            />
            <ProfileInfoTile
              icon={<IconBell />}
              eyebrow="Notifications"
              title={notificationsEnabled ? 'Alerts enabled' : 'Alerts muted'}
              description={`Unread items: ${unreadNotificationsCount}`}
              tone="green"
            />
          </div>
        </div>
      </ProfileSurface>

      <ProfileSurface>
        <div className="flex flex-col gap-3">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
            Controls
          </p>
          <PreferenceSwitchCard
            title="Dark mode"
            description="Apply a darker visual theme across the app."
            checked={mode === 'dark'}
            onToggle={toggleMode}
            statusLabel={`Current mode: ${mode === 'dark' ? 'Dark' : 'Light'}`}
            icon={<IconMoon />}
            activeTone="purple"
          />
          <PreferenceSwitchCard
            title="Notifications"
            description="Enable alerts for incoming money, transfers, investments and profile updates."
            checked={notificationsEnabled}
            onToggle={() => setNotificationsEnabled(!notificationsEnabled)}
            statusLabel={`Notifications are ${notificationsEnabled ? 'enabled' : 'disabled'}. Unread items: ${unreadNotificationsCount}.`}
            icon={<IconBell />}
            activeTone="green"
          />
        </div>
      </ProfileSurface>
    </ProfilePageShell>
  );
}
