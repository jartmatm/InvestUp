'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import PageFrame from '@/components/PageFrame';
import ProjectPhotoCarousel from '@/components/ProjectPhotoCarousel';
import { useInvestApp } from '@/lib/investapp-context';
import { toEnglishSector } from '@/lib/sector-labels';
import { readWishlist } from '@/lib/wishlist-storage';

type FavoriteProject = {
  id: string | number;
  title: string | null;
  description: string | null;
  sector: string | null;
  city: string | null;
  country: string | null;
  amount_requested: number | null;
  interest_rate: number | null;
  photo_urls: string[];
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const normalizePhotos = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const formatAmount = (amount: number | null) => {
  if (amount == null) return 'Open amount';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function FavoritesPage() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado } = useInvestApp();
  const [projects, setProjects] = useState<FavoriteProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const supabase = useMemo(() => {
    const authedFetch: typeof fetch = async (input, init = {}) => {
      const token = await getAccessToken();
      const baseHeaders = new Headers(init.headers ?? {});
      baseHeaders.set('apikey', SUPABASE_ANON_KEY);
      const run = (headers: Headers) => fetch(input, { ...init, headers });
      if (!token) return run(baseHeaders);

      const headersWithAuth = new Headers(baseHeaders);
      headersWithAuth.set('Authorization', `Bearer ${token}`);
      const response = await run(headersWithAuth);
      if (response.ok) return response;

      const raw = (await response.clone().text()).toLowerCase();
      const shouldFallback =
        response.status === 401 ||
        response.status === 403 ||
        raw.includes('no suitable key') ||
        raw.includes('wrong key type') ||
        raw.includes('invalid jwt');

      return shouldFallback ? run(baseHeaders) : response;
    };

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: authedFetch },
    });
  }, [getAccessToken]);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadFavorites = async () => {
      if (rolSeleccionado !== 'inversor') {
        setProjects([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setStatus('');

      if (typeof window === 'undefined') {
        setProjects([]);
        setLoading(false);
        return;
      }

      const wishlist = readWishlist(user?.id);

      if (wishlist.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      const numericIds = wishlist
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
      const idsForQuery = numericIds.length > 0 ? numericIds : wishlist;

      const { data, error } = await supabase
        .from('projects')
        .select('id,title,description,sector,city,country,amount_requested,interest_rate,photo_urls')
        .in('id', idsForQuery)
        .order('created_at', { ascending: false });

      if (error) {
        setStatus('Could not load your favorite ventures.');
        setProjects([]);
        setLoading(false);
        return;
      }

      const normalizedProjects = ((data ?? []) as FavoriteProject[]).map((project) => ({
        ...project,
        photo_urls: normalizePhotos(project.photo_urls),
      }));

      const projectMap = new Map(
        normalizedProjects.map((project) => [String(project.id), project])
      );

      const orderedProjects = wishlist
        .map((id) => projectMap.get(String(id)) ?? null)
        .filter((project): project is FavoriteProject => Boolean(project));

      setProjects(orderedProjects);
      setLoading(false);
    };

    void loadFavorites();
  }, [rolSeleccionado, supabase, user?.id]);

  return (
    <PageFrame title="Favorites" subtitle="Your saved ventures in one place">
      {rolSeleccionado !== 'inversor' ? (
        <div className="rounded-[22px] border border-white/25 bg-white/20 p-5 text-sm text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          Favorites are available only for investor accounts.
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? <p className="text-sm text-gray-500">Loading favorites...</p> : null}
          {status ? <p className="text-sm text-gray-500">{status}</p> : null}

          {!loading && !status && projects.length === 0 ? (
            <div className="rounded-[22px] border border-white/25 bg-white/20 p-5 text-sm text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              You have not saved any ventures yet. Tap the heart in the ventures feed to build your favorites list.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 pb-8">
            {projects.map((project) => {
              const categoryLabel = toEnglishSector(project.sector) || 'Uncategorized';
              const locationLabel =
                project.city || project.country
                  ? `${project.city ?? ''} ${project.country ?? ''}`.trim()
                  : 'Location pending';

              return (
                <button
                  key={String(project.id)}
                  type="button"
                  onClick={() => router.push(`/feed/${project.id}`)}
                  className="overflow-hidden rounded-[24px] border border-white/25 bg-white/20 text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md transition hover:bg-white/25"
                >
                  <ProjectPhotoCarousel
                    images={project.photo_urls}
                    alt={project.title ?? 'Favorite venture'}
                    className="h-44 w-full"
                    imageClassName="h-44 w-full object-cover"
                    emptyClassName="flex h-44 w-full items-center justify-center bg-white/20 text-xs text-slate-500 backdrop-blur-md"
                  />

                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-gray-900">
                          {project.title || 'Business'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">{locationLabel}</p>
                      </div>
                      <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary">
                        {categoryLabel}
                      </span>
                    </div>

                    <p className="line-clamp-3 text-sm leading-6 text-gray-600">
                      {project.description || 'Open this venture to see more details.'}
                    </p>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Goal</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatAmount(project.amount_requested)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Interest rate</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {project.interest_rate ? `${project.interest_rate}% EA` : '--'}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </PageFrame>
  );
}
