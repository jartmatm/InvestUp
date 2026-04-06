'use client';

export type AppNotificationKind =
  | 'wallet_incoming'
  | 'transfer'
  | 'investment'
  | 'repayment'
  | 'profile_update'
  | 'top_up'
  | 'withdrawal';

export type AppNotification = {
  id: string;
  kind: AppNotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  txHash: string | null;
  dedupeKey: string | null;
  actionHref: string | null;
};

export type CreateAppNotificationInput = {
  kind: AppNotificationKind;
  title: string;
  body: string;
  createdAt?: string;
  txHash?: string | null;
  dedupeKey?: string | null;
  actionHref?: string | null;
};

const MAX_NOTIFICATIONS = 80;

const getPrimaryNotificationsKey = (userId: string) => `investapp_notifications_${userId}`;
const getLegacyNotificationsKey = (userId: string) => `investup_notifications_${userId}`;
const getPrimaryNotificationsEnabledKey = (userId: string) =>
  `investapp_notifications_enabled_${userId}`;
const getLegacyNotificationsEnabledKey = (userId: string) =>
  `investup_notifications_enabled_${userId}`;

const readStorage = (keys: string[]) => {
  if (typeof window === 'undefined') return null;

  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  }

  return null;
};

export const formatNotificationAmount = (amount: number | string | null | undefined) => {
  const numericAmount = typeof amount === 'number' ? amount : Number(amount ?? 0);
  if (!Number.isFinite(numericAmount)) return '0.00 USDC';
  return `${numericAmount.toFixed(2)} USDC`;
};

export const buildTransactionNotificationKey = (
  txHash: string | null | undefined,
  transactionId: string | null | undefined
) => {
  if (txHash) return `tx:${txHash}`;
  if (transactionId) return `transaction:${transactionId}`;
  return null;
};

export const createNotificationEntry = ({
  kind,
  title,
  body,
  createdAt,
  txHash = null,
  dedupeKey = null,
  actionHref = null,
}: CreateAppNotificationInput): AppNotification => ({
  id:
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  kind,
  title,
  body,
  createdAt: createdAt ?? new Date().toISOString(),
  read: false,
  txHash,
  dedupeKey,
  actionHref,
});

export const readStoredNotifications = (userId: string): AppNotification[] => {
  const raw = readStorage([getPrimaryNotificationsKey(userId), getLegacyNotificationsKey(userId)]);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is AppNotification => {
        return Boolean(
          item &&
            typeof item === 'object' &&
            typeof (item as AppNotification).id === 'string' &&
            typeof (item as AppNotification).title === 'string'
        );
      })
      .slice(0, MAX_NOTIFICATIONS);
  } catch {
    return [];
  }
};

export const writeStoredNotifications = (userId: string, notifications: AppNotification[]) => {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS));
  window.localStorage.setItem(getPrimaryNotificationsKey(userId), serialized);
  window.localStorage.setItem(getLegacyNotificationsKey(userId), serialized);
};

export const readNotificationsEnabled = (userId: string) => {
  const raw = readStorage([
    getPrimaryNotificationsEnabledKey(userId),
    getLegacyNotificationsEnabledKey(userId),
  ]);

  if (raw === null) return true;
  return raw === '1';
};

export const writeNotificationsEnabled = (userId: string, enabled: boolean) => {
  if (typeof window === 'undefined') return;
  const serialized = enabled ? '1' : '0';
  window.localStorage.setItem(getPrimaryNotificationsEnabledKey(userId), serialized);
  window.localStorage.setItem(getLegacyNotificationsEnabledKey(userId), serialized);
};

export const showBrowserNotification = (notification: AppNotification) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(notification.title, {
      body: notification.body,
      tag: notification.dedupeKey ?? notification.id,
    });
  } catch {
    // Ignore browser notification failures and keep the in-app feed working.
  }
};

export const requestBrowserNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'default') return;

  try {
    await Notification.requestPermission();
  } catch {
    // Ignore permission request failures.
  }
};
