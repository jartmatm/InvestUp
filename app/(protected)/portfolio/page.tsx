'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { getCountries } from 'libphonenumber-js';
import BottomNav from '@/components/BottomNav';
import Input from '@/components/Input';
import InvestorPortfolioDashboard from '@/components/InvestorPortfolioDashboard';
import { useInvestApp } from '@/lib/investapp-context';
import {
  canDeleteProject,
  canPauseProject,
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

const surfaceClassName =
  'rounded-[30px] border border-white/85 bg-white/88 p-4 shadow-[0_24px_70px_rgba(31,38,64,0.10)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl';

const fieldClassName =
  'w-full rounded-[22px] border border-[#E7ECF4] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-3.5 text-[0.95rem] font-medium tracking-[-0.025em] text-[#162033] outline-none shadow-[0_16px_32px_rgba(31,38,64,0.05)] transition placeholder:text-[#9BA5B9] focus:border-[#D7C8FF] focus:ring-4 focus:ring-[#6B39F4]/10 disabled:opacity-60';

const inputClassName =
  '!rounded-[22px] !border-[#E7ECF4] !bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] !px-4 !py-3.5 !text-[0.95rem] !font-medium !tracking-[-0.025em] !text-[#162033] !shadow-[0_16px_32px_rgba(31,38,64,0.05)] placeholder:!text-[#9BA5B9] focus:!border-[#D7C8FF] focus:!ring-4 focus:!ring-[#6B39F4]/10';

const formatMoney = (value: number | null | undefined, currency: string | null | undefined) => {
  if (value == null) return '--';
  const code = currency ?? 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${Number(value).toFixed(2)} ${code}`;
  }
};

const formatProjectDate = (value: string | null | undefined) => {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getProgressValue = (raised: number | null | undefined, requested: number | null | undefined) => {
  if (!requested || requested <= 0) return 0;
  return Math.max(0, Math.min(100, (Number(raised ?? 0) / Number(requested)) * 100));
};

const getProjectDescriptionPreview = (value: string, maxLength = 180) => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}...`;
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')}`;

const mixColors = (left: string, right: string, ratio: number) => {
  const a = hexToRgb(left);
  const b = hexToRgb(right);
  const weight = Math.max(0, Math.min(1, ratio));

  return rgbToHex({
    r: a.r + (b.r - a.r) * weight,
    g: a.g + (b.g - a.g) * weight,
    b: a.b + (b.b - a.b) * weight,
  });
};

const getProgressAccentColor = (progress: number) => {
  if (progress <= 30) {
    return mixColors('#FF8A5B', '#F2C94C', progress / 30);
  }

  if (progress <= 70) {
    return mixColors('#F2C94C', '#8CD95A', (progress - 30) / 40);
  }

  return mixColors('#8CD95A', '#28C76F', (progress - 70) / 30);
};

function TopBarButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-white/90 bg-white/88 text-[#6B39F4] shadow-[0_18px_34px_rgba(31,38,64,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
    >
      {children}
    </button>
  );
}

function SectionSurface({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`${surfaceClassName} ${className}`}>{children}</section>;
}

function MetricIconShell({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#F5F1FF] text-[#6B39F4] shadow-[0_10px_20px_rgba(107,57,244,0.08)]">
      {children}
    </span>
  );
}

function MetricRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-[#EDF1F7] bg-white/82 px-4 py-3.5 shadow-[0_12px_24px_rgba(31,38,64,0.04)]">
      <MetricIconShell>{icon}</MetricIconShell>
      <div className="min-w-0 flex-1">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-[#1C2336]">{value}</p>
      </div>
    </div>
  );
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

function IconClose() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7H17" />
      <path d="M10 12H17" />
      <path d="M13 17H17" />
      <path d="M7 7H7.01" />
      <path d="M7 12H7.01" />
      <path d="M7 17H7.01" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconSector() {
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
      <path d="M4 19V8" />
      <path d="M10 19V5" />
      <path d="M16 19v-8" />
      <path d="M22 19H2" />
    </svg>
  );
}

function IconLocation() {
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
      <path d="M12 20s6-4.4 6-10a6 6 0 1 0-12 0c0 5.6 6 10 6 10Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconAmount() {
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
      <rect x="3.5" y="6.5" width="17" height="11" rx="3" />
      <path d="M15.5 10.5h5" />
      <path d="M16.5 12h.01" />
    </svg>
  );
}

function IconInstallments() {
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
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <path d="M4 10h16" />
    </svg>
  );
}

function IconInterest() {
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
      <path d="M5 19L19 5" />
      <circle cx="7" cy="7" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function IconCalendar() {
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
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <path d="M4 10h16" />
    </svg>
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
  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/home');
  };

  return (
    <>
      <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.14),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-36 text-[#101828]">
        <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 top-56 h-64 w-64 rounded-full bg-[#B9A8FF]/16 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-[32rem] h-64 w-64 rounded-full bg-[#7DE0B8]/8 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8 pt-8">
          <header className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <TopBarButton onClick={handleClose} ariaLabel="Close portfolio">
                <IconClose />
              </TopBarButton>

              <div className="flex items-center gap-0.5 text-[1.7rem] font-semibold tracking-[-0.07em] text-[#1C2336]">
                <span>Invest</span>
                <span className="text-[#6B39F4]">App</span>
                <span className="ml-0.5 mt-0.5 h-3 w-3 rounded-full bg-[#6B39F4]" />
              </div>

              <TopBarButton
                onClick={() => router.push('/profile/settings')}
                ariaLabel="Open settings"
              >
                <IconMenu />
              </TopBarButton>
            </div>

            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8A93A8]">
                InvestApp
              </p>
              <h1 className="mt-1 text-[2rem] font-semibold tracking-[-0.065em] text-[#1C2336]">
                Entrepreneur portfolio
              </h1>
              <p className="mt-1 text-sm leading-6 text-[#7B879C]">
                Publish your venture or credit request
              </p>
            </div>
          </header>

          <SectionSurface className="bg-[linear-gradient(160deg,rgba(107,57,244,0.10)_0%,rgba(255,255,255,0.95)_44%,rgba(76,110,245,0.08)_100%)]">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F5F1FF] text-[#6B39F4] shadow-[0_14px_28px_rgba(107,57,244,0.12)]">
                <PublishProjectIcon />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-[-0.02em] text-[#1C2336]">
                  Publish project
                </p>
                <p className="mt-2 text-xs leading-6 text-[#7B879C]">
                  Only one business can stay published per user. Use Edit to update the current publication.
                </p>
              </div>

              <button
                type="button"
                onClick={startNewPublication}
                disabled={!canCreateNewProject}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition ${
                  canCreateNewProject
                    ? 'bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] hover:-translate-y-0.5'
                    : 'cursor-not-allowed bg-[#C8CBE0] shadow-none'
                }`}
                aria-label="Open project form"
              >
                <IconPlus />
              </button>
            </div>
          </SectionSurface>

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
                  <p className="mt-1 text-sm font-semibold text-[#1C2336]">Upload up to 10 images</p>
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
                  <option value="USDC">USDC</option>
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
                My published projects
              </h2>
            </div>

            {loadingProjects ? (
              <SectionSurface className="text-sm text-[#7B879C]">Loading projects...</SectionSurface>
            ) : null}

            {!loadingProjects && myProjects.length === 0 ? (
              <SectionSurface className="text-sm text-[#667085]">
                You have not published any projects yet.
              </SectionSurface>
            ) : null}

            {myProjects.map((project) => {
              const progressValue = getProgressValue(project.amount_received, project.amount_requested);
              const progressColor = getProgressAccentColor(progressValue);
              const progressGlow = mixColors(progressColor, '#FFFFFF', 0.35);
              const projectStatusLabel = getProjectStatusLabel(project);
              const deletionHint = canDeleteProject(project)
                ? 'Deletion stays available while the listing has not received financing.'
                : 'Deletion disabled because the listing has already received financing.';

              return (
                <div key={project.id} className="flex flex-col gap-3">
                  <SectionSurface className="overflow-hidden">
                    <div className="flex flex-col gap-4">
                      <div className="relative overflow-hidden rounded-[24px] border border-[#E9EAF5] bg-[#0F172A] shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                        <div className="relative h-44 w-full overflow-hidden">
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
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.10)_36%,rgba(15,23,42,0.74)_100%)]" />
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
                          <p
                            className="mt-2 text-sm leading-6 text-white/78"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {getProjectDescriptionPreview(project.description, 220)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <MetricRow
                          icon={<IconSector />}
                          label="Sector"
                          value={toEnglishSector(project.sector) || 'Pending'}
                        />
                        <MetricRow
                          icon={<IconLocation />}
                          label="Location"
                          value={[project.city, project.country].filter(Boolean).join(', ') || 'Pending'}
                        />
                        <MetricRow
                          icon={<IconAmount />}
                          label="Requested amount"
                          value={formatMoney(project.amount_requested, project.currency)}
                        />
                        <MetricRow
                          icon={<IconAmount />}
                          label="Raised amount"
                          value={formatMoney(project.amount_received, project.currency)}
                        />
                        <MetricRow
                          icon={<IconInstallments />}
                          label="Installments"
                          value={
                            getProjectRepaymentTermMonths(project)
                              ? `${getProjectRepaymentTermMonths(project)} months`
                              : 'Pending'
                          }
                        />
                        <MetricRow
                          icon={<IconInterest />}
                          label="Interest"
                          value={project.interest_rate ? `${project.interest_rate}%` : 'Pending'}
                        />
                        <MetricRow
                          icon={<IconCalendar />}
                          label="Published until"
                          value={formatProjectDate(project.publication_end_date)}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                            Funding progress
                          </p>
                          <p className="text-sm font-semibold text-[#1C2336]">
                            {Math.round(progressValue)}%
                          </p>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF1F6]">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
                            style={{
                              width: `${progressValue}%`,
                              background: `linear-gradient(90deg,#7C5CFF 0%, ${progressColor} 100%)`,
                              boxShadow: `0 0 18px ${progressGlow}88`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <StatusBadge className={getProjectStatusTone(project)}>
                          {projectStatusLabel}
                        </StatusBadge>
                        <p className="max-w-[15rem] text-right text-[11px] leading-5 text-[#7B879C]">
                          {deletionHint}
                        </p>
                      </div>
                    </div>
                  </SectionSurface>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditPublication(project)}
                      className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] px-4 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:-translate-y-0.5"
                    >
                      <IconEdit />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePausePublication(project)}
                      disabled={!canPauseProject(project) && project.status !== 'paused'}
                      className={`flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
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
                      className={`flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
                        canDeleteProject(project)
                          ? 'border-[#F5CDD3] bg-[#FFF6F7] text-[#DF1C41] shadow-[0_14px_28px_rgba(31,38,64,0.05)] hover:-translate-y-0.5'
                          : 'border-[#E1E5F0] bg-[#F4F5F8] text-[#A0A7B9]'
                      }`}
                    >
                      <IconDelete />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </section>

          {status ? (
            <SectionSurface className="text-xs leading-6 text-[#7B879C]">{status}</SectionSurface>
          ) : null}
        </div>
      </main>

      <BottomNav />
    </>
  );
}
