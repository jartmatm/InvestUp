'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageFrame from '@/components/PageFrame';
import { useInvestApp } from '@/lib/investapp-context';
import type { AppNotification } from '@/lib/app-notifications';

const formatNotificationDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  return date.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getKindTone = (kind: AppNotification['kind']) => {
  if (kind === 'wallet_incoming') return 'border-[#40C4AA]/35 bg-[#EFFEFA] text-[#1A8E78]';
  if (kind === 'profile_update') return 'border-[#D3C4FC] bg-[#F4F0FF] text-[#6B39F4]';
  if (kind === 'withdrawal') return 'border-[#DF1C41]/20 bg-[#FFF1F3] text-[#C42847]';
  return 'border-[#E2E8F0] bg-white/70 text-[#475569]';
};

const getKindLabel = (kind: AppNotification['kind']) => {
  if (kind === 'wallet_incoming') return 'Incoming';
  if (kind === 'transfer') return 'Transfer';
  if (kind === 'investment') return 'Investment';
  if (kind === 'repayment') return 'Repayment';
  if (kind === 'profile_update') return 'Profile';
  if (kind === 'top_up') return 'Top up';
  return 'Withdrawal';
};

export default function NotificationsPage() {
  const router = useRouter();
  const {
    faseApp,
    notifications,
    notificationsEnabled,
    unreadNotificationsCount,
    setNotificationsEnabled,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useInvestApp();

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <PageFrame
      title="Notifications"
      subtitle={
        notificationsEnabled
          ? 'Track wallet and profile activity in one place'
          : 'Notifications are disabled right now'
      }
    >
      <div className="space-y-4">
        <div className="rounded-[24px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-gray-900">Notification center</p>
              <p className="mt-1 text-sm text-gray-500">
                Enable or mute alerts for movements in your wallet and account.
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/20 px-4 py-3 text-sm text-gray-500">
            <p>
              Status:{' '}
              <span className={`font-semibold ${notificationsEnabled ? 'text-gray-900' : 'text-[#DF1C41]'}`}>
                {notificationsEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </p>
            <p>
              Unread: <span className="font-semibold text-gray-900">{unreadNotificationsCount}</span>
            </p>
            <button
              type="button"
              onClick={markAllNotificationsAsRead}
              className="rounded-full border border-[#D3C4FC] px-4 py-2 text-xs font-semibold text-[#6B39F4]"
            >
              Mark all as read
            </button>
          </div>
        </div>

        {!notificationsEnabled ? (
          <div className="rounded-[20px] border border-[#DF1C41]/15 bg-[#FFF1F3] px-4 py-4 text-sm text-[#C42847]">
            New alerts will stop being generated until you enable notifications again.
          </div>
        ) : null}

        {notifications.length === 0 ? (
          <div className="rounded-[20px] border border-white/25 bg-white/20 px-4 py-5 text-sm text-[#818898] backdrop-blur-md">
            No notifications yet. Your next wallet or profile event will show up here.
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => {
                  markNotificationAsRead(notification.id);
                  if (notification.actionHref) {
                    router.push(notification.actionHref);
                  }
                }}
                className={`w-full rounded-[24px] border px-4 py-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition ${
                  notification.read
                    ? 'border-white/25 bg-white/20'
                    : 'border-[#D3C4FC] bg-white/70'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#0F172A]">{notification.title}</p>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getKindTone(
                          notification.kind
                        )}`}
                      >
                        {getKindLabel(notification.kind)}
                      </span>
                      {!notification.read ? (
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#6B39F4]" />
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm text-[#666D80]">{notification.body}</p>
                    <p className="mt-3 text-xs text-[#818898]">
                      {formatNotificationDate(notification.createdAt)}
                    </p>
                  </div>

                  <span className="text-xs font-semibold text-[#6B39F4]">
                    {notification.actionHref ? 'Open' : 'Seen'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </PageFrame>
  );
}
