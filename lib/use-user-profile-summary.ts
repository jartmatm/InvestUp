'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  clearLegacyGlobalProfileSummaryCache,
  PROFILE_SUMMARY_UPDATED_EVENTS,
  readProfileSummaryCache,
  writeProfileSummaryCache,
} from '@/lib/profile-summary-cache';
import { fetchCurrentUserProfile } from '@/utils/client/current-user-profile';

type ProfileSummary = {
  avatarUrl: string;
  displayName: string;
  email: string;
  loading: boolean;
};

type ProfileBlob = {
  name?: string;
  surname?: string;
  avatar_url?: string;
} | null;

const parseProfileBlob = (value: unknown): ProfileBlob => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as ProfileBlob;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as ProfileBlob;
  }
  return null;
};

const pickFirstFilledString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

export function useUserProfileSummary(): ProfileSummary {
  const { user, getAccessToken } = usePrivy();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(user?.email?.address ?? '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    clearLegacyGlobalProfileSummaryCache();

    if (!user?.id) {
      setAvatarUrl('');
      setDisplayName('');
      setEmail(user?.email?.address ?? '');
      return;
    }

    const cachedProfile = readProfileSummaryCache(user.id);
    setAvatarUrl(cachedProfile.avatarUrl);
    setDisplayName(cachedProfile.displayName);
    setEmail(cachedProfile.email || user.email?.address || '');
  }, [user?.email?.address, user?.id]);

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return false;
    }

    setLoading(true);

    try {
      const { data } = await fetchCurrentUserProfile<Record<string, unknown> | null>(getAccessToken);
      const profileData = parseProfileBlob(data?.profile_data ?? data?.metadata ?? null);
      const emailValue = pickFirstFilledString(data?.email, user.email?.address);
      const nameValue = pickFirstFilledString(data?.name, profileData?.name);
      const surnameValue = pickFirstFilledString(data?.surname, profileData?.surname);
      const resolvedName = `${nameValue} ${surnameValue}`.trim() || (emailValue ? emailValue.split('@')[0] : 'User');
      const cachedProfile = readProfileSummaryCache(user.id);
      const resolvedAvatar = pickFirstFilledString(
        data?.avatar_url,
        profileData?.avatar_url,
        cachedProfile.avatarUrl
      );

      setEmail(emailValue);
      setDisplayName(resolvedName);
      setAvatarUrl(resolvedAvatar);
      writeProfileSummaryCache(user.id, {
        avatarUrl: resolvedAvatar,
        displayName: resolvedName,
        email: emailValue,
      });

      return Boolean(resolvedAvatar);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, user?.email?.address, user?.id]);

  useEffect(() => {
    let retryShort: number | undefined;
    let retryLong: number | undefined;

    const start = async () => {
      const hasAvatar = await loadProfile();
      if (typeof window === 'undefined' || !user?.id || hasAvatar) return;

      retryShort = window.setTimeout(() => {
        void loadProfile();
      }, 800);

      retryLong = window.setTimeout(() => {
        void loadProfile();
      }, 2200);
    };

    void start();

    if (typeof window === 'undefined') return undefined;

    const handleFocus = () => {
      void loadProfile();
    };

    const handleProfileUpdate = () => {
      if (user?.id) {
        const cachedProfile = readProfileSummaryCache(user.id);
        setAvatarUrl(cachedProfile.avatarUrl);
        setDisplayName(cachedProfile.displayName);
        setEmail(cachedProfile.email || user.email?.address || '');
      }
      void loadProfile();
    };

    window.addEventListener('focus', handleFocus);
    PROFILE_SUMMARY_UPDATED_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleProfileUpdate);
    });
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      if (retryShort) window.clearTimeout(retryShort);
      if (retryLong) window.clearTimeout(retryLong);
      window.removeEventListener('focus', handleFocus);
      PROFILE_SUMMARY_UPDATED_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleProfileUpdate);
      });
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, [loadProfile, user?.id]);

  return { avatarUrl, displayName, email, loading };
}
