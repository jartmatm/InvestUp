'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  canDeleteProject,
  canPauseProject,
  getNextProjectStatusAfterFunding,
  getProjectStatusLabel,
  getProjectStatusTone,
  type ProjectStatus,
} from '@/lib/project-status';
import { SECTOR_OPTIONS_ENGLISH, toEnglishSector } from '@/lib/sector-labels';

type ProjectRow = {
  id: string;
  owner_user_id: string | null;
  owner_id: string | null;
  status: ProjectStatus | string | null;
  title: string;
  business_name: string | null;
  sector: string | null;
  legal_representative: string | null;
  nit: string | null;
  opening_date: string | null;
  address: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  description: string;
  amount_requested: number | null;
  amount_received: number | null;
  currency: string | null;
  term_months: number | null;
  interest_rate: number | null;
  publication_end_date: string | null;
  photo_urls: string[] | null;
  video_url: string | null;
  created_at: string;
};

type PublishForm = {
  title: string;
  businessName: string;
  sector: string;
  legalRepresentative: string;
  nit: string;
  openingDate: string;
  address: string;
  phone: string;
  country: string;
  city: string;
  description: string;
  amountRequested: string;
  currency: string;
  publicationEndDate: string;
  interestRateEa: string;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });
const COUNTRY_OPTIONS = getCountries()
  .map((code) => ({ code, name: REGION_NAMES.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

const SECTOR_OPTIONS = [...SECTOR_OPTIONS_ENGLISH];

const CITY_OPTIONS_BY_COUNTRY: Record<string, string[]> = {
  AR: ['Buenos Aires', 'Cordoba', 'Rosario', 'Mendoza', 'La Plata'],
  BO: ['La Paz', 'Santa Cruz', 'Cochabamba', 'Sucre', 'Tarija'],
  BR: ['Sao Paulo', 'Rio de Janeiro', 'Brasilia', 'Belo Horizonte', 'Salvador'],
  CL: ['Santiago', 'Valparaiso', 'Concepcion', 'La Serena', 'Antofagasta'],
  CO: ['Bogota', 'Medellin', 'Cali', 'Barranquilla', 'Cartagena'],
  CR: ['San Jose', 'Alajuela', 'Cartago', 'Heredia', 'Puntarenas'],
  DO: ['Santo Domingo', 'Santiago', 'La Romana', 'San Pedro', 'Puerto Plata'],
  EC: ['Quito', 'Guayaquil', 'Cuenca', 'Manta', 'Ambato'],
  ES: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao'],
  GT: ['Ciudad de Guatemala', 'Quetzaltenango', 'Escuintla', 'Antigua', 'Coban'],
  HN: ['Tegucigalpa', 'San Pedro Sula', 'La Ceiba', 'Choloma', 'Comayagua'],
  MX: ['Ciudad de Mexico', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana'],
  PA: ['Ciudad de Panama', 'Colon', 'David', 'Santiago', 'Chitre'],
  PE: ['Lima', 'Arequipa', 'Trujillo', 'Cusco', 'Piura'],
  PY: ['Asuncion', 'Ciudad del Este', 'Encarnacion', 'Luque', 'San Lorenzo'],
  SV: ['San Salvador', 'Santa Ana', 'San Miguel', 'Soyapango', 'Mejicanos'],
  UY: ['Montevideo', 'Punta del Este', 'Salto', 'Paysandu', 'Maldonado'],
  US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'],
  VE: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay'],
};

const emptyForm: PublishForm = {
  title: '',
  businessName: '',
  sector: '',
  legalRepresentative: '',
  nit: '',
  openingDate: '',
  address: '',
  phone: '',
  country: '',
  city: '',
  description: '',
  amountRequested: '',
  currency: 'USD',
  publicationEndDate: '',
  interestRateEa: '',
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

const normalizeCountryCode = (rawCountry: string) => {
  const raw = rawCountry.trim();
  if (!raw) return '';
  const byCode = COUNTRY_OPTIONS.find((option) => option.code === raw.toUpperCase());
  if (byCode) return byCode.code;
  const byName = COUNTRY_OPTIONS.find((option) => option.name.toLowerCase() === raw.toLowerCase());
  return byName?.code ?? '';
};

const calculateTermMonths = (endDateIso: string) => {
  const start = new Date();
  const end = new Date(endDateIso);
  if (Number.isNaN(end.getTime())) return 0;
  const msDiff = end.getTime() - start.getTime();
  const daysDiff = Math.max(0, msDiff / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.ceil(daysDiff / 30));
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message ?? error);
  }
  return String(error);
};

export default function PortfolioPage() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, historial, rolSeleccionado, smartWalletAddress } = useInvestUp();
  const [showPublisher, setShowPublisher] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [form, setForm] = useState<PublishForm>(emptyForm);
  const [projectPhotos, setProjectPhotos] = useState<string[]>([]);
  const [projectVideo, setProjectVideo] = useState<string>('');
  const [myProjects, setMyProjects] = useState<ProjectRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [improvingAI, setImprovingAI] = useState(false);
  const [status, setStatus] = useState('');

  const cityOptions = useMemo(() => {
    if (!form.country) return [];
    return CITY_OPTIONS_BY_COUNTRY[form.country] ?? ['Other city'];
  }, [form.country]);

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
      const { data } = await supabase.from('users').select('country').eq('id', user.id).maybeSingle();
      const normalized = normalizeCountryCode((data?.country as string | null) ?? '');
      if (normalized) setForm((prev) => ({ ...prev, country: normalized }));
    };
    preloadCountry();
  }, [rolSeleccionado, supabase, user?.id]);

  const loadMyProjects = useCallback(async () => {
    if (!user?.id) return;
    setLoadingProjects(true);
    const { data, error } = await supabase
      .from('projects')
      .select(
        'id,owner_user_id,owner_id,status,title,business_name,sector,legal_representative,nit,opening_date,address,phone,city,country,description,amount_requested,amount_received,currency,term_months,interest_rate,publication_end_date,photo_urls,video_url,created_at'
      )
      .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      setStatus(`Could not load your projects: ${error.message}`);
      setLoadingProjects(false);
      return;
    }
    setMyProjects((data ?? []) as ProjectRow[]);
    setLoadingProjects(false);
  }, [supabase, user?.id]);

  useEffect(() => {
    if (rolSeleccionado === 'emprendedor') {
      loadMyProjects();
    }
  }, [loadMyProjects, rolSeleccionado]);

  const onChangeForm = (key: keyof PublishForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onPickPhotos = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.length > 10) {
      setStatus('Maximum 10 photos.');
      return;
    }
    const urls = await Promise.all(selected.slice(0, 10).map(fileToDataUrl));
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
      setStatus('Write a description first.');
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
        throw new Error(payload.error ?? 'Could not improve the description.');
      }
      onChangeForm('description', payload.improvedText.slice(0, 2500));
    } catch (error: unknown) {
      setStatus(`AI unavailable: ${getErrorMessage(error)}`);
    } finally {
      setImprovingAI(false);
    }
  };

  const startNewPublication = () => {
    setEditingProjectId(null);
    setForm((prev) => ({ ...emptyForm, country: prev.country }));
    setProjectPhotos([]);
    setProjectVideo('');
    setShowPublisher(true);
  };

  const startEditPublication = (project: ProjectRow) => {
    setEditingProjectId(project.id);
    const countryCode = normalizeCountryCode(project.country ?? '');
    setForm({
      title: project.title ?? '',
      businessName: project.business_name ?? '',
      sector: toEnglishSector(project.sector),
      legalRepresentative: project.legal_representative ?? '',
      nit: project.nit ?? '',
      openingDate: project.opening_date ?? '',
      address: project.address ?? '',
      phone: project.phone ?? '',
      country: countryCode,
      city: project.city ?? '',
      description: project.description ?? '',
      amountRequested: String(project.amount_requested ?? ''),
      currency: project.currency ?? 'USD',
      publicationEndDate: project.publication_end_date ?? '',
      interestRateEa: String(project.interest_rate ?? ''),
    });
    setProjectPhotos(project.photo_urls ?? []);
    setProjectVideo(project.video_url ?? '');
    setShowPublisher(true);
    setStatus('');
  };

  const deletePublication = async (project: ProjectRow) => {
    if (!user?.id) return;
    if (!canDeleteProject(project)) {
      setStatus('A listing with financing in progress cannot be deleted.');
      return;
    }
    const confirmed = window.confirm('Do you want to delete this listing?');
    if (!confirmed) return;
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id)
      .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`);

    if (error) {
      setStatus(`Could not delete the listing: ${error.message}`);
      return;
    }
    setStatus('Listing deleted.');
    await loadMyProjects();
  };

  const togglePausePublication = async (project: ProjectRow) => {
    if (!user?.id) return;

    if (!canPauseProject(project)) {
      setStatus('Listings with financing in progress cannot be paused.');
      return;
    }

    const nextStatus: ProjectStatus = project.status === 'paused' ? 'published' : 'paused';
    const { error } = await supabase
      .from('projects')
      .update({ status: nextStatus })
      .eq('id', project.id)
      .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`);

    if (error) {
      setStatus(`Could not update the listing: ${error.message}`);
      return;
    }

    setStatus(nextStatus === 'paused' ? 'Listing paused.' : 'Listing resumed.');
    await loadMyProjects();
  };

  const publishProject = async () => {
    if (!user?.id) return;
    const required: Array<[string, string]> = [
      ['title', form.title],
      ['businessName', form.businessName],
      ['sector', form.sector],
      ['legalRepresentative', form.legalRepresentative],
      ['openingDate', form.openingDate],
      ['address', form.address],
      ['phone', form.phone],
      ['country', form.country],
      ['city', form.city],
      ['description', form.description],
      ['amountRequested', form.amountRequested],
      ['currency', form.currency],
      ['publicationEndDate', form.publicationEndDate],
      ['interestRateEa', form.interestRateEa],
    ];
    const missing = required.find((entry) => !entry[1].trim());
    if (missing) {
      setStatus('Complete all required fields.');
      return;
    }
    if (form.description.length > 2500) {
      setStatus('Maximum description length: 2500 characters.');
      return;
    }
    if (projectPhotos.length > 10) {
      setStatus('You can upload up to 10 photos only.');
      return;
    }

    const selectedCountry = COUNTRY_OPTIONS.find((option) => option.code === form.country);
    const termMonths = calculateTermMonths(form.publicationEndDate);
    if (termMonths <= 0) {
      setStatus('The publication end date must be later than today.');
      return;
    }

    setSavingProject(true);
    setStatus('');

    const existingProject = editingProjectId
      ? myProjects.find((project) => project.id === editingProjectId) ?? null
      : null;
    const nextAmountReceived = existingProject?.amount_received ?? 0;
    const nextStatus = getNextProjectStatusAfterFunding(existingProject?.status, nextAmountReceived);

    const payload = {
      owner_id: user.id,
      owner_user_id: user.id,
      owner_wallet: smartWalletAddress ?? null,
      title: form.title,
      business_name: form.businessName,
      sector: form.sector,
      legal_representative: form.legalRepresentative,
      nit: form.nit || null,
      opening_date: form.openingDate,
      address: form.address,
      phone: form.phone,
      city: form.city,
      country: selectedCountry?.name ?? form.country,
      description: form.description,
      amount_requested: Number(form.amountRequested),
      amount_received: nextAmountReceived,
      currency: form.currency,
      term_months: termMonths,
      publication_end_date: form.publicationEndDate,
      interest_rate: Number(form.interestRateEa),
      status: nextStatus,
      photo_urls: projectPhotos,
      video_url: projectVideo || null,
      metadata: {
        submitted_from: 'portfolio_page',
      },
    };

    let opError: { message?: string } | null = null;
    if (editingProjectId) {
      const result = await supabase
        .from('projects')
        .update(payload)
        .eq('id', editingProjectId)
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`);
      opError = result.error;
    } else {
      const firstTry = await supabase.from('projects').insert({
        ...payload,
        status: 'published',
      });
      opError = firstTry.error;

      if (opError?.message?.includes('invalid input value for enum project_status')) {
        const secondTry = await supabase.from('projects').insert({
          ...payload,
          status: 'active',
        });
        opError = secondTry.error;
      }

      if (opError?.message?.includes('invalid input value for enum project_status')) {
        const thirdTry = await supabase.from('projects').insert(payload);
        opError = thirdTry.error;
      }
    }

    if (opError) {
      setStatus(`Could not publish the project: ${opError.message}`);
      setSavingProject(false);
      return;
    }

    setStatus(editingProjectId ? 'Listing updated.' : 'Project published and now visible in the feed.');
    setSavingProject(false);
    setShowPublisher(false);
    setEditingProjectId(null);
    setForm((prev) => ({ ...emptyForm, country: prev.country }));
    setProjectPhotos([]);
    setProjectVideo('');
    await loadMyProjects();
  };

  if (rolSeleccionado !== 'emprendedor') {
    return (
      <PageFrame title="My investments" subtitle="Summary of your activity">
        <div className="space-y-3">
          {historial.length === 0 ? (
            <InvestmentCard title="No activity yet" detail="Your activity will appear here." />
          ) : (
            historial.map((item, index) => (
              <InvestmentCard key={`${item}-${index}`} title={`Activity ${index + 1}`} detail={item} />
            ))
          )}
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame title="Entrepreneur portfolio" subtitle="Publish your venture or credit request">
      <section className="rounded-xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Publish project</h2>
          <button
            onClick={startNewPublication}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-sm transition hover:bg-primary-light"
            aria-label="Open project form"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M16 22H9C5.68629 22 3 19.3137 3 16V7M14.5 2.1319V7.5C14.5 8.60457 15.3954 9.5 16.5 9.5H20.9374M14.5 2.1319C14.2178 2.04533 13.9216 2 13.6202 2H9C7.34315 2 6 3.34315 6 5V16C6 17.6569 7.34315 19 9 19H18C19.6569 19 21 17.6569 21 16V10.1098C21 9.90356 20.9788 9.69931 20.9374 9.5M14.5 2.1319C15.0377 2.29685 15.5242 2.61154 15.898 3.04763L20.2778 8.1574C20.6096 8.54456 20.8351 9.00716 20.9374 9.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {showPublisher ? (
          <div className="mt-4 space-y-3">
            <Input
              value={form.title}
              onChange={(value) => onChangeForm('title', value)}
              placeholder="Listing title"
            />
            <Input
              value={form.businessName}
              onChange={(value) => onChangeForm('businessName', value)}
              placeholder="Business name"
            />
            <select
              value={form.sector}
              onChange={(event) => onChangeForm('sector', event.target.value)}
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Economic sector</option>
              {SECTOR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Input
              value={form.legalRepresentative}
              onChange={(value) => onChangeForm('legalRepresentative', value)}
              placeholder="Legal representative"
            />
            <Input value={form.nit} onChange={(value) => onChangeForm('nit', value)} placeholder="Tax ID (optional)" />
            <Input
              value={form.openingDate}
              onChange={(value) => onChangeForm('openingDate', value)}
              type="date"
              placeholder="Opening date"
            />
            <Input value={form.address} onChange={(value) => onChangeForm('address', value)} placeholder="Address" />
            <Input value={form.phone} onChange={(value) => onChangeForm('phone', value)} placeholder="Phone" />

            <select
              value={form.country}
              onChange={(event) => {
                const code = event.target.value;
                setForm((prev) => ({ ...prev, country: code, city: '' }));
              }}
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Country</option>
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
            <select
              value={form.city}
              onChange={(event) => onChangeForm('city', event.target.value)}
              disabled={!form.country}
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            >
              <option value="">{form.country ? 'City' : 'Select a country first'}</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <div className="rounded-2xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700">Business photos (up to 10)</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => onPickPhotos(event.target.files)}
                className="mt-2 w-full text-xs"
              />
              {projectPhotos.length ? (
                <p className="mt-2 text-xs text-slate-500">{projectPhotos.length} photo(s) uploaded.</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700">Business video (1 file)</p>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => onPickVideo(event.target.files)}
                className="mt-2 w-full text-xs"
              />
              {projectVideo ? <p className="mt-2 text-xs text-slate-500">Video uploaded.</p> : null}
            </div>

            <div className="rounded-2xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Description (max 2500)</p>
                <button
                  onClick={improveWithAI}
                  disabled={improvingAI}
                  className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
                >
                  {improvingAI ? 'Improving...' : 'Improve with AI'}
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
                placeholder="Publication end date"
              />
              <Input
                value={form.amountRequested}
                onChange={(value) => onChangeForm('amountRequested', value)}
                type="number"
                placeholder="Requested amount"
              />
              <select
                value={form.currency}
                onChange={(event) => onChangeForm('currency', event.target.value)}
                className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:ring-2 focus:ring-primary/20"
              >
                <option value="USD">USD</option>
                <option value="USDC">USDC</option>
                <option value="EUR">EUR</option>
                <option value="COP">COP</option>
                <option value="ARS">ARS</option>
                <option value="MXN">MXN</option>
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-1">
              <Input
                value={form.interestRateEa}
                onChange={(value) => onChangeForm('interestRateEa', value)}
                type="number"
                placeholder="Effective annual interest rate %"
              />
            </div>

            <div className="pt-2 text-center">
              <Button className="mx-auto max-w-xs bg-primary text-white" onClick={publishProject} disabled={savingProject}>
                {savingProject
                  ? editingProjectId
                    ? 'Saving...'
                    : 'Publishing...'
                  : editingProjectId
                    ? 'Save changes'
                    : 'Publish'}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-4 space-y-3">
        <h2 className="px-1 text-sm font-semibold text-gray-900">My published projects</h2>
        {loadingProjects ? <p className="px-1 text-sm text-gray-500">Loading projects...</p> : null}
        {!loadingProjects && myProjects.length === 0 ? (
          <div className="rounded-xl border border-white/25 bg-white/20 p-4 text-sm text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            You have not published any projects yet.
          </div>
        ) : null}
        {myProjects.map((project) => (
          <div key={project.id} className="space-y-2">
            <ProjectCard
              title={project.title}
              description={project.description}
              sector={project.sector}
              city={project.city}
              country={project.country}
              amountRequested={project.amount_requested}
              amountRaised={project.amount_received}
              currency={project.currency}
              termMonths={project.term_months}
              interestRate={project.interest_rate}
              publicationEndDate={project.publication_end_date}
              coverImage={project.photo_urls?.[0] ?? null}
            />
            <div className="flex items-center justify-between gap-3 px-1">
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getProjectStatusTone(project)}`}
              >
                {getProjectStatusLabel(project)}
              </span>
              {!canDeleteProject(project) ? (
                <span className="text-[11px] text-gray-500">
                  Deletion disabled because the listing has already received financing.
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => startEditPublication(project)}
                className="flex-1 rounded-full border border-white/25 bg-white/20 px-4 py-2 text-sm font-semibold text-primary shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md hover:bg-white/30"
              >
                Edit
              </button>
              <button
                onClick={() => togglePausePublication(project)}
                disabled={!canPauseProject(project) && project.status !== 'paused'}
                className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold ${
                  !canPauseProject(project) && project.status !== 'paused'
                    ? 'border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
              >
                {project.status === 'paused' ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={() => deletePublication(project)}
                disabled={!canDeleteProject(project)}
                className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold ${
                  canDeleteProject(project)
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-slate-100 text-slate-400'
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </section>

      {status ? <p className="mt-4 text-center text-xs text-gray-500">{status}</p> : null}
    </PageFrame>
  );
}




