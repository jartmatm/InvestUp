'use client';

const PROFILE_UPDATED_EVENTS = ['investapp-profile-updated', 'investup-profile-updated'] as const;
const GLOBAL_AVATAR_KEYS = ['investapp_avatar_url', 'investup_avatar_url'] as const;
const GLOBAL_DISPLAY_NAME_KEYS = ['investapp_display_name', 'investup_display_name'] as const;
const GLOBAL_EMAIL_KEYS = ['investapp_email', 'investup_email'] as const;

const getAvatarKeys = (userId: string) =>
  [`investapp_avatar_url_${userId}`, `investup_avatar_url_${userId}`] as const;

const getDisplayNameKeys = (userId: string) =>
  [`investapp_display_name_${userId}`, `investup_display_name_${userId}`] as const;

const getEmailKeys = (userId: string) =>
  [`investapp_email_${userId}`, `investup_email_${userId}`] as const;

const readFirstStoredValue = (keys: readonly string[]) => {
  if (typeof window === 'undefined') return '';

  for (const key of keys) {
    const value = window.localStorage.getItem(key) ?? '';
    if (value) return value;
  }

  return '';
};

export const readProfileSummaryCache = (userId: string) => ({
  avatarUrl: readFirstStoredValue(getAvatarKeys(userId)),
  displayName: readFirstStoredValue(getDisplayNameKeys(userId)),
  email: readFirstStoredValue(getEmailKeys(userId)),
});

export const writeProfileSummaryCache = (
  userId: string,
  {
    avatarUrl,
    displayName,
    email,
  }: {
    avatarUrl: string;
    displayName: string;
    email: string;
  }
) => {
  if (typeof window === 'undefined') return;

  getDisplayNameKeys(userId).forEach((key) => {
    window.localStorage.setItem(key, displayName);
  });
  getEmailKeys(userId).forEach((key) => {
    window.localStorage.setItem(key, email);
  });

  if (avatarUrl) {
    getAvatarKeys(userId).forEach((key) => {
      window.localStorage.setItem(key, avatarUrl);
    });
  } else {
    getAvatarKeys(userId).forEach((key) => {
      window.localStorage.removeItem(key);
    });
  }
};

export const writeProfileAvatarCache = (userId: string, avatarUrl: string) => {
  if (typeof window === 'undefined') return;

  if (avatarUrl) {
    getAvatarKeys(userId).forEach((key) => {
      window.localStorage.setItem(key, avatarUrl);
    });
    return;
  }

  getAvatarKeys(userId).forEach((key) => {
    window.localStorage.removeItem(key);
  });
};

export const clearLegacyGlobalProfileSummaryCache = () => {
  if (typeof window === 'undefined') return;

  [...GLOBAL_AVATAR_KEYS, ...GLOBAL_DISPLAY_NAME_KEYS, ...GLOBAL_EMAIL_KEYS].forEach((key) => {
    window.localStorage.removeItem(key);
  });
};

export const PROFILE_SUMMARY_UPDATED_EVENTS = PROFILE_UPDATED_EVENTS;
