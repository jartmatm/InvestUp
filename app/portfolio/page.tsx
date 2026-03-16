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
  owner_user_id: string | null;
  owner_id: string | null;
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

const REGION_NAMES = new Intl.DisplayNames(['es', 'en'], { type: 'region' });
const COUNTRY_OPTIONS = getCountries()
  .map((code) => ({ code, name: REGION_NAMES.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));

const SECTOR_OPTIONS = [
  'Administracion',
  'Comercio',
  'Finanzas',
  'Tecnologia',
  'Manufactura',
  'Agroindustria',
  'Salud',
  'Educacion',
  'Turismo',
  'Logistica',
  'Construccion',
  'Servicios profesionales',
];

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
    reader.onerror = () => reject(new Error('No se pudo leer archivo.'));
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
    return CITY_OPTIONS_BY_COUNTRY[form.country] ?? ['Otra ciudad'];
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

  const loadMyProjects = async () => {
    if (!user?.id) return;
    setLoadingProjects(true);
    const { data, error } = await supabase
      .from('projects')
      .select(
        'id,owner_user_id,owner_id,title,business_name,sector,legal_representative,nit,opening_date,address,phone,city,country,description,amount_requested,currency,term_months,interest_rate,publication_end_date,photo_urls,video_url,created_at'
      )
      .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
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
      sector: project.sector ?? '',
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

  const deletePublication = async (projectId: string) => {
    if (!user?.id) return;
    const confirmed = window.confirm('Quieres eliminar esta publicacion?');
    if (!confirmed) return;
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`);

    if (error) {
      setStatus(`No se pudo eliminar: ${error.message}`);
      return;
    }
    setStatus('Publicacion eliminada.');
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
    const termMonths = calculateTermMonths(form.publicationEndDate);
    if (termMonths <= 0) {
      setStatus('La fecha maxima de publicacion debe ser mayor a hoy.');
      return;
    }

    setSavingProject(true);
    setStatus('');

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
      amount_received: 0,
      currency: form.currency,
      term_months: termMonths,
      publication_end_date: form.publicationEndDate,
      interest_rate: Number(form.interestRateEa),
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
      setStatus(`No se pudo publicar: ${opError.message}`);
      setSavingProject(false);
      return;
    }

    setStatus(editingProjectId ? 'Publicacion actualizada.' : 'Proyecto publicado y visible en el feed.');
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
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Publicar proyecto</h2>
          <button
            onClick={startNewPublication}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-sm transition hover:bg-primary-light"
            aria-label="Abrir formulario de proyecto"
          >
            +
          </button>
        </div>

        {showPublisher ? (
          <div className="mt-4 space-y-3">
            <Input
              value={form.title}
              onChange={(value) => onChangeForm('title', value)}
              placeholder="Titulo de la publicacion"
            />
            <Input
              value={form.businessName}
              onChange={(value) => onChangeForm('businessName', value)}
              placeholder="Nombre del negocio"
            />
            <select
              value={form.sector}
              onChange={(event) => onChangeForm('sector', event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Sector economico</option>
              {SECTOR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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

            <select
              value={form.country}
              onChange={(event) => {
                const code = event.target.value;
                setForm((prev) => ({ ...prev, country: code, city: '' }));
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Pais</option>
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
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            >
              <option value="">{form.country ? 'Ciudad' : 'Selecciona pais primero'}</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
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
                  className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
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
                placeholder="Fecha maxima de publicacion"
              />
              <Input
                value={form.amountRequested}
                onChange={(value) => onChangeForm('amountRequested', value)}
                type="number"
                placeholder="Monto solicitado"
              />
              <select
                value={form.currency}
                onChange={(event) => onChangeForm('currency', event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/30"
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
                placeholder="Tasa de interes E.A %"
              />
            </div>

            <div className="pt-2 text-center">
              <Button className="mx-auto max-w-xs bg-primary text-white" onClick={publishProject} disabled={savingProject}>
                {savingProject
                  ? editingProjectId
                    ? 'Guardando...'
                    : 'Publicando...'
                  : editingProjectId
                    ? 'Guardar cambios'
                    : 'Publicar'}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-4 space-y-3">
        <h2 className="px-1 text-sm font-semibold text-gray-900">Mis proyectos publicados</h2>
        {loadingProjects ? <p className="px-1 text-sm text-gray-500">Cargando proyectos...</p> : null}
        {!loadingProjects && myProjects.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
            Aun no has publicado proyectos.
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
              currency={project.currency}
              termMonths={project.term_months}
              interestRate={project.interest_rate}
              publicationEndDate={project.publication_end_date}
              coverImage={project.photo_urls?.[0] ?? null}
            />
            <div className="flex gap-2">
              <button
                onClick={() => startEditPublication(project)}
                className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-gray-100"
              >
                Editar
              </button>
              <button
                onClick={() => deletePublication(project.id)}
                className="flex-1 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </section>

      {status ? <p className="mt-4 text-center text-xs text-gray-500">{status}</p> : null}
    </PageFrame>
  );
}


