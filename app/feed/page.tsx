'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import PageFrame from '@/components/PageFrame';
import ProjectCard from '@/components/ProjectCard';
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

export default function FeedPage() {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const { faseApp } = useInvestUp();
  const [projects, setProjects] = useState<FeedProject[]>([]);
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

  return (
    <PageFrame title="Emprendimientos" subtitle="Proyectos publicados por emprendedores">
      {loading ? <p className="text-sm text-white/85">Cargando oportunidades...</p> : null}
      {status ? <p className="text-sm text-white/85">{status}</p> : null}

      <div className="space-y-4">
        {!loading && projects.length === 0 ? (
          <div className="rounded-3xl border border-white/35 bg-white/90 p-4 text-sm text-slate-600 shadow-xl shadow-violet-800/10">
            Aun no hay proyectos publicados.
          </div>
        ) : null}
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            title={project.title}
            description={project.description}
            sector={project.sector}
            city={project.city}
            country={project.country}
            amountRequested={project.amount_requested}
            currency={project.currency}
            termMonths={project.term_months}
            interestRate={project.interest_rate}
            publicationEndDate={project.publication_end_date}
            coverImage={project.photo_urls?.[0] ?? null}
          />
        ))}
      </div>
    </PageFrame>
  );
}
