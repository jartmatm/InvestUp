'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { getCountries } from 'libphonenumber-js';
import Button from '@/components/Button';
import Input from '@/components/Input';
import InvestorPortfolioDashboard from '@/components/InvestorPortfolioDashboard';
import PageFrame from '@/components/PageFrame';
import ProjectCard from '@/components/ProjectCard';
import { useInvestApp } from '@/lib/investapp-context';
import {
  canDeleteProject,
  canPauseProject,
  getNextProjectStatusAfterFunding,
  getProjectRepaymentTermMonths,
  getProjectStatusLabel,
  getProjectStatusTone,
  type ProjectStatus,
} from '@/lib/project-status';
import { SECTOR_OPTIONS_ENGLISH, toEnglishSector } from '@/lib/sector-labels';
import { getMinimumInvestmentValue } from '@/lib/supabase-minimum-investment';
import {
  createCurrentUserProject,
  deleteCurrentUserProject,
  fetchCurrentUserProject,
  fetchCurrentUserProjects,
  updateCurrentUserProject,
} from '@/utils/client/current-user-projects';
import { fetchCurrentUserProfile } from '@/utils/client/current-user-profile';

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
  minimum_investment: number | null;
  amount_received: number | null;
  currency: string | null;
  term_months: number | null;
  installment_count: number | null;
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
  minimumInvestment: string;
  currency: string;
  publicationEndDate: string;
  installmentCount: string;
  interestRateEa: string;
};

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
  minimumInvestment: '',
  currency: 'USD',
  publicationEndDate: '',
  installmentCount: '3',
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

const parsePublicationEndDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);
  }

  const fallback = new Date(value);
  if (Number.isNaN(fallback.getTime())) return null;
  return new Date(
    fallback.getFullYear(),
    fallback.getMonth(),
    fallback.getDate(),
    23,
    59,
    59,
    999
  );
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message ?? error);
  }
  return String(error);
};

function PublishProjectIcon() {
  return (
    <svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.6068 2.08431C14.2636 1.80223 15 2.28378 15 3.00755V9.95572C15 10.6795 14.2636 11.161 13.6068 10.879L11.2812 9.88023C10.2681 9.44512 9.1974 9.16592 8.10547 9.05011C7.72156 9.00939 7.33502 8.98886 6.94742 8.98886H5H4.5C3.12123 8.98886 2 7.86829 2 6.48163C2 5.09498 3.12123 3.9744 4.5 3.9744H6.94742C8.43741 3.9744 9.91183 3.67113 11.2812 3.08303L13.6068 2.08431ZM17 3.00755C17 0.853721 14.8002 -0.604842 12.8176 0.246613L10.492 1.24533C9.37187 1.72639 8.16597 1.9744 6.94742 1.9744H4.5C2.01277 1.9744 0 3.99431 0 6.48163C0 8.85129 1.82684 10.7967 4.15036 10.9755L4.18022 11.155L4.87428 15.328C5.03463 16.2921 5.86784 17.0013 6.84713 17.0013H7C8.10651 17.0013 9 16.103 9 14.9992V11.2266C9.50939 11.3462 10.0087 11.5104 10.492 11.7179L12.8176 12.7167C14.8002 13.5681 17 12.1095 17 9.95572V9.33055C18.1652 8.91872 19 7.80748 19 6.50126C19 5.19504 18.1652 4.0838 17 3.67197V3.00755ZM6.84718 14.9999L6.18006 10.9889H6.94742L7 10.989V10.9909V14.9992L6.99995 15.0006L6.99939 15.0013H6.84771C6.84757 15.0011 6.84747 15.001 6.8474 15.0009M6.84733 15.0008C6.84734 15.0009 6.84737 15.0009 6.8474 15.0009C6.84735 15.0007 6.84727 15.0004 6.84718 14.9999M9 5.50126C9 4.94898 8.55228 4.50126 8 4.50126C7.44772 4.50126 7 4.94898 7 5.50126V7.50126C7 8.05354 7.44772 8.50126 8 8.50126C8.55228 8.50126 9 8.05354 9 7.50126V5.50126Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function PortfolioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado, smartWalletAddress } = useInvestApp();
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
  const autoOpenedEditId = useRef<string | null>(null);
  const editProjectIdFromUrl = searchParams.get('edit');

  const cityOptions = useMemo(() => {
    if (!form.country) return [];
    return CITY_OPTIONS_BY_COUNTRY[form.country] ?? ['Other city'];
  }, [form.country]);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const preloadCountry = async () => {
      if (!user?.id || rolSeleccionado !== 'emprendedor') return;
      const { data } = await fetchCurrentUserProfile<{ country?: string | null } | null>(
        getAccessToken
      );
      const normalized = normalizeCountryCode((data?.country as string | null) ?? '');
      if (normalized) setForm((prev) => ({ ...prev, country: normalized }));
    };
    preloadCountry();
  }, [getAccessToken, rolSeleccionado, user?.id]);

  const loadMyProjects = useCallback(async () => {
    if (!user?.id) return;
    setLoadingProjects(true);
    const { data, error } = await fetchCurrentUserProjects(getAccessToken);

    if (error) {
      setStatus(`Could not load your projects: ${error}`);
      setLoadingProjects(false);
      return;
    }
    setMyProjects(
      ((data ?? []) as ProjectRow[]).map((project) => ({
        ...project,
        minimum_investment: getMinimumInvestmentValue(project),
      }))
    );
    setLoadingProjects(false);
  }, [getAccessToken, user?.id]);

  useEffect(() => {
    if (rolSeleccionado === 'emprendedor') {
      void loadMyProjects();
    }
  }, [loadMyProjects, rolSeleccionado]);

  const loadOwnedProjectState = useCallback(
    async (projectId: string) => {
      if (!user?.id) return null;

      const { data, error } = await fetchCurrentUserProject(getAccessToken, projectId);
      if (error) {
        throw new Error(error);
      }

      return data as Pick<ProjectRow, 'id' | 'status' | 'amount_received'> | null;
    },
    [getAccessToken, user?.id]
  );

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

  const startNewPublication = useCallback(() => {
    if (myProjects.length >= 1) {
      setStatus('You can only keep one business published at a time. Edit your current one to update it.');
      return;
    }
    setEditingProjectId(null);
    setForm((prev) => ({ ...emptyForm, country: prev.country }));
    setProjectPhotos([]);
    setProjectVideo('');
    setShowPublisher(true);
    setStatus('');
  }, [myProjects.length]);

  const startEditPublication = useCallback((project: ProjectRow) => {
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
      minimumInvestment: String(project.minimum_investment ?? ''),
      currency: project.currency ?? 'USD',
      publicationEndDate: project.publication_end_date ?? '',
      installmentCount: String(project.installment_count ?? project.term_months ?? 1),
      interestRateEa: String(project.interest_rate ?? ''),
    });
    setProjectPhotos(project.photo_urls ?? []);
    setProjectVideo(project.video_url ?? '');
    setShowPublisher(true);
    setStatus('');
  }, []);

  useEffect(() => {
    if (!editProjectIdFromUrl || myProjects.length === 0) return;
    const projectToEdit = myProjects.find((project) => project.id === editProjectIdFromUrl);
    if (!projectToEdit) return;
    if (autoOpenedEditId.current === editProjectIdFromUrl) return;

    startEditPublication(projectToEdit);
    autoOpenedEditId.current = editProjectIdFromUrl;

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editProjectIdFromUrl, myProjects, startEditPublication]);

  const deletePublication = async (project: ProjectRow) => {
    if (!user?.id) return;
    try {
      const latestProject = await loadOwnedProjectState(project.id);
      if (!latestProject || !canDeleteProject(latestProject)) {
        setStatus('A listing with financing in progress cannot be deleted.');
        await loadMyProjects();
        return;
      }

      const confirmed = window.confirm('Do you want to delete this listing?');
      if (!confirmed) return;
      const { error } = await deleteCurrentUserProject(getAccessToken, project.id);

      if (error) {
        setStatus(`Could not delete the listing: ${error}`);
        return;
      }
      setStatus('Listing deleted.');
      await loadMyProjects();
    } catch (error) {
      setStatus(`Could not verify the latest project state: ${getErrorMessage(error)}`);
    }
  };

  const togglePausePublication = async (project: ProjectRow) => {
    if (!user?.id) return;

    try {
      const latestProject = await loadOwnedProjectState(project.id);
      const effectiveProject = latestProject ?? project;
      if (!canPauseProject(effectiveProject) && effectiveProject.status !== 'paused') {
        setStatus('Listings with financing in progress cannot be paused.');
        await loadMyProjects();
        return;
      }

      const nextStatus: ProjectStatus =
        effectiveProject.status === 'paused' ? 'published' : 'paused';
      const { error } = await updateCurrentUserProject(getAccessToken, project.id, {
        status: nextStatus,
      });

      if (error) {
        setStatus(`Could not update the listing: ${error}`);
        return;
      }

      setStatus(nextStatus === 'paused' ? 'Listing paused.' : 'Listing resumed.');
      await loadMyProjects();
    } catch (error) {
      setStatus(`Could not verify the latest project state: ${getErrorMessage(error)}`);
    }
  };

  const publishProject = async () => {
    if (!user?.id) return;
    if (!editingProjectId && myProjects.length >= 1) {
      setStatus('You can only keep one business published at a time. Edit your current one to update it.');
      return;
    }
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
      ['minimumInvestment', form.minimumInvestment],
      ['currency', form.currency],
      ['publicationEndDate', form.publicationEndDate],
      ['installmentCount', form.installmentCount],
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
    const publicationEndDate = parsePublicationEndDate(form.publicationEndDate);
    const installmentCount = Math.max(1, Number(form.installmentCount));
    if (!publicationEndDate) {
      setStatus('Choose a valid publication end date.');
      return;
    }
    if (publicationEndDate.getTime() < Date.now()) {
      setStatus('The publication end date cannot be in the past.');
      return;
    }
    if (!Number.isFinite(installmentCount) || installmentCount <= 0) {
      setStatus('Installments must be greater than 0.');
      return;
    }

    setSavingProject(true);
    setStatus('');

    const payload = {
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
      minimum_investment: Number(form.minimumInvestment),
      currency: form.currency,
      installment_count: installmentCount,
      publication_end_date: form.publicationEndDate,
      interest_rate: Number(form.interestRateEa),
      photo_urls: projectPhotos,
      video_url: projectVideo || null,
      metadata: {
        submitted_from: 'portfolio_page',
        publication_end_date: form.publicationEndDate,
      },
    };
    const { error } = editingProjectId
      ? await updateCurrentUserProject(getAccessToken, editingProjectId, payload)
      : await createCurrentUserProject(getAccessToken, payload);

    if (error) {
      setStatus(`Could not publish the project: ${error}`);
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
    return <InvestorPortfolioDashboard />;
  }

  const canCreateNewProject = myProjects.length === 0;

  return (
    <PageFrame title="Entrepreneur portfolio" subtitle="Publish your venture or credit request">
      <section className="rounded-xl border border-white/25 bg-white/20 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Publish project</h2>
          <button
            onClick={startNewPublication}
            disabled={!canCreateNewProject}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm transition ${
              canCreateNewProject
                ? 'bg-primary hover:bg-primary-light'
                : 'cursor-not-allowed bg-slate-300'
            }`}
            aria-label="Open project form"
          >
            <PublishProjectIcon />
          </button>
        </div>
        {!canCreateNewProject && !showPublisher ? (
          <p className="mt-3 text-xs text-slate-500">
            Only one business can stay published per user. Use Edit to update the current publication.
          </p>
        ) : null}

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

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/25 bg-white/20 px-4 py-3 text-xs text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md md:col-span-4">
                Publication starts automatically on the day you save it and remains active until the
                end date below.
              </div>
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
              <Input
                value={form.minimumInvestment}
                onChange={(value) => onChangeForm('minimumInvestment', value)}
                type="number"
                placeholder="Minimum investment"
              />
              <Input
                value={form.installmentCount}
                onChange={(value) => onChangeForm('installmentCount', value)}
                type="number"
                placeholder="Installments / payment term"
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
              <Button
                className="mx-auto max-w-xs !rounded-full !bg-[#6B39F4] !text-white shadow-[0_18px_38px_rgba(107,57,244,0.24)] hover:!bg-[#5B31CF]"
                onClick={publishProject}
                disabled={savingProject}
              >
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
              termMonths={getProjectRepaymentTermMonths(project)}
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
