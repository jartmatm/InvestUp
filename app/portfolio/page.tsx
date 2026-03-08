'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import { getCountries } from 'libphonenumber-js';
import InvestmentCard from '@/components/InvestmentCard';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PageFrame from '@/components/PageFrame';
import ProjectCard from '@/components/ProjectCard';
import { useInvestUp } from '@/lib/investup-context';

type ProjectRow = {
  id: string;
  business_name: string;
  description: string;
  city: string | null;
  country: string | null;
  target_amount_usd: number | null;
  interest_rate_ea: number | null;
  publication_end_date: string | null;
  photo_urls: string[] | null;
  created_at: string;
};

type PublishForm = {
  businessName: string;
  legalRepresentative: string;
  nit: string;
  openingDate: string;
  address: string;
  phone: string;
  city: string;
  country: string;
  description: string;
  targetAmountUsd: string;
  publicationEndDate: string;
  interestRateEa: string;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const REGION_NAMES = new Intl.DisplayNames(['es', 'en'], { type: 'region' });
const COUNTRY_OPTIONS = getCountries()
  .map((code) => ({ code, name: REGION_NAMES.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));

const emptyForm: PublishForm = {
  businessName: '',
  legalRepresentative: '',
  nit: '',
  openingDate: '',
  address: '',
  phone: '',
  city: '',
  country: '',
  description: '',
  targetAmountUsd: '',
  publicationEndDate: '',
  interestRateEa: '',
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('No se pudo leer archivo.'));
    reader.readAsDataURL(file);
  });

export default function PortfolioPage() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, historial, rolSeleccionado, smartWalletAddress } = useInvestUp();
  const [showPublisher, setShowPublisher] = useState(false);
  const [form, setForm] = useState<PublishForm>(emptyForm);
  const [projectPhotos, setProjectPhotos] = useState<string[]>([]);
  const [projectVideo, setProjectVideo] = useState<string>('');
  const [myProjects, setMyProjects] = useState<ProjectRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [improvingAI, setImprovingAI] = useState(false);
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
    const preloadCountry = async () => {
      if (!user?.id || rolSeleccionado !== 'emprendedor') return;
      const { data } = await supabase
        .from('users')
        .select('country')
        .eq('id', user.id)
        .maybeSingle();
      const countryRaw = (data?.country as string | null) ?? '';
      const byCode = COUNTRY_OPTIONS.find((option) => option.code === countryRaw.toUpperCase());
      const byName = COUNTRY_OPTIONS.find(
        (option) => option.name.toLowerCase() === countryRaw.toLowerCase()
      );
      const normalized = byCode?.code ?? byName?.code ?? '';
      if (normalized) setForm((prev) => ({ ...prev, country: normalized }));
    };
    preloadCountry();
  }, [rolSeleccionado, supabase, user?.id]);

  const loadMyProjects = async () => {
    if (!user?.id) return;
    setLoadingProjects(true);
    const { data, error } = await supabase
      .from('projects')
      .select(
        'id,business_name,description,city,country,target_amount_usd,interest_rate_ea,publication_end_date,photo_urls,created_at'
      )
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setStatus(`No se pudieron cargar tus proyectos: ${error.message}`);
      setLoadingProjects(false);
      return;
    }
    setMyProjects((data ?? []) as ProjectRow[]);
    setLoadingProjects(false);
  };

  useEffect(() => {
    if (rolSeleccionado === 'emprendedor') {
      loadMyProjects();
    }
  }, [rolSeleccionado, user?.id]);

  const onChangeForm = (key: keyof PublishForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onPickPhotos = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).slice(0, 10);
    if (selected.length > 10) {
      setStatus('Maximo 10 fotos.');
      return;
    }
    const urls = await Promise.all(selected.map(fileToDataUrl));
    setProjectPhotos(urls);
  };

  const onPickVideo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    setProjectVideo(url);
  };

  const improveWithAI = async () => {
    if (!form.description.trim()) {
      setStatus('Primero escribe una descripcion.');
      return;
    }
    setImprovingAI(true);
    setStatus('');
    try {
      const response = await fetch('/api/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: form.description }),
      });
      const payload = (await response.json()) as { improvedText?: string; error?: string };
      if (!response.ok || !payload.improvedText) {
        throw new Error(payload.error ?? 'No se pudo mejorar la descripcion.');
      }
      onChangeForm('description', payload.improvedText.slice(0, 2500));
    } catch (error: any) {
      setStatus(`IA no disponible: ${error?.message ?? error}`);
    } finally {
      setImprovingAI(false);
    }
  };

  const publishProject = async () => {
    if (!user?.id) return;
    const required: Array<[string, string]> = [
      ['businessName', form.businessName],
      ['legalRepresentative', form.legalRepresentative],
      ['openingDate', form.openingDate],
      ['address', form.address],
      ['phone', form.phone],
      ['city', form.city],
      ['country', form.country],
      ['description', form.description],
      ['targetAmountUsd', form.targetAmountUsd],
      ['publicationEndDate', form.publicationEndDate],
      ['interestRateEa', form.interestRateEa],
    ];
    const missing = required.find((entry) => !entry[1].trim());
    if (missing) {
      setStatus('Completa todos los campos obligatorios.');
      return;
    }
    if (form.description.length > 2500) {
      setStatus('Descripcion maxima: 2500 caracteres.');
      return;
    }
    if (projectPhotos.length > 10) {
      setStatus('Solo puedes subir hasta 10 fotos.');
      return;
    }

    const selectedCountry = COUNTRY_OPTIONS.find((option) => option.code === form.country);
    setSavingProject(true);
    setStatus('');
    const basePayload = {
      owner_id: user.id,
      owner_user_id: user.id,
      owner_wallet: smartWalletAddress ?? null,
      business_name: form.businessName,
      legal_representative: form.legalRepresentative,
      nit: form.nit || null,
      opening_date: form.openingDate,
      address: form.address,
      phone: form.phone,
      city: form.city,
      country: selectedCountry?.name ?? form.country,
      description: form.description,
      target_amount_usd: Number(form.targetAmountUsd),
      publication_end_date: form.publicationEndDate,
      interest_rate_ea: Number(form.interestRateEa),
      photo_urls: projectPhotos,
      video_url: projectVideo || null,
    };

    let insertError: { message?: string } | null = null;
    const firstTry = await supabase.from('projects').insert({
      ...basePayload,
      status: 'published',
    });
    insertError = firstTry.error;

    if (insertError?.message?.includes('invalid input value for enum project_status')) {
      const secondTry = await supabase.from('projects').insert({
        ...basePayload,
        status: 'active',
      });
      insertError = secondTry.error;
    }

    if (insertError?.message?.includes('invalid input value for enum project_status')) {
      const thirdTry = await supabase.from('projects').insert(basePayload);
      insertError = thirdTry.error;
    }

    if (insertError) {
      setStatus(`No se pudo publicar: ${insertError.message}`);
      setSavingProject(false);
      return;
    }

    setStatus('Proyecto publicado y visible en el feed.');
    setSavingProject(false);
    setShowPublisher(false);
    setForm((prev) => ({ ...emptyForm, country: prev.country }));
    setProjectPhotos([]);
    setProjectVideo('');
    await loadMyProjects();
  };

  if (rolSeleccionado !== 'emprendedor') {
    return (
      <PageFrame title="Mis inversiones" subtitle="Resumen de tus operaciones">
        <div className="space-y-3">
          {historial.length === 0 ? (
            <InvestmentCard title="Sin movimientos" detail="Las operaciones apareceran aqui." />
          ) : (
            historial.map((item, index) => (
              <InvestmentCard key={`${item}-${index}`} title={`Operacion ${index + 1}`} detail={item} />
            ))
          )}
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame title="Portafolio emprendedor" subtitle="Publica tu emprendimiento o solicitud de credito">
      <section className="rounded-3xl border border-white/35 bg-white/90 p-4 shadow-xl shadow-violet-800/10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Publicar proyecto</h2>
          <button
            onClick={() => setShowPublisher((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-xl font-bold text-white"
            aria-label="Abrir formulario de proyecto"
          >
            +
          </button>
        </div>

        {showPublisher ? (
          <div className="mt-4 space-y-3">
            <Input
              value={form.businessName}
              onChange={(value) => onChangeForm('businessName', value)}
              placeholder="Nombre del negocio"
            />
            <Input
              value={form.legalRepresentative}
              onChange={(value) => onChangeForm('legalRepresentative', value)}
              placeholder="Representante legal"
            />
            <Input value={form.nit} onChange={(value) => onChangeForm('nit', value)} placeholder="NIT (opcional)" />
            <Input
              value={form.openingDate}
              onChange={(value) => onChangeForm('openingDate', value)}
              type="date"
              placeholder="Fecha de apertura"
            />
            <Input value={form.address} onChange={(value) => onChangeForm('address', value)} placeholder="Direccion" />
            <Input value={form.phone} onChange={(value) => onChangeForm('phone', value)} placeholder="Telefono" />
            <Input value={form.city} onChange={(value) => onChangeForm('city', value)} placeholder="Ciudad" />
            <select
              value={form.country}
              onChange={(event) => onChangeForm('country', event.target.value)}
              className="w-full rounded-2xl border border-white/45 bg-white p-3 text-sm text-slate-900 outline-none"
            >
              <option value="">Pais</option>
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>

            <div className="rounded-2xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700">Fotos del negocio (maximo 10)</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => onPickPhotos(event.target.files)}
                className="mt-2 w-full text-xs"
              />
              {projectPhotos.length ? (
                <p className="mt-2 text-xs text-slate-500">{projectPhotos.length} foto(s) cargadas.</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700">Video del negocio (1 archivo)</p>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => onPickVideo(event.target.files)}
                className="mt-2 w-full text-xs"
              />
              {projectVideo ? <p className="mt-2 text-xs text-slate-500">Video cargado.</p> : null}
            </div>

            <div className="rounded-2xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Descripcion (max 2500)</p>
                <button
                  onClick={improveWithAI}
                  disabled={improvingAI}
                  className="rounded-full border border-violet-200 px-3 py-1 text-xs font-semibold text-violet-700 disabled:opacity-60"
                >
                  {improvingAI ? 'Mejorando...' : 'Mejorar con IA'}
                </button>
              </div>
              <textarea
                value={form.description}
                onChange={(event) => onChangeForm('description', event.target.value.slice(0, 2500))}
                className="h-36 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 outline-none"
              />
              <p className="mt-1 text-right text-xs text-slate-500">{form.description.length}/2500</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                value={form.publicationEndDate}
                onChange={(value) => onChangeForm('publicationEndDate', value)}
                type="date"
                placeholder="Fecha maxima"
              />
              <Input
                value={form.targetAmountUsd}
                onChange={(value) => onChangeForm('targetAmountUsd', value)}
                type="number"
                placeholder="Valor a recaudar (USD)"
              />
              <Input
                value={form.interestRateEa}
                onChange={(value) => onChangeForm('interestRateEa', value)}
                type="number"
                placeholder="Tasa interes E.A %"
              />
            </div>

            <div className="pt-2 text-center">
              <Button className="mx-auto max-w-xs" onClick={publishProject} disabled={savingProject}>
                {savingProject ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-4 space-y-3">
        <h2 className="px-1 text-sm font-semibold text-white">Mis proyectos publicados</h2>
        {loadingProjects ? <p className="px-1 text-sm text-white/85">Cargando proyectos...</p> : null}
        {!loadingProjects && myProjects.length === 0 ? (
          <div className="rounded-3xl border border-white/35 bg-white/90 p-4 text-sm text-slate-600 shadow-xl shadow-violet-800/10">
            Aun no has publicado proyectos.
          </div>
        ) : null}
        {myProjects.map((project) => (
          <ProjectCard
            key={project.id}
            title={project.business_name}
            description={project.description}
            city={project.city}
            country={project.country}
            targetAmountUsd={project.target_amount_usd}
            interestRateEa={project.interest_rate_ea}
            publicationEndDate={project.publication_end_date}
            coverImage={project.photo_urls?.[0] ?? null}
          />
        ))}
      </section>

      {status ? <p className="mt-4 text-center text-xs text-white/85">{status}</p> : null}
    </PageFrame>
  );
}
