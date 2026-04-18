'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageFrame from '@/components/PageFrame';
import { useAppTheme } from '@/lib/app-theme';
import { useInvestApp } from '@/lib/investapp-context';

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
    <PageFrame
      title="Settings"
      subtitle="Control appearance, notifications, and the way InvestApp behaves for you"
      showBackButton
      backHref="/profile"
    >
      <div className="space-y-5">
        <div className="rounded-[28px] border border-white/30 bg-[linear-gradient(140deg,rgba(107,57,244,0.14),rgba(255,255,255,0.8),rgba(74,108,247,0.12))] p-5 shadow-[0_16px_38px_rgba(15,23,42,0.10)] backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B39F4]">
            Preferences
          </p>
          <h2 className="mt-3 text-[1.45rem] font-semibold text-gray-900">
            Personalize your fintech workspace
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Keep the interface clean, readable, and aligned with how you want to monitor your
            account.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/40 bg-white/72 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Theme
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {mode === 'dark' ? 'Dark mode enabled' : 'Light mode enabled'}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/40 bg-white/72 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Notifications
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {notificationsEnabled ? 'Alerts enabled' : 'Alerts muted'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-gray-900">Dark mode</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                Apply a darker visual theme across the app.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={mode === 'dark'}
              onClick={toggleMode}
              className={`relative h-8 w-14 rounded-full transition ${
                mode === 'dark' ? 'bg-[#6B39F4]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] transition ${
                  mode === 'dark' ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/20 bg-white/30 px-4 py-3 text-sm text-gray-500">
            Current mode:{' '}
            <span className="font-semibold text-gray-900">
              {mode === 'dark' ? 'Dark' : 'Light'}
            </span>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-gray-900">Notifications</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                Enable alerts for incoming money, transfers, investments, repayments, profile
                updates, top ups and withdrawals.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`relative h-8 w-14 rounded-full transition ${
                notificationsEnabled ? 'bg-[#6B39F4]' : 'bg-[#DF1C41]'
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] transition ${
                  notificationsEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/20 bg-white/30 px-4 py-3 text-sm text-gray-500">
            Notifications are{' '}
            <span className={`font-semibold ${notificationsEnabled ? 'text-gray-900' : 'text-[#DF1C41]'}`}>
              {notificationsEnabled ? 'Enabled' : 'Disabled'}
            </span>
            . Unread items: <span className="font-semibold text-gray-900">{unreadNotificationsCount}</span>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
