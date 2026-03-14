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
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

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

  const toggleFlip = (id: string) => {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
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
          const isFlipped = !!flipped[project.id];
          const coverImage = project.photo_urls?.[0] ?? '';
          const amountLabel = formatAmount(project.amount_requested, project.currency);
          const termLabel = project.term_months ? `${project.term_months} meses` : '--';
          const rateLabel = project.interest_rate ? `${project.interest_rate}%` : '--';

          return (
            <button
              key={project.id}
              type="button"
              onClick={() => toggleFlip(project.id)}
              className="text-left [perspective:1000px]"
            >
              <div
                className={`relative h-56 w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                  isFlipped ? '[transform:rotateY(180deg)]' : ''
                }`}
              >
                <div className="absolute inset-0 overflow-hidden rounded-2xl bg-white shadow-sm [backface-visibility:hidden]">
                  {coverImage ? (
                    <img src={coverImage} alt={project.title} className="h-32 w-full object-cover" />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center bg-slate-100 text-xs text-slate-500">
                      Sin imagen
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{project.title}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                        Ver detalle
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {project.city || project.country ? `${project.city ?? ''} ${project.country ?? ''}`.trim() : 'Ubicacion pendiente'}
                    </p>
                  </div>
                </div>

                <div className="absolute inset-0 rounded-2xl bg-primary p-4 text-white shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
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

                  <p className="mt-4 text-xs text-white/60">Toca para volver</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </PageFrame>
  );
}
