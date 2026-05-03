'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import BottomNav from '@/components/BottomNav';
import PageBackButton from '@/components/PageBackButton';
import TransactionLoader from '@/components/TransactionLoader';
import InvestmentOpportunityDetail, {
  type OpportunityMetric,
  type OpportunitySection,
} from '@/components/InvestmentOpportunityDetail';
import { useInvestApp } from '@/lib/investapp-context';
import { SECTOR_OPTIONS_ENGLISH } from '@/lib/sector-labels';
import {
  createCurrentUserProject,
  fetchCurrentUserProjects,
} from '@/utils/client/current-user-projects';
import {
  createCurrentUserPublicationPrompt,
  fetchCurrentUserPublicationDraft,
  saveCurrentUserPublicationDraft,
  type PublicationPromptDraft,
} from '@/utils/client/current-user-publication-prompts';
import { fetchCurrentUserProfile } from '@/utils/client/current-user-profile';
import type { ProjectMutationPayload, ProjectRecord } from '@/utils/projects/shared';

type PublishWizardForm = {
  business_name: string;
  location: string;
  industry: string;
  time_operating: string;
  business_stage: string;
  product_description: string;
  problem_solved: string;
  differentiation: string;
  monthly_revenue: string;
  avg_ticket: string;
  monthly_customers: string;
  growth_rate: string;
  social_media: string;
  capital_needed: string;
  funds_usage: string;
  investment_offer: string;
  target_customer: string;
  market_size: string;
  competition: string;
  founder_info: string;
  team_info: string;
  testimonials: string;
  achievements: string;
  timing_reason: string;
};

type ProfileSnapshot = {
  name?: string | null;
  surname?: string | null;
  phone_number?: string | null;
  country?: string | null;
};

type PromptField = {
  key: keyof PublishWizardForm | 'photo_count' | 'video_count';
  label: string;
  value: string;
};

type PromptSection = {
  title: string;
  fields: PromptField[];
};

type PromptJson = {
  version: number;
  locale: string;
  createdAt: string;
  fields: PublishWizardForm;
  sections: PromptSection[];
  media: {
    photoCount: number;
    videoCount: number;
    videoUrl: string | null;
  };
};

type OptimizedPublication = {
  title?: string;
  summary?: string;
  description?: string;
  highlights?: string[];
  traction?: string;
  useOfFunds?: string;
  marketOpportunity?: string;
  investorNotes?: string;
};

type ReviewState = {
  draftId: string;
  provider: string;
  promptJson: PromptJson;
  optimizedPublication: OptimizedPublication;
};

const OPERATING_TIME_OPTIONS = ['<1 year', '>1 <5 years', '>5 <10 years', '>10 years'];
const REGISTRATION_OPTIONS = ['Registered business', 'Not registered yet'];

const emptyForm: PublishWizardForm = {
  business_name: '',
  location: '',
  industry: '',
  time_operating: '',
  business_stage: '',
  product_description: '',
  problem_solved: '',
  differentiation: '',
  monthly_revenue: '',
  avg_ticket: '',
  monthly_customers: '',
  growth_rate: '',
  social_media: '',
  capital_needed: '',
  funds_usage: '',
  investment_offer: '',
  target_customer: '',
  market_size: '',
  competition: '',
  founder_info: '',
  team_info: '',
  testimonials: '',
  achievements: '',
  timing_reason: '',
};

const steps = [
  'Basic information',
  'Value proposition',
  'Traction',
  'Investment',
  'Market',
  'Team',
  'Media',
  'Extra',
] as const;

const requiredByStep: Array<Array<keyof PublishWizardForm>> = [
  ['business_name', 'location', 'industry', 'time_operating', 'business_stage'],
  ['product_description', 'problem_solved', 'differentiation'],
  ['monthly_revenue', 'avg_ticket', 'monthly_customers', 'growth_rate'],
  ['capital_needed', 'funds_usage', 'investment_offer'],
  ['target_customer', 'market_size', 'competition'],
  ['founder_info', 'team_info'],
  [],
  [],
];

const surfaceClassName =
  'rounded-[30px] border border-white/85 bg-white/88 p-4 shadow-[0_24px_70px_rgba(31,38,64,0.10)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl';

const fieldClassName =
  'w-full rounded-[22px] border border-[#E7ECF4] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-3.5 text-[0.95rem] font-medium tracking-[-0.025em] text-[#162033] outline-none shadow-[0_16px_32px_rgba(31,38,64,0.05)] transition placeholder:text-[#9BA5B9] focus:border-[#D7C8FF] focus:ring-4 focus:ring-[#6B39F4]/10 disabled:opacity-60';

const primaryButtonClassName =
  'flex min-h-[52px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] px-5 text-sm font-semibold text-white shadow-[0_20px_38px_rgba(107,57,244,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60';

const secondaryButtonClassName =
  'flex min-h-[52px] items-center justify-center rounded-full border border-[#DDD3FF] bg-white px-5 text-sm font-semibold text-[#6B39F4] shadow-[0_14px_28px_rgba(31,38,64,0.06)] transition hover:-translate-y-0.5 hover:bg-[#FBFAFF] disabled:cursor-not-allowed disabled:opacity-60';

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

const moneyNumber = (value: string) => {
  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const moneyLabel = (value: string, fallback = 'Pending') => {
  const amount = moneyNumber(value);
  if (amount <= 0) return fallback;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

const textOrFallback = (value: string | null | undefined, fallback = 'Pending') =>
  value?.trim() || fallback;

const splitBullets = (value: string | null | undefined) =>
  (value ?? '')
    .split(/\n|;|•/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);

const buildPreviewSections = (
  form: PublishWizardForm,
  optimized: OptimizedPublication
): OpportunitySection[] => {
  const useOfFunds = splitBullets(form.funds_usage);
  const achievements = [
    ...splitBullets(form.achievements),
    ...splitBullets(form.testimonials),
    form.monthly_revenue ? `Monthly revenue: ${form.monthly_revenue}` : '',
    form.growth_rate ? `Growth: ${form.growth_rate}` : '',
  ]
    .filter(Boolean)
    .slice(0, 6);

  return [
    {
      title: 'Overview',
      body: optimized.description?.trim() || optimized.summary || form.product_description,
      icon: 'overview',
    },
    {
      title: 'The Problem',
      body: textOrFallback(form.problem_solved, 'The founder will provide more detail about the customer pain point.'),
      icon: 'problem',
    },
    {
      title: 'Our Solution',
      body: textOrFallback(form.differentiation || form.product_description),
      icon: 'solution',
    },
    {
      title: 'Business Model',
      body: [
        form.product_description ? `Product or service: ${form.product_description}` : '',
        form.avg_ticket ? `Average ticket: ${form.avg_ticket}` : '',
        form.monthly_customers ? `Monthly customers: ${form.monthly_customers}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      icon: 'business',
    },
    {
      title: 'Traction & Achievements',
      body: optimized.traction,
      bullets: achievements.length ? achievements : optimized.highlights?.slice(0, 5),
      icon: 'traction',
    },
    {
      title: 'Market Opportunity',
      body: optimized.marketOpportunity || [form.target_customer, form.market_size, form.competition].filter(Boolean).join('\n\n'),
      icon: 'market',
    },
    {
      title: 'Use of Funds',
      body: optimized.useOfFunds,
      bullets: useOfFunds.length ? useOfFunds : undefined,
      icon: 'funds',
    },
  ];
};

const buildPreviewMetrics = (form: PublishWizardForm): OpportunityMetric[] => [
  {
    label: 'Funding Goal',
    value: moneyLabel(form.capital_needed),
    icon: 'goal',
  },
  {
    label: 'Annual Rate',
    value: form.investment_offer ? `${form.investment_offer}% EA` : 'Pending',
    icon: 'rate',
  },
  {
    label: 'Monthly Sales',
    value: moneyLabel(form.monthly_revenue),
    icon: 'sales',
  },
  {
    label: 'Active Clients',
    value: form.monthly_customers || 'Pending',
    icon: 'clients',
  },
];

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const inferOpeningDate = (timeOperating: string) => {
  const date = new Date();
  if (timeOperating === '<1 year') date.setMonth(date.getMonth() - 6);
  else if (timeOperating === '>1 <5 years') date.setFullYear(date.getFullYear() - 2);
  else if (timeOperating === '>5 <10 years') date.setFullYear(date.getFullYear() - 7);
  else date.setFullYear(date.getFullYear() - 11);
  return date.toISOString().slice(0, 10);
};

const firstSentence = (value: string) =>
  value
    .split(/[.\n]/)
    .map((item) => item.trim())
    .find(Boolean) ?? '';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message ?? error);
  }
  return String(error);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const coerceText = (value: unknown) => (typeof value === 'string' ? value : '');

const normalizeDraftForm = (value: unknown): PublishWizardForm => {
  const source = isPlainObject(value) ? value : {};
  return (Object.keys(emptyForm) as Array<keyof PublishWizardForm>).reduce(
    (draftForm, key) => ({
      ...draftForm,
      [key]: coerceText(source[key]),
    }),
    { ...emptyForm }
  );
};

const normalizeStringArray = (value: unknown, maxItems: number) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .slice(0, maxItems)
    : [];

const promptValue = (value: string) => value.replace(/\s+/g, ' ').trim() || 'No proporcionado';

const buildPublicationPromptText = (form: PublishWizardForm) => `Genera una publicación de inversión para el siguiente negocio:

Nombre: ${promptValue(form.business_name)}
Ubicación: ${promptValue(form.location)}
Industria: ${promptValue(form.industry)}
Tiempo operando: ${promptValue(form.time_operating)}
Etapa: ${promptValue(form.business_stage)}

Producto/Servicio: ${promptValue(form.product_description)}
Problema que resuelve: ${promptValue(form.problem_solved)}
Diferenciación: ${promptValue(form.differentiation)}

Ventas mensuales: ${promptValue(form.monthly_revenue)}
Ticket promedio: ${promptValue(form.avg_ticket)}
Clientes mensuales: ${promptValue(form.monthly_customers)}
Crecimiento: ${promptValue(form.growth_rate)}
Redes sociales: ${promptValue(form.social_media)}

Capital requerido: ${promptValue(form.capital_needed)}
Uso de fondos: ${promptValue(form.funds_usage)}
Oferta de inversión: ${promptValue(form.investment_offer)}

Cliente ideal: ${promptValue(form.target_customer)}
Tamaño de mercado: ${promptValue(form.market_size)}
Competencia: ${promptValue(form.competition)}

Fundador: ${promptValue(form.founder_info)}
Equipo: ${promptValue(form.team_info)}

Testimonios: ${promptValue(form.testimonials)}
Logros: ${promptValue(form.achievements)}
Momento de inversión: ${promptValue(form.timing_reason)}

Hazlo altamente persuasivo y listo para publicación.`;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[0.72rem] font-semibold text-[#596277]">{children}</label>;
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={fieldClassName}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      {helper ? <p className="text-xs leading-5 text-[#7B879C]">{helper}</p> : null}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${fieldClassName} min-h-28 resize-none leading-6`}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClassName}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 15V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 19h14" />
    </svg>
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

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-3xl border border-white/20 bg-white/10 p-8 text-center text-white shadow-2xl">
        <TransactionLoader />
        <p className="mt-6 text-sm font-medium text-white/85">{label}</p>
      </div>
    </div>
  );
}

export default function PublishPage() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado, smartWalletAddress } = useInvestApp();
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<PublishWizardForm>(emptyForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [projectPhotos, setProjectPhotos] = useState<string[]>([]);
  const [projectVideos, setProjectVideos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [savedDraft, setSavedDraft] = useState<PublicationPromptDraft | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [hasExistingProject, setHasExistingProject] = useState(false);
  const [checkingProject, setCheckingProject] = useState(true);
  const [status, setStatus] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);

  const currentStep = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadState = async () => {
      if (!user?.id || rolSeleccionado !== 'emprendedor') return;
      setCheckingProject(true);

      const [projectsResponse, profileResponse, draftResponse] = await Promise.all([
        fetchCurrentUserProjects(getAccessToken),
        fetchCurrentUserProfile<ProfileSnapshot | null>(getAccessToken),
        fetchCurrentUserPublicationDraft(getAccessToken),
      ]);

      if (projectsResponse.error) {
        setStatus(`Could not verify your current project state: ${projectsResponse.error}`);
      } else {
        setHasExistingProject(((projectsResponse.data ?? []) as ProjectRecord[]).length > 0);
      }

      if (!profileResponse.error) {
        setProfile(profileResponse.data ?? null);
      }

      if (!draftResponse.error) {
        setSavedDraft(draftResponse.data ?? null);
      }

      setCheckingProject(false);
    };

    void loadState();
  }, [getAccessToken, rolSeleccionado, user?.id]);

  const updateForm = (key: keyof PublishWizardForm, value: string) => {
    setReview(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const promptJson = useMemo<PromptJson>(
    () => ({
      version: 1,
      locale: 'en',
      createdAt: new Date().toISOString(),
      fields: form,
      sections: [
        {
          title: '1. Basic business information',
          fields: [
            { key: 'business_name', label: 'Business name', value: form.business_name },
            { key: 'location', label: 'Location', value: form.location },
            { key: 'industry', label: 'Industry', value: form.industry },
            { key: 'time_operating', label: 'Time operating', value: form.time_operating },
            { key: 'business_stage', label: 'Business stage', value: form.business_stage },
          ],
        },
        {
          title: '2. What you do',
          fields: [
            { key: 'product_description', label: 'What you sell exactly', value: form.product_description },
            { key: 'problem_solved', label: 'Problem solved', value: form.problem_solved },
            { key: 'differentiation', label: 'Differentiation', value: form.differentiation },
          ],
        },
        {
          title: '3. Traction',
          fields: [
            { key: 'monthly_revenue', label: 'Current monthly revenue', value: form.monthly_revenue },
            { key: 'avg_ticket', label: 'Average ticket per customer', value: form.avg_ticket },
            { key: 'monthly_customers', label: 'Monthly customers', value: form.monthly_customers },
            { key: 'growth_rate', label: 'Growth rate', value: form.growth_rate },
            { key: 'social_media', label: 'Social media', value: form.social_media },
          ],
        },
        {
          title: '4. Investment requested',
          fields: [
            { key: 'capital_needed', label: 'Capital needed', value: form.capital_needed },
            { key: 'funds_usage', label: 'Use of funds', value: form.funds_usage },
            { key: 'investment_offer', label: 'Investment offer', value: form.investment_offer },
          ],
        },
        {
          title: '5. Market and opportunity',
          fields: [
            { key: 'target_customer', label: 'Target customer', value: form.target_customer },
            { key: 'market_size', label: 'Market size', value: form.market_size },
            { key: 'competition', label: 'Competition and differentiation', value: form.competition },
          ],
        },
        {
          title: '6. Team',
          fields: [
            { key: 'founder_info', label: 'Founder info', value: form.founder_info },
            { key: 'team_info', label: 'Team info', value: form.team_info },
          ],
        },
        {
          title: '7. Media content',
          fields: [
            { key: 'photo_count', label: 'Photos', value: `${projectPhotos.length} photo(s) uploaded` },
            {
              key: 'video_count',
              label: 'Videos',
              value: `${projectVideos.length + (videoUrl.trim() ? 1 : 0)} video source(s) added`,
            },
          ],
        },
        {
          title: '8. Extra',
          fields: [
            { key: 'testimonials', label: 'Customer testimonials', value: form.testimonials },
            { key: 'achievements', label: 'Achievements', value: form.achievements },
            { key: 'timing_reason', label: 'Why now', value: form.timing_reason },
          ],
        },
      ],
      media: {
        photoCount: projectPhotos.length,
        videoCount: projectVideos.length + (videoUrl.trim() ? 1 : 0),
        videoUrl: videoUrl.trim() || null,
      },
    }),
    [form, projectPhotos.length, projectVideos.length, videoUrl]
  );

  const promptText = useMemo(() => buildPublicationPromptText(form), [form]);

  const draftMetadata = useMemo(
    () => ({
      step_index: stepIndex,
      media: {
        photo_urls: projectPhotos,
        video_urls: projectVideos,
        video_url: videoUrl.trim() || null,
        video_count: projectVideos.length + (videoUrl.trim() ? 1 : 0),
      },
    }),
    [projectPhotos, projectVideos, stepIndex, videoUrl]
  );

  const profileName = useMemo(() => {
    const name = `${profile?.name ?? ''} ${profile?.surname ?? ''}`.trim();
    return name || firstSentence(form.founder_info) || `${form.business_name} founder`;
  }, [form.business_name, form.founder_info, profile?.name, profile?.surname]);

  const validateStep = useCallback(
    (targetStep: number) => {
      const missing = requiredByStep[targetStep].find((field) => !form[field].trim());
      if (missing) {
        setStatus('Complete all required fields in this section.');
        return false;
      }

      setStatus('');
      return true;
    },
    [form]
  );

  const goNext = () => {
    if (!validateStep(stepIndex)) return;
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const goBack = () => {
    setStatus('');
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const resumeDraft = (draft: PublicationPromptDraft) => {
    const promptData = isPlainObject(draft.promptJson) ? draft.promptJson : {};
    const metadata = isPlainObject(draft.metadata) ? draft.metadata : {};
    const media = isPlainObject(metadata.media) ? metadata.media : {};
    const savedStepIndex = Number(metadata.step_index ?? 0);

    setForm(normalizeDraftForm(promptData.fields));
    setProjectPhotos(normalizeStringArray(media.photo_urls, 12));
    setProjectVideos(normalizeStringArray(media.video_urls, 2));
    setVideoUrl(coerceText(media.video_url));
    setStepIndex(
      Number.isFinite(savedStepIndex) ? Math.max(0, Math.min(steps.length - 1, savedStepIndex)) : 0
    );
    setDraftId(draft.id);
    setReview(null);
    setStatus('Draft resumed. You can keep editing.');
  };

  const saveDraft = async () => {
    if (!user?.id || hasExistingProject || checkingProject || savingDraft) return;

    setSavingDraft(true);
    setStatus('');

    const { data, error } = await saveCurrentUserPublicationDraft(getAccessToken, {
      id: draftId,
      promptJson,
      promptText,
      metadata: draftMetadata,
    });

    if (error || !data) {
      setStatus(`Could not save the draft: ${error ?? 'Unknown error.'}`);
      setSavingDraft(false);
      return;
    }

    setDraftId(data.id);
    setSavedDraft(data);
    setStatus('Draft saved. You can resume it later from this page.');
    setSavingDraft(false);
  };

  const validateAll = () => {
    for (let index = 0; index < requiredByStep.length; index += 1) {
      const missing = requiredByStep[index].find((field) => !form[field].trim());
      if (missing) {
        setStepIndex(index);
        setStatus('Complete all required fields before finishing.');
        return false;
      }
    }

    if (projectPhotos.length < 5) {
      setStepIndex(6);
      setStatus('Upload at least 5 photos so the publication can stand out.');
      return false;
    }

    if (moneyNumber(form.capital_needed) <= 0) {
      setStepIndex(3);
      setStatus('Add a valid capital amount.');
      return false;
    }

    if (moneyNumber(form.investment_offer) < 0) {
      setStepIndex(3);
      setStatus('Add a valid interest rate.');
      return false;
    }

    return true;
  };

  const onPickPhotos = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.length > 12) {
      setStatus('You can upload up to 12 photos.');
      return;
    }

    try {
      const urls = await Promise.all(selected.slice(0, 12).map(fileToDataUrl));
      setProjectPhotos(urls);
      setReview(null);
      setStatus('');
    } catch (error) {
      setStatus(`Could not read the images: ${getErrorMessage(error)}`);
    }
  };

  const onPickVideos = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.length > 2) {
      setStatus('You can upload up to 2 videos.');
      return;
    }

    try {
      const urls = await Promise.all(selected.slice(0, 2).map(fileToDataUrl));
      setProjectVideos(urls);
      setReview(null);
      setStatus('');
    } catch (error) {
      setStatus(`Could not read the videos: ${getErrorMessage(error)}`);
    }
  };

  const updateVideoUrl = (value: string) => {
    setReview(null);
    setVideoUrl(value);
  };

  const finalizePrompt = async () => {
    if (!user?.id || hasExistingProject || checkingProject) return;
    if (!validateAll()) return;

    setFinalizing(true);
    setStatus('');

    try {
      const { data, error } = await createCurrentUserPublicationPrompt(getAccessToken, {
        id: draftId,
        promptJson,
        promptText,
        metadata: draftMetadata,
      });

      if (error || !data) {
        throw new Error(error ?? 'Could not prepare the publication.');
      }

      setReview({
        draftId: data.id,
        provider: data.provider,
        promptJson,
        optimizedPublication: data.optimizedPublication,
      });
      setDraftId(data.id);
      setStatus('Review the optimized publication before publishing.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setStatus(`Could not prepare the publication: ${getErrorMessage(error)}`);
    } finally {
      setFinalizing(false);
    }
  };

  const buildProjectPayload = (): ProjectMutationPayload | null => {
    if (!review) return null;

    const optimized = review.optimizedPublication;
    const selectedDescription =
      optimized.description?.trim() ||
      `${optimized.summary ?? ''}\n\n${form.problem_solved}\n\n${form.funds_usage}`.trim();
    const country = profile?.country?.trim() || 'Not specified';

    return {
      owner_wallet: smartWalletAddress ?? null,
      title: (optimized.title?.trim() || `${form.business_name} investment opportunity`).slice(0, 120),
      business_name: form.business_name,
      sector: form.industry,
      legal_representative: profileName,
      nit: null,
      opening_date: inferOpeningDate(form.time_operating),
      address: form.location,
      phone: profile?.phone_number?.trim() || 'Not specified',
      city: 'Not specified',
      country,
      description: selectedDescription.slice(0, 2500),
      amount_requested: moneyNumber(form.capital_needed),
      minimum_investment: 50,
      currency: 'USD',
      installment_count: 6,
      publication_end_date: addDays(90),
      interest_rate: moneyNumber(form.investment_offer),
      photo_urls: projectPhotos.slice(0, 12),
      video_url: (projectVideos[0] ?? videoUrl.trim()) || null,
      metadata: {
        submitted_from: 'guided_publish_page',
        publication_prompt_id: review.draftId,
        publication_prompt_provider: review.provider,
        publication_prompt_json: review.promptJson,
        optimized_publication: optimized,
        publication_form_fields: form,
        business_stage: form.business_stage,
        media: {
          photo_count: projectPhotos.length,
          video_count: projectVideos.length + (videoUrl.trim() ? 1 : 0),
          video_url: videoUrl.trim() || null,
        },
      },
    };
  };

  const publishProject = async () => {
    if (!user?.id || !review || hasExistingProject) return;

    const payload = buildProjectPayload();
    if (!payload) return;

    setPublishing(true);
    setStatus('');

    const { error } = await createCurrentUserProject(getAccessToken, payload);
    if (error) {
      setStatus(`Could not publish the venture: ${error}`);
      setPublishing(false);
      return;
    }

    setStatus('Venture published and visible in the marketplace.');
    setPublishing(false);
    router.push('/feed');
  };

  const renderStep = () => {
    switch (stepIndex) {
      case 0:
        return (
          <div className="flex flex-col gap-4">
            <TextInput
              label="Business name"
              value={form.business_name}
              onChange={(value) => updateForm('business_name', value)}
              placeholder="Aurora Coffee"
            />
            <TextInput
              label="Location"
              value={form.location}
              onChange={(value) => updateForm('location', value)}
              placeholder="Street, city, country"
            />
            <SelectField
              label="What industry are you in?"
              value={form.industry}
              onChange={(value) => updateForm('industry', value)}
              options={SECTOR_OPTIONS_ENGLISH}
              placeholder="Select a category"
            />
            <SelectField
              label="How long have you been operating?"
              value={form.time_operating}
              onChange={(value) => updateForm('time_operating', value)}
              options={OPERATING_TIME_OPTIONS}
              placeholder="Select an option"
            />
            <SelectField
              label="Business stage"
              value={form.business_stage}
              onChange={(value) => updateForm('business_stage', value)}
              options={REGISTRATION_OPTIONS}
              placeholder="Select current stage"
            />
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col gap-4">
            <TextArea
              label="What exactly do you sell?"
              value={form.product_description}
              onChange={(value) => updateForm('product_description', value)}
              placeholder="Describe the product or service clearly."
            />
            <TextArea
              label="What problem do you solve?"
              value={form.problem_solved}
              onChange={(value) => updateForm('problem_solved', value)}
              placeholder="Describe the customer's real pain and how you solve it."
            />
            <TextArea
              label="Why is your business different or better?"
              value={form.differentiation}
              onChange={(value) => updateForm('differentiation', value)}
              helper="Avoid generic answers like quality and good service."
            />
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col gap-4">
            <div className="rounded-[24px] border border-[#E7ECF4] bg-[#FAF9FF] px-4 py-4 text-xs leading-5 text-[#667085]">
              The more specific you are, the better. Avoid phrases like we sell a lot. A strong
              example: $12,000 USD monthly revenue with 18% growth over 3 months.
            </div>
            <TextInput
              label="Current monthly revenue"
              value={form.monthly_revenue}
              onChange={(value) => updateForm('monthly_revenue', value)}
              placeholder="$12,000 USD"
            />
            <TextInput
              label="Average ticket per customer"
              value={form.avg_ticket}
              onChange={(value) => updateForm('avg_ticket', value)}
              placeholder="$45 USD"
            />
            <TextInput
              label="Number of customers per month"
              value={form.monthly_customers}
              onChange={(value) => updateForm('monthly_customers', value)}
              type="number"
              placeholder="320"
            />
            <TextInput
              label="Are you growing? yes/no + approximate %"
              value={form.growth_rate}
              onChange={(value) => updateForm('growth_rate', value)}
              placeholder="Yes, 18% over the last 3 months"
            />
            <TextInput
              label="Social media"
              value={form.social_media}
              onChange={(value) => updateForm('social_media', value)}
              placeholder="@business, Instagram, TikTok, website or links"
            />
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col gap-4">
            <TextInput
              label="How much capital do you need to raise?"
              value={form.capital_needed}
              onChange={(value) => updateForm('capital_needed', value)}
              type="number"
              placeholder="50000"
            />
            <TextArea
              label="How will you use the money?"
              value={form.funds_usage}
              onChange={(value) => updateForm('funds_usage', value)}
              placeholder="Example: 45% inventory, 30% equipment, 25% marketing."
            />
            <TextInput
              label="What annual interest rate do you offer?"
              value={form.investment_offer}
              onChange={(value) => updateForm('investment_offer', value)}
              type="number"
              placeholder="12"
            />
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col gap-4">
            <TextArea
              label="Who is your ideal customer?"
              value={form.target_customer}
              onChange={(value) => updateForm('target_customer', value)}
            />
            <TextArea
              label="How large is the market?"
              value={form.market_size}
              onChange={(value) => updateForm('market_size', value)}
              placeholder="An estimate is okay."
            />
            <TextArea
              label="Is there competition? What do you do better?"
              value={form.competition}
              onChange={(value) => updateForm('competition', value)}
            />
          </div>
        );
      case 5:
        return (
          <div className="flex flex-col gap-4">
            <TextArea
              label="Who are you?"
              value={form.founder_info}
              onChange={(value) => updateForm('founder_info', value)}
              placeholder="Brief experience."
            />
            <TextArea
              label="Do you have partners or a team?"
              value={form.team_info}
              onChange={(value) => updateForm('team_info', value)}
              placeholder="Roles and responsibilities."
            />
          </div>
        );
      case 6:
        return (
          <div className="flex flex-col gap-4">
            <div className="rounded-[24px] border border-[#E7ECF4] bg-[#FAF9FF] px-4 py-4 text-xs leading-5 text-[#667085]">
              To make the publication stand out, upload at least 5 photos. Ideally show product,
              location, process, customers and branding.
            </div>
            <div className="rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 shadow-[0_14px_28px_rgba(31,38,64,0.05)]">
              <p className="text-sm font-semibold text-[#1C2336]">Photos</p>
              <p className="mt-1 text-xs leading-5 text-[#7B879C]">Minimum 5, ideal 8-12.</p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => onPickPhotos(event.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className={`${secondaryButtonClassName} mt-3 w-full gap-2`}
              >
                <UploadIcon />
                Upload images
              </button>
              {projectPhotos.length ? (
                <p className="mt-3 text-xs font-semibold text-[#6B39F4]">
                  {projectPhotos.length} photo(s) uploaded
                </p>
              ) : null}
            </div>
            <div className="rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 shadow-[0_14px_28px_rgba(31,38,64,0.05)]">
              <p className="text-sm font-semibold text-[#1C2336]">Video</p>
              <p className="mt-1 text-xs leading-5 text-[#7B879C]">
                Recommended: 1-2 videos of 30-60 seconds.
              </p>
              <TextInput
                label="Video URL"
                value={videoUrl}
                onChange={updateVideoUrl}
                placeholder="Paste a video URL if the file is not on this device"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                onChange={(event) => onPickVideos(event.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className={`${secondaryButtonClassName} mt-3 w-full gap-2`}
              >
                <UploadIcon />
                Upload videos
              </button>
              {projectVideos.length ? (
                <p className="mt-3 text-xs font-semibold text-[#6B39F4]">
                  {projectVideos.length} video file(s) uploaded
                </p>
              ) : null}
              {videoUrl.trim() ? (
                <p className="mt-2 text-xs font-semibold text-[#6B39F4]">Video URL added</p>
              ) : null}
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col gap-4">
            <TextArea
              label="Customer testimonials"
              value={form.testimonials}
              onChange={(value) => updateForm('testimonials', value)}
              placeholder="Optional."
            />
            <TextArea
              label="Achievements"
              value={form.achievements}
              onChange={(value) => updateForm('achievements', value)}
              placeholder="Sales, awards, press, partnerships or milestones."
            />
            <TextArea
              label="Why is now the right time?"
              value={form.timing_reason}
              onChange={(value) => updateForm('timing_reason', value)}
              placeholder="Optional: explain why raising capital now increases the opportunity."
            />
          </div>
        );
    }
  };

  if (rolSeleccionado !== 'emprendedor') {
    return (
      <>
        <main className="min-h-screen bg-[linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_100%)] px-4 pb-32 pt-8 text-[#101828]">
          <div className="mx-auto w-full max-w-md">
            <PageBackButton fallbackHref="/feed" label="Back" />
            <SectionSurface className="mt-4 text-sm leading-6 text-[#667085]">
              This page is available for entrepreneur profiles.
            </SectionSurface>
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      {(finalizing || publishing) ? <LoadingOverlay label={finalizing ? 'Sending...' : 'Publishing...'} /> : null}

      {!hasExistingProject && review ? (
        <InvestmentOpportunityDetail
          title={review.optimizedPublication.title || `${form.business_name} investment opportunity`}
          subtitle={review.optimizedPublication.summary || `Invest in ${form.business_name || 'this business'} today.`}
          location={form.location || profile?.country || 'Location pending'}
          category={form.industry || 'Business'}
          rate={form.investment_offer ? `${form.investment_offer}% EA` : undefined}
          images={projectPhotos}
          metrics={buildPreviewMetrics(form)}
          sections={buildPreviewSections(form, review.optimizedPublication)}
          primaryActionLabel={publishing ? 'Publishing...' : 'Publish'}
          secondaryActionLabel="Edit details"
          onPrimaryAction={publishProject}
          onSecondaryAction={() => setReview(null)}
          onBack={() => setReview(null)}
          primaryDisabled={publishing}
          secondaryDisabled={publishing}
        />
      ) : (
      <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.14),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-36 text-[#101828]">
        <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 top-56 h-64 w-64 rounded-full bg-[#B9A8FF]/16 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8 pt-8">
          <PageBackButton fallbackHref="/feed" label="Back" />

          <header className="flex flex-col gap-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8A93A8]">
              Guided publish
            </p>
            <h1 className="text-[2rem] font-semibold tracking-[-0.065em] text-[#1C2336]">
              Publish project
            </h1>
            <p className="text-sm leading-6 text-[#7B879C]">
              Complete each section and review the optimized version before publishing.
            </p>
          </header>

          {checkingProject ? (
            <SectionSurface className="text-sm text-[#667085]">Checking your current business...</SectionSurface>
          ) : null}

          {!checkingProject && hasExistingProject ? (
            <SectionSurface className="text-sm leading-6 text-[#667085]">
              You already have a published venture. You can edit it from portfolio; the rule is one
              project per entrepreneur.
              <button
                type="button"
                onClick={() => router.push('/portfolio')}
                className={`${primaryButtonClassName} mt-4 w-full`}
              >
                Go to portfolio
              </button>
            </SectionSurface>
          ) : null}

          {!hasExistingProject && savedDraft && !draftId && !review ? (
            <SectionSurface className="text-sm leading-6 text-[#667085]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                Saved draft
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
                Resume your publication
              </h2>
              <p className="mt-2">
                You have a saved publication draft. Resume it to keep editing from where you left off.
              </p>
              <button
                type="button"
                onClick={() => resumeDraft(savedDraft)}
                className={`${primaryButtonClassName} mt-4 w-full`}
              >
                Resume
              </button>
            </SectionSurface>
          ) : null}

          {!hasExistingProject && !review ? (
            <SectionSurface>
              <div className="mb-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                      Step {stepIndex + 1} of {steps.length}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
                      {currentStep}
                    </h2>
                  </div>
                  <span className="rounded-full border border-[#DDD3FF] bg-[#F7F2FF] px-3 py-1 text-xs font-semibold text-[#6B39F4]">
                    {progress}%
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#ECEFFD]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {renderStep()}

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={stepIndex === 0 || finalizing || savingDraft}
                  className={secondaryButtonClassName}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => void saveDraft()}
                  disabled={savingDraft || finalizing || checkingProject}
                  className={secondaryButtonClassName}
                >
                  {savingDraft ? 'Saving...' : 'Save draft'}
                </button>
                {stepIndex === steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={finalizePrompt}
                    disabled={finalizing || checkingProject}
                    className={`${primaryButtonClassName} col-span-2`}
                  >
                    Finish
                  </button>
                ) : (
                  <button type="button" onClick={goNext} className={`${primaryButtonClassName} col-span-2`}>
                    Next
                  </button>
                )}
              </div>
            </SectionSurface>
          ) : null}

          {status ? (
            <SectionSurface className="text-xs leading-6 text-[#7B879C]">{status}</SectionSurface>
          ) : null}
        </div>
      </main>
      )}

      {!review ? <BottomNav /> : null}
    </>
  );
}
