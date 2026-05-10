'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { getCountries } from 'libphonenumber-js';
import BottomNav from '@/components/BottomNav';
import { DesktopAppShell, DesktopSectionCard } from '@/components/DesktopAppShell';
import { DesktopSidebarIcon } from '@/components/DesktopSidebarIcon';
import DesktopUpgradeCard from '@/components/DesktopUpgradeCard';
import DesktopUserMenu from '@/components/DesktopUserMenu';
import { SectionLoadingSkeleton } from '@/components/AppLoadingSkeleton';
import Input from '@/components/Input';
import EntrepreneurFeedDashboard from '@/components/EntrepreneurFeedDashboard';
import InvestorPortfolioDashboard from '@/components/InvestorPortfolioDashboard';
import { useInvestApp } from '@/lib/investapp-context';
import {
  canDeleteProject,
  canPauseProject,
  getProjectStatusLabel,
  getProjectStatusTone,
  type ProjectStatus,
} from '@/lib/project-status';
import { SECTOR_OPTIONS_ENGLISH, toEnglishSector } from '@/lib/sector-labels';
import { getMinimumInvestmentValue } from '@/lib/supabase-minimum-investment';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';
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

const surfaceClassName =
  'rounded-[30px] border border-white/85 bg-white/88 p-4 shadow-[0_24px_70px_rgba(31,38,64,0.10)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl';

const fieldClassName =
  'w-full rounded-[22px] border border-[#E7ECF4] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-3.5 text-[0.95rem] font-medium tracking-[-0.025em] text-[#162033] outline-none shadow-[0_16px_32px_rgba(31,38,64,0.05)] transition placeholder:text-[#9BA5B9] focus:border-[#D7C8FF] focus:ring-4 focus:ring-[#6B39F4]/10 disabled:opacity-60';

const inputClassName =
  '!rounded-[22px] !border-[#E7ECF4] !bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] !px-4 !py-3.5 !text-[0.95rem] !font-medium !tracking-[-0.025em] !text-[#162033] !shadow-[0_16px_32px_rgba(31,38,64,0.05)] placeholder:!text-[#9BA5B9] focus:!border-[#D7C8FF] focus:!ring-4 focus:!ring-[#6B39F4]/10';

function SectionSurface({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`${surfaceClassName} ${className}`}>{children}</section>;
}

function StatusBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function IconEdit() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </svg>
  );
}

function IconDelete() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12h10l1-12" />
      <path d="M9 7V4.5h6V7" />
    </svg>
  );
}

function DesktopSearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16.7 16.7A7.5 7.5 0 1 0 5.3 5.3a7.5 7.5 0 0 0 11.4 11.4Z" />
      <path d="M16.7 16.7 21 21" />
    </svg>
  );
}

function DesktopBellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4a5 5 0 0 0-5 5v3c0 .9-.3 1.8-.9 2.5L5 16h14l-1.1-1.5A4 4 0 0 1 17 12V9a5 5 0 0 0-5-5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

function DesktopInvestAppLogo() {
  return (
    <div className="flex items-center gap-0.5 text-[1.55rem] font-semibold tracking-[-0.07em] text-[#111827]">
      <span>Invest</span>
      <span className="text-[#6B39F4]">App</span>
      <span className="ml-0.5 mt-0.5 h-2.5 w-2.5 rounded-full bg-[#6B39F4]" />
    </div>
  );
}

function DesktopEntrepreneurSidebar() {
  const mainItems = [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/portfolio', label: 'Portfolio', icon: 'portfolio', active: true },
    { href: '/invest', label: 'Send', icon: 'send' },
    { href: '/feed', label: 'Feed', icon: 'feed' },
    { href: '/profile', label: 'Profile', icon: 'profile' },
  ];
  const utilityItems = [
    { href: '/home?topup=1', label: 'Top up', icon: 'topup' },
    { href: '/withdraw', label: 'Withdraw', icon: 'withdraw' },
    { href: '/contracts', label: 'Documents', icon: 'documents' },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-[#E7EAF3] bg-white/95 px-5 py-7 shadow-[12px_0_50px_rgba(21,28,44,0.04)] backdrop-blur-xl">
      <DesktopInvestAppLogo />

      <nav className="mt-10 space-y-1.5">
        {mainItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex h-12 items-center gap-3 rounded-2xl px-3.5 text-sm font-bold transition duration-200 ${
              item.active
                ? 'bg-[#F1ECFF] text-[#6B39F4]'
                : 'text-[#59657D] hover:bg-[#F7F8FB] hover:text-[#172033]'
            }`}
          >
            <DesktopSidebarIcon type={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-7 border-t border-[#EEF1F7] pt-6">
        <p className="px-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#8C96AA]">
          Entrepreneur
        </p>
        <div className="mt-3 space-y-1.5">
          {utilityItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-bold text-[#59657D] transition duration-200 hover:bg-[#F7F8FB] hover:text-[#172033]"
            >
              <DesktopSidebarIcon type={item.icon} />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <DesktopUpgradeCard />
    </aside>
  );
}

function DesktopEntrepreneurTopbar({
  avatarUrl,
  displayName,
  loadingProfileSummary,
  onNotifications,
}: {
  avatarUrl: string;
  displayName: string;
  loadingProfileSummary: boolean;
  onNotifications: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[88px] items-center gap-8 border-b border-[#E7EAF3] bg-white/86 px-8 backdrop-blur-xl">
      <label className="relative block w-full max-w-[760px]">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8F9AB0]">
          <DesktopSearchIcon />
        </span>
        <input
          placeholder="Search funding, investors or project activity..."
          className="h-14 w-full rounded-2xl border border-[#DDE2EE] bg-white pl-12 pr-4 text-sm font-semibold text-[#182033] outline-none shadow-[0_12px_28px_rgba(21,28,44,0.04)] transition placeholder:text-[#8F9AB0] focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10"
        />
      </label>

      <div className="ml-auto flex min-w-[360px] items-center justify-end gap-5">
        <button
          type="button"
          aria-label="Notifications"
          onClick={onNotifications}
          className="relative grid h-11 w-11 place-items-center rounded-2xl border border-[#E7EAF3] bg-white text-[#1F2A44] shadow-[0_12px_28px_rgba(21,28,44,0.05)] transition duration-200 hover:-translate-y-0.5 hover:text-[#6B39F4]"
        >
          <DesktopBellIcon />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#6B39F4]" />
        </button>

        <div className="h-9 w-px bg-[#E7EAF3]" />

        <DesktopUserMenu
          avatarUrl={avatarUrl}
          displayName={displayName}
          loading={loadingProfileSummary}
          roleLabel="Entrepreneur"
        />
      </div>
    </header>
  );
}

function DesktopEntrepreneurDashboardShell({
  avatarUrl,
  displayName,
  loadingProfileSummary,
  onNotifications,
}: {
  avatarUrl: string;
  displayName: string;
  loadingProfileSummary: boolean;
  onNotifications: () => void;
}) {
  return (
    <div className="investapp-desktop-autofit hidden min-h-screen bg-[#F8F9FB] text-[#101828] lg:block">
      <DesktopEntrepreneurSidebar />
      <div className="min-w-0 pl-[260px]">
        <DesktopEntrepreneurTopbar
          avatarUrl={avatarUrl}
          displayName={displayName}
          loadingProfileSummary={loadingProfileSummary}
          onNotifications={onNotifications}
        />
        <main className="px-8 py-8 xl:px-10">
          <div className="mx-auto max-w-[1500px]">
            <EntrepreneurFeedDashboard embedded desktop />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado, smartWalletAddress } = useInvestApp();
  const { avatarUrl, displayName: profileName, loading: loadingProfileSummary } = useUserProfileSummary();
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
  const newProjectFromUrl = searchParams.get('new') === '1';

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
    if (selected.length > 12) {
      setStatus('Maximum 12 photos.');
      return;
    }
    const urls = await Promise.all(selected.slice(0, 12).map(fileToDataUrl));
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

  useEffect(() => {
    if (!newProjectFromUrl || loadingProjects) return;
    if (autoOpenedEditId.current === 'new') return;
    startNewPublication();
    autoOpenedEditId.current = 'new';
  }, [loadingProjects, newProjectFromUrl, startNewPublication]);

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
    if (projectPhotos.length > 12) {
      setStatus('You can upload up to 12 photos only.');
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

  if (faseApp === 'loading' || !rolSeleccionado) {
    return (
      <>
        <DesktopAppShell
          title="Portfolio"
          subtitle="Preparing the right portfolio workspace for your profile."
          eyebrow="Loading"
          maxWidthClassName="max-w-[980px]"
          hideHeader
        >
          <DesktopSectionCard>
            <SectionLoadingSkeleton rows={4} />
          </DesktopSectionCard>
        </DesktopAppShell>
        <main className="relative min-h-screen bg-[linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_100%)] px-4 pb-32 pt-8 text-[#101828] lg:hidden">
          <div className="mx-auto w-full max-w-md">
            <SectionLoadingSkeleton rows={4} />
          </div>
        </main>
      </>
    );
  }

  if (rolSeleccionado === 'inversor') {
    return <InvestorPortfolioDashboard />;
  }

  const desktopDisplayName = profileName || 'Entrepreneur';

  return (
    <>
      <DesktopEntrepreneurDashboardShell
        avatarUrl={avatarUrl}
        displayName={desktopDisplayName}
        loadingProfileSummary={loadingProfileSummary}
        onNotifications={() => router.push('/notifications')}
      />

      <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.14),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-36 text-[#101828] lg:hidden">
        <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 top-56 h-64 w-64 rounded-full bg-[#B9A8FF]/16 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-[32rem] h-64 w-64 rounded-full bg-[#7DE0B8]/8 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8 pt-8">
          <header className="flex flex-col gap-2">
            <div>
              <h1 className="text-[2rem] font-semibold tracking-[-0.065em] text-[#1C2336]">
                Entrepreneur portfolio
              </h1>
              <p className="mt-1 text-sm leading-6 text-[#7B879C]">
                Publish your venture or credit request
              </p>
            </div>
          </header>

          {showPublisher ? (
            <SectionSurface>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                    {editingProjectId ? 'Current publication' : 'New publication'}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
                    {editingProjectId ? 'Edit your venture details' : 'Publish a new venture'}
                  </h2>
                </div>

                <Input
                  value={form.title}
                  onChange={(value) => onChangeForm('title', value)}
                  placeholder="Listing title"
                  className={inputClassName}
                />
                <Input
                  value={form.businessName}
                  onChange={(value) => onChangeForm('businessName', value)}
                  placeholder="Business name"
                  className={inputClassName}
                />
                <select
                  value={form.sector}
                  onChange={(event) => onChangeForm('sector', event.target.value)}
                  className={fieldClassName}
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
                  className={inputClassName}
                />
                <Input
                  value={form.nit}
                  onChange={(value) => onChangeForm('nit', value)}
                  placeholder="Tax ID (optional)"
                  className={inputClassName}
                />
                <Input
                  value={form.openingDate}
                  onChange={(value) => onChangeForm('openingDate', value)}
                  type="date"
                  placeholder="Opening date"
                  className={inputClassName}
                />
                <Input
                  value={form.address}
                  onChange={(value) => onChangeForm('address', value)}
                  placeholder="Address"
                  className={inputClassName}
                />
                <Input
                  value={form.phone}
                  onChange={(value) => onChangeForm('phone', value)}
                  placeholder="Phone"
                  className={inputClassName}
                />

                <select
                  value={form.country}
                  onChange={(event) => {
                    const code = event.target.value;
                    setForm((prev) => ({ ...prev, country: code, city: '' }));
                  }}
                  className={fieldClassName}
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
                  className={fieldClassName}
                >
                  <option value="">{form.country ? 'City' : 'Select a country first'}</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>

                <div className="rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 shadow-[0_14px_28px_rgba(31,38,64,0.05)]">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                    Business photos
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1C2336]">Upload up to 12 images</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => onPickPhotos(event.target.files)}
                    className="mt-3 w-full text-xs text-[#7B879C]"
                  />
                  {projectPhotos.length ? (
                    <p className="mt-2 text-xs text-[#7B879C]">{projectPhotos.length} photo(s) uploaded.</p>
                  ) : null}
                </div>

                <div className="rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 shadow-[0_14px_28px_rgba(31,38,64,0.05)]">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                    Business video
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1C2336]">Upload 1 video file</p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(event) => onPickVideo(event.target.files)}
                    className="mt-3 w-full text-xs text-[#7B879C]"
                  />
                  {projectVideo ? <p className="mt-2 text-xs text-[#7B879C]">Video uploaded.</p> : null}
                </div>

                <div className="rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 shadow-[0_14px_28px_rgba(31,38,64,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                        Description
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#1C2336]">Maximum 2500 characters</p>
                    </div>
                    <button
                      type="button"
                      onClick={improveWithAI}
                      disabled={improvingAI}
                      className="rounded-full border border-[#D7C8FF] bg-[#F6F1FF] px-3 py-1.5 text-xs font-semibold text-[#6B39F4] transition hover:bg-[#F1E8FF] disabled:opacity-60"
                    >
                      {improvingAI ? 'Improving...' : 'Improve with AI'}
                    </button>
                  </div>
                  <textarea
                    value={form.description}
                    onChange={(event) => onChangeForm('description', event.target.value.slice(0, 2500))}
                    className="mt-3 h-36 w-full rounded-[22px] border border-[#E7ECF4] bg-white px-4 py-3 text-sm text-[#162033] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition placeholder:text-[#9BA5B9] focus:border-[#D7C8FF] focus:ring-4 focus:ring-[#6B39F4]/10"
                  />
                  <p className="mt-2 text-right text-xs text-[#7B879C]">{form.description.length}/2500</p>
                </div>

                <div className="rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 text-xs leading-6 text-[#7B879C] shadow-[0_14px_28px_rgba(31,38,64,0.05)]">
                  Publication starts automatically on the day you save it and remains active until the end date below.
                </div>

                <Input
                  value={form.publicationEndDate}
                  onChange={(value) => onChangeForm('publicationEndDate', value)}
                  type="date"
                  placeholder="Publication end date"
                  className={inputClassName}
                />
                <Input
                  value={form.amountRequested}
                  onChange={(value) => onChangeForm('amountRequested', value)}
                  type="number"
                  placeholder="Requested amount"
                  className={inputClassName}
                />
                <Input
                  value={form.minimumInvestment}
                  onChange={(value) => onChangeForm('minimumInvestment', value)}
                  type="number"
                  placeholder="Minimum investment"
                  className={inputClassName}
                />
                <Input
                  value={form.installmentCount}
                  onChange={(value) => onChangeForm('installmentCount', value)}
                  type="number"
                  placeholder="Installments / payment term"
                  className={inputClassName}
                />
                <select
                  value={form.currency}
                  onChange={(event) => onChangeForm('currency', event.target.value)}
                  className={fieldClassName}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="COP">COP</option>
                  <option value="ARS">ARS</option>
                  <option value="MXN">MXN</option>
                </select>
                <Input
                  value={form.interestRateEa}
                  onChange={(value) => onChangeForm('interestRateEa', value)}
                  type="number"
                  placeholder="Effective annual interest rate %"
                  className={inputClassName}
                />

                <button
                  type="button"
                  onClick={publishProject}
                  disabled={savingProject}
                  className="mt-1 flex min-h-[52px] w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] px-5 text-sm font-semibold text-white shadow-[0_20px_38px_rgba(107,57,244,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProject
                    ? editingProjectId
                      ? 'Saving...'
                      : 'Publishing...'
                    : editingProjectId
                      ? 'Save changes'
                      : 'Publish'}
                </button>
              </div>
            </SectionSurface>
          ) : null}

          <section className="flex flex-col gap-3">
            <div className="px-1">
              <h2 className="text-sm font-semibold tracking-[-0.02em] text-[#1C2336]">
                My business
              </h2>
            </div>

            {loadingProjects ? (
              <SectionLoadingSkeleton rows={2} />
            ) : null}

            {!loadingProjects && myProjects.length === 0 ? (
              <SectionSurface className="text-sm text-[#667085]">
                You have not published any projects yet.
              </SectionSurface>
            ) : null}

            {myProjects.map((project) => {
              const projectStatusLabel = getProjectStatusLabel(project);

              return (
                <SectionSurface key={project.id} className="overflow-hidden">
                  <div className="relative overflow-hidden rounded-[24px] border border-[#E9EAF5] bg-[#0F172A] shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                    <div className="relative h-32 w-full overflow-hidden">
                      {project.photo_urls?.[0] ? (
                        <div
                          role="img"
                          aria-label={project.title}
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url("${project.photo_urls[0]}")` }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#3B2F93_0%,#201942_100%)] text-white">
                          <span className="text-lg font-semibold tracking-[0.08em]">
                            {project.title.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.12)_42%,rgba(15,23,42,0.64)_100%)]" />
                      <div className="absolute left-3 top-3">
                        <StatusBadge className={getProjectStatusTone(project)}>
                          {projectStatusLabel}
                        </StatusBadge>
                      </div>
                    </div>

                    <div className="relative px-4 pb-4 pt-3 text-white">
                      <h3 className="text-[1.05rem] font-semibold tracking-[-0.03em]">
                        {project.title}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => startEditPublication(project)}
                      className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] px-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:-translate-y-0.5"
                    >
                      <IconEdit />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePausePublication(project)}
                      disabled={!canPauseProject(project) && project.status !== 'paused'}
                      className={`flex min-h-[46px] items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition ${
                        !canPauseProject(project) && project.status !== 'paused'
                          ? 'border-[#E1E5F0] bg-[#F4F5F8] text-[#A0A7B9]'
                          : 'border-[#DDD3FF] bg-white text-[#6B39F4] shadow-[0_14px_28px_rgba(31,38,64,0.06)] hover:-translate-y-0.5 hover:bg-[#FBFAFF]'
                      }`}
                    >
                      <IconPause />
                      {project.status === 'paused' ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePublication(project)}
                      disabled={!canDeleteProject(project)}
                      className={`flex min-h-[46px] items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition ${
                        canDeleteProject(project)
                          ? 'border-[#F5CDD3] bg-[#FFF6F7] text-[#DF1C41] shadow-[0_14px_28px_rgba(31,38,64,0.05)] hover:-translate-y-0.5'
                          : 'border-[#E1E5F0] bg-[#F4F5F8] text-[#A0A7B9]'
                      }`}
                    >
                      <IconDelete />
                      Delete
                    </button>
                  </div>
                </SectionSurface>
              );
            })}
          </section>

          <EntrepreneurFeedDashboard embedded />

          {status ? (
            <SectionSurface className="text-xs leading-6 text-[#7B879C]">{status}</SectionSurface>
          ) : null}
        </div>
      </main>

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </>
  );
}
