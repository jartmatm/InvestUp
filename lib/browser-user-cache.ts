'use client';

import { clearStoredNotifications } from '@/lib/app-notifications';
import { clearPendingInvestment } from '@/lib/pending-investment';
import { clearProfileSummaryCache } from '@/lib/profile-summary-cache';

const APP_STORAGE_PREFIXES = ['investapp_', 'investup_'] as const;
const LEGACY_GLOBAL_SESSION_KEYS = [
  'recent_contacts',
  'recentContacts',
  'investapp_recent_contacts',
  'investup_recent_contacts',
] as const;

const removeScopedKeys = (storage: Storage, userId: string) => {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;

    const belongsToApp = APP_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (belongsToApp && key.includes(userId)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    storage.removeItem(key);
  });
};

const removeLegacyGlobalSessionKeys = (storage: Storage) => {
  LEGACY_GLOBAL_SESSION_KEYS.forEach((key) => {
    storage.removeItem(key);
  });
};

export const clearAuthenticatedUserBrowserCache = (userId: string | null | undefined) => {
  if (typeof window === 'undefined') return;

  clearProfileSummaryCache(userId);
  clearPendingInvestment(userId);
  clearStoredNotifications(userId);

  if (!userId) {
    removeLegacyGlobalSessionKeys(window.localStorage);
    removeLegacyGlobalSessionKeys(window.sessionStorage);
    return;
  }

  removeScopedKeys(window.localStorage, userId);
  removeScopedKeys(window.sessionStorage, userId);
  removeLegacyGlobalSessionKeys(window.localStorage);
  removeLegacyGlobalSessionKeys(window.sessionStorage);
};
