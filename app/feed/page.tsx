'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import PageFrame from '@/components/PageFrame';
import ProjectPhotoCarousel from '@/components/ProjectPhotoCarousel';
import { useInvestUp } from '@/lib/investup-context';
import { toEnglishSector } from '@/lib/sector-labels';

type FeedProject = {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  amount_requested: number | null;
  amount_received: number | null;
  currency: string | null;
  term_months: number | null;
  interest_rate: number | null;
  city: string | null;
  country: string | null;
  publication_end_date: string | null;
  photo_urls: string[] | null;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 8v4l2 2" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}

function IconPercent() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 19L19 5" />
      <circle cx="7" cy="7" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function IconHeart({ filled }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 21s-6.7-4.3-9.2-7.6C1 11.5 1.2 8.4 3.4 6.7c2-1.6 4.9-1.2 6.6.8l2 2.3 2-2.3c1.7-2 4.6-2.4 6.6-.8 2.2 1.7 2.4 4.8.6 6.7C18.7 16.7 12 21 12 21z" />
    </svg>
  );
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null || amount === undefined) return 'No amount';
  const code = currency ?? 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}

const calculateProgress = (raised: number | null, requested: number | null) => {
  if (!requested || requested <= 0) return 0;
  const progress = ((raised ?? 0) / requested) * 100;
  return Math.max(0, Math.min(100, progress));
};

const normalizePhotos = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

export default function FeedPage() {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const { faseApp } = useInvestUp();
  const [projects, setProjects] = useState<FeedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

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
      if (!shouldFallback) return response;
      return run(baseHeaders);
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
    const loadFeed = async () => {
      setLoading(true);
      setStatus('');
      const { data, error } = await supabase
        .from('projects')
        .select(
          'id,title,description,sector,amount_requested,amount_received,currency,term_months,interest_rate,city,country,publication_end_date,photo_urls'
        )
        .order('created_at', { ascending: false });

      if (error) {
        setStatus(`Could not load the feed: ${error.message}`);
        setLoading(false);
        return;
      }

      const normalizedProjects = ((data ?? []) as FeedProject[]).map((project) => ({
        ...project,
        photo_urls: normalizePhotos(project.photo_urls),
      }));
      setProjects(normalizedProjects);
      setLoading(false);
    };

    loadFeed();
  }, [supabase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('investup_wishlist');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) setWishlist(parsed);
    } catch {
      setWishlist([]);
    }
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        projects.map((project) => {
          const sector = toEnglishSector(project.sector);
          return sector && sector.length > 0 ? sector : 'Uncategorized';
        })
      )
    );
    return ['All', ...uniqueCategories];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'All') return projects;
    return projects.filter((project) => {
      const sector = toEnglishSector(project.sector) || 'Uncategorized';
      return sector === selectedCategory;
    });
  }, [projects, selectedCategory]);

  const toggleFlip = (id: string) => {
    setFlippedId((prev) => (prev === id ? null : id));
  };

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('investup_wishlist', JSON.stringify(next));
      }
      return next;
    });
  };

  return (
    <PageFrame title="Ventures" subtitle="Projects published by entrepreneurs">
      {loading ? <p className="text-sm text-gray-500">Loading opportunities...</p> : null}
      {status ? <p className="text-sm text-gray-500">{status}</p> : null}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s picks</h2>
          <p className="text-xs text-gray-500">{filteredProjects.length} projects</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCategories((prev) => !prev)}
          className="rounded-full border border-[#D3C4FC] bg-white/25 px-4 py-2 text-sm font-semibold text-[#6B39F4] backdrop-blur-md"
        >
          Categories
        </button>
      </div>

      {showCategories ? (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const active = category === selectedCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'border-[#6B39F4] bg-[#6B39F4] text-white'
                    : 'border-white/25 bg-white/20 text-gray-700 backdrop-blur-md'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      ) : null}

      {!loading && filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-white/25 bg-white/20 p-4 text-sm text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          There are no listings for this category.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        {filteredProjects.map((project) => {
          const isFlipped = flippedId === project.id;
          const isWishlisted = wishlist.includes(project.id);
              const amountLabel = formatAmount(project.amount_requested, project.currency);
              const raisedLabel = formatAmount(project.amount_received, project.currency);
              const termLabel = project.term_months ? `${project.term_months} months` : '--';
              const rateLabel = project.interest_rate ? `${project.interest_rate}% EA` : '--';
              const categoryLabel = toEnglishSector(project.sector) || 'Uncategorized';
              const progress = calculateProgress(project.amount_received, project.amount_requested);

          return (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => toggleFlip(project.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') toggleFlip(project.id);
              }}
              className="text-left [perspective:1000px]"
            >
              <div
                className={`relative h-72 w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                  isFlipped ? '[transform:rotateY(180deg)]' : ''
                }`}
              >
                <div className="absolute inset-0 overflow-hidden rounded-2xl border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md [backface-visibility:hidden]">
                  <div className="relative">
                    <ProjectPhotoCarousel
                      images={project.photo_urls}
                      alt={project.title}
                      className="h-40 w-full"
                      imageClassName="h-40 w-full object-cover"
                      emptyClassName="flex h-40 w-full items-center justify-center bg-white/20 text-xs text-slate-500 backdrop-blur-md"
                    />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleWishlist(project.id);
                      }}
                      className="absolute right-3 top-3 rounded-full border border-white/25 bg-white/20 p-2 text-primary shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
                      aria-label="Add to favorites"
                    >
                      <IconHeart filled={isWishlisted} />
                    </button>
                  </div>

                  <div className="flex h-[calc(100%-10rem)] flex-col justify-between p-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{project.title}</p>
                      <div className="mt-2 inline-flex rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary">
                        {categoryLabel}
                      </div>
                      <p className="mt-3 line-clamp-3 text-xs leading-5 text-gray-600">
                        {project.description}
                      </p>
                    </div>

                    <div className="pt-3">
                      <p className="text-xs text-gray-500">
                        {project.city || project.country
                          ? `${project.city ?? ''} ${project.country ?? ''}`.trim()
                          : 'Location pending'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 p-4 text-white shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <p className="text-sm font-semibold">{project.title}</p>
                  <p className="mt-1 text-xs text-white/70">Funding details</p>

                        <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/15 p-1.5 text-white">
                              <IconTarget />
                            </span>
                            <div>
                              <p className="text-xs text-white/70">Funding goal</p>
                              <p className="font-semibold">{amountLabel}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-white/15 p-1.5 text-white">
                              <IconClock />
                            </span>
                            <div>
                              <p className="text-xs text-white/70">Term</p>
                              <p className="font-semibold">{termLabel}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-white/15 p-1.5 text-white">
                              <IconTarget />
                            </span>
                            <div>
                              <p className="text-xs text-white/70">Raised</p>
                              <p className="font-semibold">{raisedLabel}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-white/15 p-1.5 text-white">
                              <IconPercent />
                      </span>
                      <div>
                        <p className="text-xs text-white/70">Interest rate</p>
                        <p className="font-semibold">{rateLabel}</p>
                      </div>
                    </div>
                        </div>

                        <div className="mt-4">
                          <div className="h-2 rounded-full bg-white/20">
                            <div className="h-2 rounded-full bg-white" style={{ width: `${progress}%` }} />
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/feed/${project.id}`);
                      }}
                      className="rounded-full border border-white/30 bg-white/20 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md"
                    >
                      View details
                    </button>
                    <p className="text-xs text-white/70">Tap to flip back</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PageFrame>
  );
}
