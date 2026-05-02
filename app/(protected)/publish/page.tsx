'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import BottomNav from '@/components/BottomNav';
import PageBackButton from '@/components/PageBackButton';
import TransactionLoader from '@/components/TransactionLoader';
import { useInvestApp } from '@/lib/investapp-context';
import { SECTOR_OPTIONS_ENGLISH } from '@/lib/sector-labels';
import {
  createCurrentUserProject,
  fetchCurrentUserProjects,
} from '@/utils/client/current-user-projects';
import { createCurrentUserPublicationPrompt } from '@/utils/client/current-user-publication-prompts';
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

const OPERATING_TIME_OPTIONS = ['<1 ano', '>1 <5 anos', '>5 <10 anos', '>10 anos'];
const REGISTRATION_OPTIONS = ['Si', 'No'];

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
  'Informacion basica',
  'Propuesta clara',
  'Traccion',
  'Inversion',
  'Mercado',
  'Equipo',
  'Multimedia',
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
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const inferOpeningDate = (timeOperating: string) => {
  const date = new Date();
  if (timeOperating === '<1 ano') date.setMonth(date.getMonth() - 6);
  else if (timeOperating === '>1 <5 anos') date.setFullYear(date.getFullYear() - 2);
  else if (timeOperating === '>5 <10 anos') date.setFullYear(date.getFullYear() - 7);
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
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [hasExistingProject, setHasExistingProject] = useState(false);
  const [checkingProject, setCheckingProject] = useState(true);
  const [status, setStatus] = useState('');
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

      const [projectsResponse, profileResponse] = await Promise.all([
        fetchCurrentUserProjects(getAccessToken),
        fetchCurrentUserProfile<ProfileSnapshot | null>(getAccessToken),
      ]);

      if (projectsResponse.error) {
        setStatus(`Could not verify your current project state: ${projectsResponse.error}`);
      } else {
        setHasExistingProject(((projectsResponse.data ?? []) as ProjectRecord[]).length > 0);
      }

      if (!profileResponse.error) {
        setProfile(profileResponse.data ?? null);
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
      locale: 'es',
      createdAt: new Date().toISOString(),
      fields: form,
      sections: [
        {
          title: '1. Informacion basica del negocio',
          fields: [
            { key: 'business_name', label: 'Nombre del negocio', value: form.business_name },
            { key: 'location', label: 'Direccion', value: form.location },
            { key: 'industry', label: 'Industria', value: form.industry },
            { key: 'time_operating', label: 'Hace cuanto operas', value: form.time_operating },
            { key: 'business_stage', label: 'Etapa o registro del negocio', value: form.business_stage },
          ],
        },
        {
          title: '2. Que haces',
          fields: [
            { key: 'product_description', label: 'Que vendes exactamente', value: form.product_description },
            { key: 'problem_solved', label: 'Que problema resuelves', value: form.problem_solved },
            { key: 'differentiation', label: 'Por que tu negocio es diferente o mejor que otros', value: form.differentiation },
          ],
        },
        {
          title: '3. Traccion',
          fields: [
            { key: 'monthly_revenue', label: 'Ventas mensuales actuales', value: form.monthly_revenue },
            { key: 'avg_ticket', label: 'Ticket promedio por cliente', value: form.avg_ticket },
            { key: 'monthly_customers', label: 'Numero de clientes al mes', value: form.monthly_customers },
            { key: 'growth_rate', label: 'Crecimiento aproximado', value: form.growth_rate },
            { key: 'social_media', label: 'Social media', value: form.social_media },
          ],
        },
        {
          title: '4. Inversion que buscas',
          fields: [
            { key: 'capital_needed', label: 'Capital que necesitas levantar', value: form.capital_needed },
            { key: 'funds_usage', label: 'En que usaras el dinero', value: form.funds_usage },
            { key: 'investment_offer', label: 'Oferta de inversion', value: form.investment_offer },
          ],
        },
        {
          title: '5. Mercado y oportunidad',
          fields: [
            { key: 'target_customer', label: 'Cliente ideal', value: form.target_customer },
            { key: 'market_size', label: 'Tamano del mercado', value: form.market_size },
            { key: 'competition', label: 'Competencia y diferenciacion', value: form.competition },
          ],
        },
        {
          title: '6. Equipo',
          fields: [
            { key: 'founder_info', label: 'Quien eres tu', value: form.founder_info },
            { key: 'team_info', label: 'Socios o equipo', value: form.team_info },
          ],
        },
        {
          title: '7. Contenido multimedia',
          fields: [
            { key: 'photo_count', label: 'Fotos', value: `${projectPhotos.length} photo(s) uploaded` },
            { key: 'video_count', label: 'Videos', value: `${projectVideos.length} video(s) uploaded` },
          ],
        },
        {
          title: '8. Extra',
          fields: [
            { key: 'testimonials', label: 'Testimonios de clientes', value: form.testimonials },
            { key: 'achievements', label: 'Logros', value: form.achievements },
            { key: 'timing_reason', label: 'Por que este es el momento', value: form.timing_reason },
          ],
        },
      ],
      media: {
        photoCount: projectPhotos.length,
        videoCount: projectVideos.length,
      },
    }),
    [form, projectPhotos.length, projectVideos.length]
  );

  const promptText = useMemo(
    () =>
      promptJson.sections
        .map((section) => {
          const lines = section.fields.map(
            (field) => `${field.key}: ${field.value.replace(/\s+/g, ' ').trim() || 'Not provided'}`
          );
          return `${section.title}\n${lines.join('\n')}`;
        })
        .join('\n\n'),
    [promptJson]
  );

  const profileName = useMemo(() => {
    const name = `${profile?.name ?? ''} ${profile?.surname ?? ''}`.trim();
    return name || firstSentence(form.founder_info) || `${form.business_name} founder`;
  }, [form.business_name, form.founder_info, profile?.name, profile?.surname]);

  const validateStep = useCallback(
    (targetStep: number) => {
      const missing = requiredByStep[targetStep].find((field) => !form[field].trim());
      if (missing) {
        setStatus('Completa todos los campos requeridos de esta seccion.');
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

  const validateAll = () => {
    for (let index = 0; index < requiredByStep.length; index += 1) {
      const missing = requiredByStep[index].find((field) => !form[field].trim());
      if (missing) {
        setStepIndex(index);
        setStatus('Completa todos los campos requeridos antes de finalizar.');
        return false;
      }
    }

    if (projectPhotos.length < 5) {
      setStepIndex(6);
      setStatus('Sube minimo 5 fotos para que la publicacion pueda destacar.');
      return false;
    }

    if (moneyNumber(form.capital_needed) <= 0) {
      setStepIndex(3);
      setStatus('Agrega un monto de capital valido.');
      return false;
    }

    if (moneyNumber(form.investment_offer) < 0) {
      setStepIndex(3);
      setStatus('Agrega una tasa de interes valida.');
      return false;
    }

    return true;
  };

  const onPickPhotos = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.length > 12) {
      setStatus('Puedes subir maximo 12 fotos.');
      return;
    }

    try {
      const urls = await Promise.all(selected.slice(0, 12).map(fileToDataUrl));
      setProjectPhotos(urls);
      setReview(null);
      setStatus('');
    } catch (error) {
      setStatus(`No pudimos leer las imagenes: ${getErrorMessage(error)}`);
    }
  };

  const onPickVideos = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.length > 2) {
      setStatus('Puedes subir maximo 2 videos.');
      return;
    }

    try {
      const urls = await Promise.all(selected.slice(0, 2).map(fileToDataUrl));
      setProjectVideos(urls);
      setReview(null);
      setStatus('');
    } catch (error) {
      setStatus(`No pudimos leer los videos: ${getErrorMessage(error)}`);
    }
  };

  const finalizePrompt = async () => {
    if (!user?.id || hasExistingProject || checkingProject) return;
    if (!validateAll()) return;

    setFinalizing(true);
    setStatus('');

    try {
      const { data, error } = await createCurrentUserPublicationPrompt(getAccessToken, {
        promptJson,
        promptText,
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
      setStatus('Revisa la publicacion optimizada antes de publicarla.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setStatus(`No pudimos preparar la publicacion: ${getErrorMessage(error)}`);
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
      video_url: projectVideos[0] ?? null,
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
          video_count: projectVideos.length,
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
      setStatus(`No pudimos publicar el emprendimiento: ${error}`);
      setPublishing(false);
      return;
    }

    setStatus('Emprendimiento publicado y visible en el marketplace.');
    setPublishing(false);
    router.push('/feed');
  };

  const renderStep = () => {
    switch (stepIndex) {
      case 0:
        return (
          <div className="flex flex-col gap-4">
            <TextInput
              label="Nombre del negocio"
              value={form.business_name}
              onChange={(value) => updateForm('business_name', value)}
              placeholder="Cafe Aurora"
            />
            <TextInput
              label="Direccion"
              value={form.location}
              onChange={(value) => updateForm('location', value)}
              placeholder="Calle, ciudad, pais"
            />
            <SelectField
              label="En que industria estas"
              value={form.industry}
              onChange={(value) => updateForm('industry', value)}
              options={SECTOR_OPTIONS_ENGLISH}
              placeholder="Selecciona una categoria"
            />
            <SelectField
              label="Hace cuanto operas"
              value={form.time_operating}
              onChange={(value) => updateForm('time_operating', value)}
              options={OPERATING_TIME_OPTIONS}
              placeholder="Selecciona una opcion"
            />
            <SelectField
              label="Es un negocio registrado"
              value={form.business_stage}
              onChange={(value) => updateForm('business_stage', value)}
              options={REGISTRATION_OPTIONS}
              placeholder="Selecciona si o no"
            />
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col gap-4">
            <TextArea
              label="Que vendes exactamente"
              value={form.product_description}
              onChange={(value) => updateForm('product_description', value)}
              placeholder="Describe el producto o servicio de forma concreta."
            />
            <TextArea
              label="Que problema resuelves"
              value={form.problem_solved}
              onChange={(value) => updateForm('problem_solved', value)}
              placeholder="Cuenta el dolor real del cliente y como lo solucionas."
            />
            <TextArea
              label="Por que tu negocio es diferente o mejor que otros"
              value={form.differentiation}
              onChange={(value) => updateForm('differentiation', value)}
              helper="Evita respuestas genericas tipo calidad y buen servicio."
            />
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col gap-4">
            <div className="rounded-[24px] border border-[#E7ECF4] bg-[#FAF9FF] px-4 py-4 text-xs leading-5 text-[#667085]">
              Mientras mas especifico seas, mejor: evita frases como vendemos mucho. Un buen ejemplo seria:
              $12,000 USD mensuales con crecimiento del 18% en 3 meses.
            </div>
            <TextInput
              label="Ventas mensuales actuales"
              value={form.monthly_revenue}
              onChange={(value) => updateForm('monthly_revenue', value)}
              placeholder="$12,000 USD"
            />
            <TextInput
              label="Ticket promedio por cliente"
              value={form.avg_ticket}
              onChange={(value) => updateForm('avg_ticket', value)}
              placeholder="$45 USD"
            />
            <TextInput
              label="Numero de clientes al mes"
              value={form.monthly_customers}
              onChange={(value) => updateForm('monthly_customers', value)}
              type="number"
              placeholder="320"
            />
            <TextInput
              label="Estas creciendo? si/no + % aproximado"
              value={form.growth_rate}
              onChange={(value) => updateForm('growth_rate', value)}
              placeholder="Si, 18% en los ultimos 3 meses"
            />
            <TextInput
              label="Social media"
              value={form.social_media}
              onChange={(value) => updateForm('social_media', value)}
              placeholder="@negocio, Instagram, TikTok, web o links"
            />
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col gap-4">
            <TextInput
              label="Cuanto capital necesitas levantar"
              value={form.capital_needed}
              onChange={(value) => updateForm('capital_needed', value)}
              type="number"
              placeholder="50000"
            />
            <TextArea
              label="En que usaras el dinero"
              value={form.funds_usage}
              onChange={(value) => updateForm('funds_usage', value)}
              placeholder="Ej: 45% inventario, 30% maquinaria, 25% marketing."
            />
            <TextInput
              label="Que tasa de interes ofreces anual"
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
              label="Quien es tu cliente ideal"
              value={form.target_customer}
              onChange={(value) => updateForm('target_customer', value)}
            />
            <TextArea
              label="Que tan grande es el mercado"
              value={form.market_size}
              onChange={(value) => updateForm('market_size', value)}
              placeholder="Puede ser estimado."
            />
            <TextArea
              label="Hay competencia? Que te diferencia o haces mejor"
              value={form.competition}
              onChange={(value) => updateForm('competition', value)}
            />
          </div>
        );
      case 5:
        return (
          <div className="flex flex-col gap-4">
            <TextArea
              label="Quien eres tu"
              value={form.founder_info}
              onChange={(value) => updateForm('founder_info', value)}
              placeholder="Experiencia breve."
            />
            <TextArea
              label="Tienes socios o equipo"
              value={form.team_info}
              onChange={(value) => updateForm('team_info', value)}
              placeholder="Roles y responsabilidades."
            />
          </div>
        );
      case 6:
        return (
          <div className="flex flex-col gap-4">
            <div className="rounded-[24px] border border-[#E7ECF4] bg-[#FAF9FF] px-4 py-4 text-xs leading-5 text-[#667085]">
              Para que la publicacion destaque, sube minimo 5 fotos. Lo ideal es mostrar producto,
              local, proceso, clientes y branding.
            </div>
            <div className="rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 shadow-[0_14px_28px_rgba(31,38,64,0.05)]">
              <p className="text-sm font-semibold text-[#1C2336]">Fotos</p>
              <p className="mt-1 text-xs leading-5 text-[#7B879C]">Minimo 5, ideal 8-12.</p>
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
                Subir imagenes
              </button>
              {projectPhotos.length ? (
                <p className="mt-3 text-xs font-semibold text-[#6B39F4]">
                  {projectPhotos.length} foto(s) cargadas
                </p>
              ) : null}
            </div>
            <div className="rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 shadow-[0_14px_28px_rgba(31,38,64,0.05)]">
              <p className="text-sm font-semibold text-[#1C2336]">Video</p>
              <p className="mt-1 text-xs leading-5 text-[#7B879C]">
                Recomendado 1-2 videos de 30-60 segundos.
              </p>
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
                Subir videos
              </button>
              {projectVideos.length ? (
                <p className="mt-3 text-xs font-semibold text-[#6B39F4]">
                  {projectVideos.length} video(s) cargados
                </p>
              ) : null}
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col gap-4">
            <TextArea
              label="Testimonios de clientes"
              value={form.testimonials}
              onChange={(value) => updateForm('testimonials', value)}
              placeholder="Opcional."
            />
            <TextArea
              label="Logros"
              value={form.achievements}
              onChange={(value) => updateForm('achievements', value)}
              placeholder="Ventas, premios, prensa, alianzas o hitos."
            />
            <TextArea
              label="Por que este es el momento"
              value={form.timing_reason}
              onChange={(value) => updateForm('timing_reason', value)}
              placeholder="Opcional: explica por que levantar capital ahora aumenta la oportunidad."
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
              Esta pagina esta disponible para perfiles emprendedores.
            </SectionSurface>
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      {(finalizing || publishing) ? <LoadingOverlay label={finalizing ? 'Enviando...' : 'Publicando...'} /> : null}

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
              Completa cada seccion y revisa la version optimizada antes de publicarla.
            </p>
          </header>

          {checkingProject ? (
            <SectionSurface className="text-sm text-[#667085]">Checking your current business...</SectionSurface>
          ) : null}

          {!checkingProject && hasExistingProject ? (
            <SectionSurface className="text-sm leading-6 text-[#667085]">
              Ya tienes un emprendimiento publicado. Puedes editarlo desde portfolio; la regla es un proyecto
              por emprendedor.
              <button
                type="button"
                onClick={() => router.push('/portfolio')}
                className={`${primaryButtonClassName} mt-4 w-full`}
              >
                Ir a portfolio
              </button>
            </SectionSurface>
          ) : null}

          {!hasExistingProject && review ? (
            <SectionSurface>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                    Revisar publicacion
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#1C2336]">
                    {review.optimizedPublication.title || `${form.business_name} investment opportunity`}
                  </h2>
                  {review.optimizedPublication.summary ? (
                    <p className="mt-2 text-sm leading-6 text-[#667085]">
                      {review.optimizedPublication.summary}
                    </p>
                  ) : null}
                </div>

                {review.optimizedPublication.description ? (
                  <div className="rounded-[24px] border border-[#EBEEF7] bg-white px-4 py-4 text-sm leading-6 text-[#4F5B76] shadow-[0_14px_28px_rgba(31,38,64,0.05)]">
                    {review.optimizedPublication.description}
                  </div>
                ) : null}

                {review.optimizedPublication.highlights?.length ? (
                  <div className="grid gap-2">
                    {review.optimizedPublication.highlights.slice(0, 4).map((item) => (
                      <div
                        key={item}
                        className="rounded-[18px] border border-[#ECEFFD] bg-[#FBFAFF] px-4 py-3 text-xs font-semibold leading-5 text-[#596277]"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReview(null)}
                    disabled={publishing}
                    className={secondaryButtonClassName}
                  >
                    Editar datos
                  </button>
                  <button
                    type="button"
                    onClick={publishProject}
                    disabled={publishing}
                    className={primaryButtonClassName}
                  >
                    Publicar
                  </button>
                </div>
              </div>
            </SectionSurface>
          ) : null}

          {!hasExistingProject && !review ? (
            <SectionSurface>
              <div className="mb-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">
                      Paso {stepIndex + 1} de {steps.length}
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
                  disabled={stepIndex === 0 || finalizing}
                  className={secondaryButtonClassName}
                >
                  Anterior
                </button>
                {stepIndex === steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={finalizePrompt}
                    disabled={finalizing || checkingProject}
                    className={primaryButtonClassName}
                  >
                    Finalizar
                  </button>
                ) : (
                  <button type="button" onClick={goNext} className={primaryButtonClassName}>
                    Siguiente
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

      <BottomNav />
    </>
  );
}
