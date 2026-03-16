'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';

type ProjectDetail = {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  business_name: string | null;
  amount_requested: number | null;
  currency: string | null;
  term_months: number | null;
  interest_rate: number | null;
  city: string | null;
  country: string | null;
  publication_end_date: string | null;
  photo_urls: string[] | null;
  video_url: string | null;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const formatAmount = (amount: number | null, currency: string | null) => {
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
};

export default function FeedDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const { getAccessToken } = usePrivy();
  const { faseApp } = useInvestUp();
  const [project, setProject] = useState<ProjectDetail | null>(null);
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
    const loadProject = async () => {
      if (!projectId) {
        setStatus('Publicacion no encontrada.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setStatus('');
      const { data, error } = await supabase
        .from('projects')
        .select(
          'id,title,description,sector,business_name,amount_requested,currency,term_months,interest_rate,city,country,publication_end_date,photo_urls,video_url'
        )
        .eq('id', projectId)
        .maybeSingle();

      if (error) {
        setStatus(`No se pudo cargar la publicacion: ${error.message}`);
        setLoading(false);
        return;
      }
      setProject((data ?? null) as ProjectDetail | null);
      setLoading(false);
    };

    loadProject();
  }, [projectId, supabase]);

  return (
    <PageFrame title="Detalle" subtitle="Publicacion completa">
      {loading ? <p className="text-sm text-gray-500">Cargando publicacion...</p> : null}
      {status ? <p className="text-sm text-gray-500">{status}</p> : null}

      {!loading && project ? (
        <div className="space-y-4">
          {project.photo_urls?.[0] ? (
            <img
              src={project.photo_urls[0]}
              alt={project.title}
              className="h-56 w-full rounded-2xl object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-56 w-full items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-500">
              Sin imagen
            </div>
          )}

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">{project.title}</h2>
            {project.business_name ? (
              <p className="mt-1 text-sm text-gray-500">{project.business_name}</p>
            ) : null}
            <p className="mt-3 text-sm text-gray-700">{project.description}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Monto a recaudar</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatAmount(project.amount_requested, project.currency)}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Plazo</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {project.term_months ? `${project.term_months} meses` : '--'}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Tasa de interes</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {project.interest_rate ? `${project.interest_rate}%` : '--'}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Ubicacion</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {project.city || project.country
                  ? `${project.city ?? ''} ${project.country ?? ''}`.trim()
                  : 'Pendiente'}
              </p>
            </div>
          </div>

          {project.publication_end_date ? (
            <div className="rounded-2xl bg-white p-4 text-sm text-gray-700 shadow-sm">
              <span className="text-xs text-gray-500">Fecha limite</span>
              <p className="mt-1 font-semibold text-gray-900">{project.publication_end_date}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </PageFrame>
  );
}
