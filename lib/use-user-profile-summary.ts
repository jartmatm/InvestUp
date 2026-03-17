'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';

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

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

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

  const supabase = useMemo(() => {
    const authedFetch: typeof fetch = async (input, init = {}) => {
      const token = await getAccessToken();
      const baseHeaders = new Headers(init.headers ?? {});
      baseHeaders.set('apikey', SUPABASE_ANON_KEY);

      const run = (headers: Headers) => fetch(input, { ...init, headers });

      if (!token) {
        return run(baseHeaders);
      }

      const headersWithAuth = new Headers(baseHeaders);
      headersWithAuth.set('Authorization', `Bearer ${token}`);
      const response = await run(headersWithAuth);

      if (response.ok) return response;

      const raw = await response.clone().text();
      const lower = raw.toLowerCase();
      const shouldFallback =
        response.status === 401 ||
        response.status === 403 ||
        lower.includes('no suitable key') ||
        lower.includes('wrong key type') ||
        lower.includes('invalid jwt');

      if (!shouldFallback) return response;

      return run(baseHeaders);
    };

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: authedFetch },
    });
  }, [getAccessToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cachedAvatar = window.localStorage.getItem('investup_avatar_url') ?? '';
    const cachedName = window.localStorage.getItem('investup_display_name') ?? '';
    const cachedEmail = window.localStorage.getItem('investup_email') ?? '';

    if (cachedAvatar) setAvatarUrl(cachedAvatar);
    if (cachedName) setDisplayName(cachedName);
    if (cachedEmail) setEmail(cachedEmail);
  }, []);

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return false;
    }

    setLoading(true);

    try {
      const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
      const profileData = parseProfileBlob(data?.profile_data ?? data?.metadata ?? null);
      const emailValue = pickFirstFilledString(data?.email, user.email?.address);
      const nameValue = pickFirstFilledString(data?.name, profileData?.name);
      const surnameValue = pickFirstFilledString(data?.surname, profileData?.surname);
      const resolvedName = `${nameValue} ${surnameValue}`.trim() || (emailValue ? emailValue.split('@')[0] : 'Usuario');
      const cachedAvatar =
        typeof window !== 'undefined' ? window.localStorage.getItem('investup_avatar_url') ?? '' : '';
      const resolvedAvatar = pickFirstFilledString(data?.avatar_url, profileData?.avatar_url, cachedAvatar);

      setEmail(emailValue);
      setDisplayName(resolvedName);
      setAvatarUrl(resolvedAvatar);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('investup_display_name', resolvedName);
        window.localStorage.setItem('investup_email', emailValue);

        if (resolvedAvatar) {
          window.localStorage.setItem('investup_avatar_url', resolvedAvatar);
        } else {
          window.localStorage.removeItem('investup_avatar_url');
        }
      }

      return Boolean(resolvedAvatar);
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.email?.address, user?.id]);

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
      const cachedAvatar = window.localStorage.getItem('investup_avatar_url') ?? '';
      const cachedName = window.localStorage.getItem('investup_display_name') ?? '';
      const cachedEmail = window.localStorage.getItem('investup_email') ?? '';

      if (cachedAvatar) setAvatarUrl(cachedAvatar);
      if (cachedName) setDisplayName(cachedName);
      if (cachedEmail) setEmail(cachedEmail);
      void loadProfile();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('investup-profile-updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      if (retryShort) window.clearTimeout(retryShort);
      if (retryLong) window.clearTimeout(retryLong);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('investup-profile-updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, [loadProfile, user?.id]);

  return { avatarUrl, displayName, email, loading };
}
