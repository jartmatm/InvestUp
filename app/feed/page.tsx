'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';

type FeedProject = {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  amount_requested: number | null;
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
  if (amount === null || amount === undefined) return 'Sin monto';
  const code = currency ?? 'USD';
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}

export default function FeedPage() {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const { faseApp } = useInvestUp();
  const [projects, setProjects] = useState<FeedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);

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
          'id,title,description,sector,amount_requested,currency,term_months,interest_rate,city,country,publication_end_date,photo_urls'
        )
        .order('created_at', { ascending: false });

      if (error) {
        setStatus(`No se pudo cargar feed: ${error.message}`);
        setLoading(false);
        return;
      }
      setProjects((data ?? []) as FeedProject[]);
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
    <PageFrame title="Emprendimientos" subtitle="Proyectos publicados por emprendedores">
      {loading ? <p className="text-sm text-gray-500">Cargando oportunidades...</p> : null}
      {status ? <p className="text-sm text-gray-500">{status}</p> : null}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Sugerencias de hoy</h2>
        <p className="text-xs text-gray-500">{projects.length} proyectos</p>
      </div>

      {!loading && projects.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
          Aun no hay proyectos publicados.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {projects.map((project) => {
          const isFlipped = flippedId === project.id;
          const isWishlisted = wishlist.includes(project.id);
          const coverImage = project.photo_urls?.[0] ?? '';
          const amountLabel = formatAmount(project.amount_requested, project.currency);
          const termLabel = project.term_months ? `${project.term_months} meses` : '--';
          const rateLabel = project.interest_rate ? `${project.interest_rate}%` : '--';

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
                className={`relative h-56 w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                  isFlipped ? '[transform:rotateY(180deg)]' : ''
                }`}
              >
                <div className="absolute inset-0 overflow-hidden rounded-2xl bg-white shadow-sm [backface-visibility:hidden]">
                  <div className="relative">
                    {coverImage ? (
                      <img src={coverImage} alt={project.title} className="h-32 w-full object-cover" />
                    ) : (
                      <div className="flex h-32 w-full items-center justify-center bg-slate-100 text-xs text-slate-500">
                        Sin imagen
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleWishlist(project.id);
                      }}
                      className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-primary shadow"
                      aria-label="Agregar a favoritos"
                    >
                      <IconHeart filled={isWishlisted} />
                    </button>
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{project.title}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                        Ver detalle
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {project.city || project.country
                        ? `${project.city ?? ''} ${project.country ?? ''}`.trim()
                        : 'Ubicacion pendiente'}
                    </p>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/feed/${project.id}`);
                      }}
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 px-3 py-1 text-xs font-semibold text-primary"
                    >
                      Detalles
                    </button>
                  </div>
                </div>

                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 p-4 text-white shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <p className="text-sm font-semibold">{project.title}</p>
                  <p className="mt-1 text-xs text-white/70">Detalles de financiamiento</p>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/15 p-1.5 text-white">
                        <IconTarget />
                      </span>
                      <div>
                        <p className="text-xs text-white/70">Monto a recaudar</p>
                        <p className="font-semibold">{amountLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/15 p-1.5 text-white">
                        <IconClock />
                      </span>
                      <div>
                        <p className="text-xs text-white/70">Plazo</p>
                        <p className="font-semibold">{termLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/15 p-1.5 text-white">
                        <IconPercent />
                      </span>
                      <div>
                        <p className="text-xs text-white/70">Tasa de interes</p>
                        <p className="font-semibold">{rateLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/feed/${project.id}`);
                      }}
                      className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-blue-600"
                    >
                      Detalles
                    </button>
                    <p className="text-xs text-white/70">Toca para volver</p>
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
