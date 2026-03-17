'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';

type ProfileSummary = {
  avatarUrl: string;
  displayName: string;
  email: string;
  loading: boolean;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

export function useUserProfileSummary(): ProfileSummary {
  const { user, getAccessToken, ready, authenticated } = usePrivy();
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

  useEffect(() => {
    const loadProfile = async () => {
      if (!ready || !authenticated || !user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data } = await supabase
        .from('users')
        .select('email,name,surname,avatar_url,profile_data,metadata')
        .eq('id', user.id)
        .maybeSingle();

      const rawProfileData = data?.profile_data ?? data?.metadata ?? null;
      let profileData: { name?: string; surname?: string; avatar_url?: string } | null = null;
      if (rawProfileData && typeof rawProfileData === 'string') {
        try {
          profileData = JSON.parse(rawProfileData) as { name?: string; surname?: string; avatar_url?: string };
        } catch {
          profileData = null;
        }
      } else if (rawProfileData && typeof rawProfileData === 'object') {
        profileData = rawProfileData as { name?: string; surname?: string; avatar_url?: string };
      }

      const emailValue = (data?.email as string | null) ?? user.email?.address ?? '';
      const nameValue = (data?.name as string | null) ?? profileData?.name ?? '';
      const surnameValue = (data?.surname as string | null) ?? profileData?.surname ?? '';
      const fullName = `${nameValue} ${surnameValue}`.trim();
      const fallbackName = emailValue ? emailValue.split('@')[0] : 'Usuario';

      const resolvedName = fullName || fallbackName;
      const resolvedAvatar = (data?.avatar_url as string | null) ?? profileData?.avatar_url ?? '';

      setEmail(emailValue);
      setDisplayName(resolvedName);
      setAvatarUrl((prev) => resolvedAvatar || prev);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('investup_display_name', resolvedName);
        window.localStorage.setItem('investup_email', emailValue);
        if (resolvedAvatar) {
          window.localStorage.setItem('investup_avatar_url', resolvedAvatar);
        }
      }
      setLoading(false);
    };

    loadProfile();
    if (typeof window === 'undefined') return;
    const handleFocus = () => loadProfile();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [authenticated, ready, user?.id, user?.email?.address, supabase]);

  return { avatarUrl, displayName, email, loading };
}

