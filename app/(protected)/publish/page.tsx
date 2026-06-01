'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { AnimatePresence, motion } from 'framer-motion';
import Lottie from 'lottie-react';
import dayjs, { type Dayjs } from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import BottomNav from '@/components/BottomNav';
import { DesktopAppShell, DesktopSectionCard } from '@/components/DesktopAppShell';
import publishAddressStepAnimation from '@/components/animations/publish-address-step1.json';
import publishStep4NameAnimation from '@/components/animations/publish-step4-name.json';
import publishStep10MediaAnimation from '@/components/animations/publish-step10-media.json';
import publishStep17PublishingAnimation from '@/components/animations/publish-step17-publishing.json';
import publishStep18SuccessAnimation from '@/components/animations/publish-step18-success.json';
import publishStep14FinishAnimation from '@/components/animations/publish-step14-finish.json';
import publishStep2Animation from '@/components/animations/publish-step2.json';
import publishStep6Animation from '@/components/animations/publish-step6.json';
import PageBackButton from '@/components/PageBackButton';
import { useInvestApp } from '@/lib/investapp-context';
import {
  createCurrentUserPublicationPrompt,
  fetchCurrentUserPublicationDraft,
  type OptimizedPublication,
  saveCurrentUserPublicationDraft,
} from '@/utils/client/current-user-publication-prompts';
import { fetchCurrentUserProjects } from '@/utils/client/current-user-projects';
import {
  reverseBusinessAddress,
  searchBusinessAddress,
  type BusinessAddressRecord,
} from '@/utils/client/publish-address-geocoding';
import type { ProjectRecord } from '@/utils/projects/shared';

type AddressSource = 'manual_search' | 'use_my_location' | 'manual_edit' | '';

type PublishAddressStepFields = {
  country: string;
  unit: string;
  street_address: string;
  locality: string;
  state: string;
  postcode: string;
  formatted_address: string;
  latitude: number | null;
  longitude: number | null;
  source: AddressSource;
};

type BusinessCategory = {
  id: string;
  label: string;
};

type UploadMediaItem = {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  type: 'photo' | 'video';
};

type ProgressStepStatus = 'completed' | 'current' | 'upcoming';

type ProgressStep = {
  title: string;
  description: string;
};

const desktopFontFamily = '"Sora", "Manrope", "Avenir Next", "Segoe UI", sans-serif';

const emptyAddress: PublishAddressStepFields = {
  country: '',
  unit: '',
  street_address: '',
  locality: '',
  state: '',
  postcode: '',
  formatted_address: '',
  latitude: null,
  longitude: null,
  source: '',
};

const requiredAddressKeys: Array<keyof PublishAddressStepFields> = [
  'country',
  'street_address',
  'locality',
  'state',
  'postcode',
  'formatted_address',
];

const publishProgressSteps: ProgressStep[] = [
  {
    title: 'Business setup',
    description: 'Address, category, name, and operating stage',
  },
  {
    title: 'Financial profile',
    description: 'Performance and investment round details',
  },
  {
    title: 'Media upload',
    description: 'Add photos and videos for your listing',
  },
  {
    title: 'AI copy',
    description: 'Review and edit generated title and description',
  },
  {
    title: 'Review & publish',
    description: 'Finalize compliance details and go live',
  },
];

const mobileSurfaceClassName =
  'rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-[0_22px_52px_rgba(17,24,39,0.08)] backdrop-blur-sm';

const inputClassName =
  'w-full rounded-2xl border border-[#D8E2EC] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2E7CF6] focus:ring-4 focus:ring-[#2E7CF6]/10';

const mediaImageMaxDimension = 1600;
const mediaImageWebpQuality = 0.82;

const toWebpFileName = (name: string) => {
  const baseName = name.replace(/\.[^/.]+$/, '');
  return `${baseName || 'business-media'}.webp`;
};

const compressImageToWebp = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/') || file.type === 'image/webp') return file;

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('Could not load selected image.'));
      nextImage.src = objectUrl;
    });

    const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = largestSide > mediaImageMaxDimension ? mediaImageMaxDimension / largestSide : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', mediaImageWebpQuality);
    });

    if (!blob) return file;

    return new File([blob], toWebpFileName(file.name), {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const businessCategories: BusinessCategory[] = [
  { id: 'technology', label: 'Technology' },
  { id: 'health_wellness', label: 'Health & Wellness' },
  { id: 'finance_insurance', label: 'Finance & Insurance' },
  { id: 'education', label: 'Education' },
  { id: 'food_gastronomy', label: 'Food & Gastronomy' },
  { id: 'retail', label: 'Retail' },
  { id: 'real_estate', label: 'Real Estate' },
  { id: 'transport_logistics', label: 'Transport & Logistics' },
  { id: 'entertainment_media', label: 'Entertainment & Media' },
  { id: 'construction_architecture', label: 'Construction & Architecture' },
  { id: 'professional_services', label: 'Professional Services' },
  { id: 'manufacturing_industry', label: 'Manufacturing & Industry' },
  { id: 'agriculture_livestock', label: 'Agriculture & Livestock' },
  { id: 'fashion_beauty', label: 'Fashion & Beauty' },
  { id: 'tourism_hospitality', label: 'Tourism & Hospitality' },
];

const operatingTimeOptions = [
  '< 5 months',
  '5 months - 1 year',
  '1 - 3 years',
  '> 5 years',
] as const;

const complianceChecklistOptions = [
  'Confirmation the company is legally registered (NIF/CUIT/RUC, registration number)',
  'Legal structure: corporation, limited company, S.R.L., etc.',
  'Company bylaws or incorporation deed',
  'Licenses, permits, and certifications required for your industry',
  'Registered intellectual property (patents, trademarks, copyrights)',
  'Audited financial statements (balance sheet, P&L, cash flow)',
  'Sales history, margins, and profitability',
  'Financial projections (3-5 years)',
] as const;

const isAddressValid = (address: PublishAddressStepFields) =>
  requiredAddressKeys.every((key) => String(address[key]).trim().length > 0);

function BusinessCategoryIcon({ id }: { id: string }) {
  const commonProps = {
    className: 'h-5 w-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  };

  switch (id) {
    case 'technology':
      return (
        <svg {...commonProps}>
          <rect x="4" y="5" width="16" height="11" rx="2" />
          <path d="M9 20h6" />
          <path d="M12 16v4" />
        </svg>
      );
    case 'health_wellness':
      return (
        <svg {...commonProps}>
          <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z" />
          <path d="M9 12h6" />
          <path d="M12 9v6" />
        </svg>
      );
    case 'finance_insurance':
      return (
        <svg {...commonProps}>
          <path d="M4 10h16" />
          <path d="M5 18h14" />
          <path d="M6 10v8" />
          <path d="M10 10v8" />
          <path d="M14 10v8" />
          <path d="M18 10v8" />
          <path d="M12 4 4 8h16l-8-4Z" />
        </svg>
      );
    case 'education':
      return (
        <svg {...commonProps}>
          <path d="M3 8 12 4l9 4-9 4-9-4Z" />
          <path d="M7 10v5c2.8 2 7.2 2 10 0v-5" />
          <path d="M21 8v6" />
        </svg>
      );
    case 'food_gastronomy':
      return (
        <svg {...commonProps}>
          <path d="M7 4v16" />
          <path d="M4 4v5a3 3 0 0 0 6 0V4" />
          <path d="M17 4v16" />
          <path d="M17 4c2 1 3 3 3 6v2h-3" />
        </svg>
      );
    case 'retail':
      return (
        <svg {...commonProps}>
          <path d="M6 9h12l-1 11H7L6 9Z" />
          <path d="M9 9a3 3 0 0 1 6 0" />
          <path d="M5 9h14" />
        </svg>
      );
    case 'real_estate':
      return (
        <svg {...commonProps}>
          <path d="M4 11 12 4l8 7" />
          <path d="M6 10v10h12V10" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    case 'transport_logistics':
      return (
        <svg {...commonProps}>
          <path d="M3 7h11v10H3V7Z" />
          <path d="M14 11h4l3 3v3h-7v-6Z" />
          <circle cx="7" cy="18" r="1.7" />
          <circle cx="17" cy="18" r="1.7" />
        </svg>
      );
    case 'entertainment_media':
      return (
        <svg {...commonProps}>
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="m10 10 5 2-5 2v-4Z" />
          <path d="M8 4v4" />
          <path d="M16 4v4" />
        </svg>
      );
    case 'construction_architecture':
      return (
        <svg {...commonProps}>
          <path d="M4 20h16" />
          <path d="M6 20V8l6-4 6 4v12" />
          <path d="M9 20v-6h6v6" />
          <path d="M9 10h6" />
        </svg>
      );
    case 'professional_services':
      return (
        <svg {...commonProps}>
          <rect x="4" y="8" width="16" height="11" rx="2" />
          <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <path d="M4 13h16" />
        </svg>
      );
    case 'manufacturing_industry':
      return (
        <svg {...commonProps}>
          <path d="M4 20V9l5 3V9l5 3V7h6v13H4Z" />
          <path d="M8 16h1" />
          <path d="M12 16h1" />
          <path d="M16 16h1" />
        </svg>
      );
    case 'agriculture_livestock':
      return (
        <svg {...commonProps}>
          <path d="M12 20V10" />
          <path d="M12 14c-4 0-6-2-7-6 4 0 6 2 7 6Z" />
          <path d="M12 12c4 0 6-2 7-6-4 0-6 2-7 6Z" />
          <path d="M5 20h14" />
        </svg>
      );
    case 'fashion_beauty':
      return (
        <svg {...commonProps}>
          <path d="M8 4h8l2 5-3 2v9H9v-9L6 9l2-5Z" />
          <path d="M10 4c0 2 4 2 4 0" />
          <path d="M9 14h6" />
        </svg>
      );
    case 'tourism_hospitality':
      return (
        <svg {...commonProps}>
          <path d="M3 11h18" />
          <path d="M5 11l3 8" />
          <path d="M19 11l-3 8" />
          <path d="M8 11a4 4 0 0 1 8 0" />
          <path d="M12 3v4" />
        </svg>
      );
    default:
      return <span className="text-xs font-semibold">{id.slice(0, 1).toUpperCase()}</span>;
  }
}

const normalizeDraftAddress = (value: unknown): PublishAddressStepFields => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyAddress;
  const source = value as Record<string, unknown>;

  return {
    country: typeof source.country === 'string' ? source.country : '',
    unit: typeof source.unit === 'string' ? source.unit : '',
    street_address: typeof source.street_address === 'string' ? source.street_address : '',
    locality: typeof source.locality === 'string' ? source.locality : '',
    state: typeof source.state === 'string' ? source.state : '',
    postcode: typeof source.postcode === 'string' ? source.postcode : '',
    formatted_address:
      typeof source.formatted_address === 'string' ? source.formatted_address : '',
    latitude: typeof source.latitude === 'number' ? source.latitude : null,
    longitude: typeof source.longitude === 'number' ? source.longitude : null,
    source:
      source.source === 'manual_search' ||
      source.source === 'use_my_location' ||
      source.source === 'manual_edit'
        ? source.source
        : '',
  };
};

const toAddressFromGeocode = (
  record: BusinessAddressRecord,
  source: Exclude<AddressSource, ''>
): PublishAddressStepFields => ({
  country: record.country,
  unit: record.unit,
  street_address: record.street_address,
  locality: record.locality,
  state: record.state,
  postcode: record.postcode,
  formatted_address: record.formatted_address,
  latitude: record.latitude,
  longitude: record.longitude,
  source,
});

const buildDraftPayload = (fields: PublishAddressStepFields) => {
  const promptJson = {
    version: 1,
    locale: 'en',
    step: 'business_address_v1',
    createdAt: new Date().toISOString(),
    fields,
  };

  const promptText = [
    'Business address step',
    `formatted_address: ${fields.formatted_address || 'not_provided'}`,
    `country: ${fields.country || 'not_provided'}`,
    `unit: ${fields.unit || 'not_provided'}`,
    `street_address: ${fields.street_address || 'not_provided'}`,
    `locality: ${fields.locality || 'not_provided'}`,
    `state: ${fields.state || 'not_provided'}`,
    `postcode: ${fields.postcode || 'not_provided'}`,
    `latitude: ${fields.latitude ?? 'not_provided'}`,
    `longitude: ${fields.longitude ?? 'not_provided'}`,
    `source: ${fields.source || 'not_provided'}`,
  ].join('\n');

  return {
    promptJson,
    promptText,
    metadata: {
      step: 'business_address_v1',
      completion: isAddressValid(fields) ? 'ready_for_next' : 'in_progress',
      labels: Object.keys(fields),
    },
  };
};

const isStepInRange = (value: number): value is 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 =>
  Number.isInteger(value) && value >= 1 && value <= 18;

function RoleRestrictedState() {
  return (
    <>
      <DesktopAppShell
        title="Publish project"
        subtitle="This area is available only for entrepreneur profiles."
        eyebrow="Access"
        maxWidthClassName="max-w-none"
      >
        <DesktopSectionCard title="Entrepreneur-only workspace">
          <p className="text-sm leading-6 text-[#66728A]">
            Switch to entrepreneur profile mode to access the new step-by-step publication flow.
          </p>
        </DesktopSectionCard>
      </DesktopAppShell>

      <main className="min-h-screen bg-[linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_100%)] px-4 pb-32 pt-8 text-[#101828] lg:hidden">
        <div className="mx-auto w-full max-w-md">
          <PageBackButton fallbackHref="/feed" label="Back" />
          <section className={`${mobileSurfaceClassName} mt-4`}>
            <p className="text-sm leading-6 text-[#667085]">
              This area is available only for entrepreneur profiles.
            </p>
          </section>
        </div>
      </main>

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </>
  );
}

export default function PublishPage() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado } = useInvestApp();

  const [checkingProject, setCheckingProject] = useState(true);
  const [hasExistingProject, setHasExistingProject] = useState(false);

  const [status, setStatus] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const [address, setAddress] = useState<PublishAddressStepFields>(emptyAddress);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BusinessAddressRecord[]>([]);
  const [geolocationLoading, setGeolocationLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18>(1);
  const [selectedBusinessCategory, setSelectedBusinessCategory] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [selectedOperatingTime, setSelectedOperatingTime] = useState<string>('');
  const [businessOffer, setBusinessOffer] = useState<string>('');
  const [businessDifferentiator, setBusinessDifferentiator] = useState<string>('');
  const [monthlySales, setMonthlySales] = useState<string>('');
  const [averageTicket, setAverageTicket] = useState<string>('');
  const [monthlyClients, setMonthlyClients] = useState<string>('');
  const [capitalRequiredUsd, setCapitalRequiredUsd] = useState<string>('');
  const [fundUsage, setFundUsage] = useState<string>('');
  const [interestRateEA, setInterestRateEA] = useState<string>('');
  const [roundCloseDate, setRoundCloseDate] = useState<string>('');
  const [aboutFounder, setAboutFounder] = useState<string>('');
  const [aboutTeam, setAboutTeam] = useState<string>('');
  const [businessAchievements, setBusinessAchievements] = useState<string>('');
  const roundCloseDateValue = useMemo<Dayjs | null>(
    () => (roundCloseDate ? dayjs(roundCloseDate) : null),
    [roundCloseDate],
  );
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [pendingMediaItems, setPendingMediaItems] = useState<UploadMediaItem[]>([]);
  const [uploadedMediaItems, setUploadedMediaItems] = useState<UploadMediaItem[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);
  const [isGeneratingPublication, setIsGeneratingPublication] = useState(false);
  const [generatedPublication, setGeneratedPublication] = useState<OptimizedPublication | null>(null);
  const [generatedTittle, setGeneratedTittle] = useState<string>('');
  const [generatedDescription, setGeneratedDescription] = useState<string>('');
  const [complianceSelections, setComplianceSelections] = useState<string[]>([]);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showSuccessHomeButton, setShowSuccessHomeButton] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const canContinueStep1 = useMemo(
    () =>
      isAddressValid(address) && !checkingProject && !hasExistingProject && !savingDraft,
    [address, checkingProject, hasExistingProject, savingDraft]
  );

  const canContinueStep2 = useMemo(
    () => !checkingProject && !hasExistingProject && !savingDraft,
    [checkingProject, hasExistingProject, savingDraft]
  );

  const canContinueStep3 = useMemo(
    () =>
      selectedBusinessCategory.trim().length > 0 &&
      !checkingProject &&
      !hasExistingProject &&
      !savingDraft,
    [selectedBusinessCategory, checkingProject, hasExistingProject, savingDraft]
  );

  const canContinueStep4 = useMemo(
    () =>
      businessName.trim().length > 0 &&
      !checkingProject &&
      !hasExistingProject &&
      !savingDraft,
    [businessName, checkingProject, hasExistingProject, savingDraft]
  );

  const canContinueStep5 = useMemo(
    () =>
      selectedOperatingTime.trim().length > 0 &&
      !checkingProject &&
      !hasExistingProject &&
      !savingDraft,
    [selectedOperatingTime, checkingProject, hasExistingProject, savingDraft]
  );

  const canContinueStep6 = useMemo(
    () => !checkingProject && !hasExistingProject && !savingDraft,
    [checkingProject, hasExistingProject, savingDraft]
  );

  const canContinueStep7 = useMemo(
    () =>
      businessOffer.trim().length > 0 &&
      businessDifferentiator.trim().length > 0 &&
      Number(monthlySales) > 0 &&
      Number(averageTicket) > 0 &&
      Number(monthlyClients) > 0 &&
      !checkingProject &&
      !hasExistingProject &&
      !savingDraft,
    [
      businessOffer,
      businessDifferentiator,
      monthlySales,
      averageTicket,
      monthlyClients,
      checkingProject,
      hasExistingProject,
      savingDraft,
    ]
  );

  const canContinueStep8 = useMemo(
    () =>
      Number(capitalRequiredUsd) > 0 &&
      fundUsage.trim().length > 0 &&
      Number(interestRateEA) > 0 &&
      roundCloseDate.trim().length > 0 &&
      !checkingProject &&
      !hasExistingProject &&
      !savingDraft,
    [
      capitalRequiredUsd,
      fundUsage,
      interestRateEA,
      roundCloseDate,
      checkingProject,
      hasExistingProject,
      savingDraft,
    ]
  );

  const canContinueStep9 = useMemo(
    () =>
      aboutFounder.trim().length > 0 &&
      aboutTeam.trim().length > 0 &&
      businessAchievements.trim().length > 0 &&
      !checkingProject &&
      !hasExistingProject &&
      !savingDraft,
    [
      aboutFounder,
      aboutTeam,
      businessAchievements,
      checkingProject,
      hasExistingProject,
      savingDraft,
    ]
  );

  const mediaCounts = useMemo(
    () =>
      uploadedMediaItems.reduce(
        (totals, item) => {
          if (item.type === 'video') {
            totals.videos += 1;
          } else {
            totals.photos += 1;
          }
          return totals;
        },
        { photos: 0, videos: 0 }
      ),
    [uploadedMediaItems]
  );

  const canContinueStep10 = useMemo(
    () => !checkingProject && !hasExistingProject && !savingDraft,
    [checkingProject, hasExistingProject, savingDraft]
  );

  const canContinueStep11 = useMemo(
    () =>
      mediaCounts.photos >= 5 &&
      mediaCounts.videos >= 1 &&
      !checkingProject &&
      !hasExistingProject &&
      !savingDraft &&
      !isUploadingMedia,
    [mediaCounts, checkingProject, hasExistingProject, savingDraft, isUploadingMedia]
  );

  const canContinueStep12 = useMemo(
    () =>
      generatedTittle.trim().length > 0 &&
      generatedTittle.trim().length <= 50 &&
      !checkingProject &&
      !hasExistingProject &&
      !savingDraft &&
      !isGeneratingPublication,
    [generatedTittle, checkingProject, hasExistingProject, savingDraft, isGeneratingPublication]
  );

  const canContinueStep13 = useMemo(
    () =>
      generatedDescription.trim().length > 0 &&
      generatedDescription.trim().length <= 500 &&
      !checkingProject &&
      !hasExistingProject &&
      !savingDraft &&
      !isGeneratingPublication,
    [
      generatedDescription,
      checkingProject,
      hasExistingProject,
      savingDraft,
      isGeneratingPublication,
    ]
  );

  const canContinueStep14 = useMemo(
    () => !checkingProject && !hasExistingProject && !savingDraft,
    [checkingProject, hasExistingProject, savingDraft]
  );

  const canContinueStep15 = useMemo(
    () =>
      complianceSelections.length > 0 &&
      !checkingProject &&
      !hasExistingProject &&
      !savingDraft,
    [complianceSelections, checkingProject, hasExistingProject, savingDraft]
  );

  const canContinueStep16 = useMemo(
    () => !checkingProject && !hasExistingProject && !savingDraft,
    [checkingProject, hasExistingProject, savingDraft]
  );

  const previewPhotos = useMemo(
    () => uploadedMediaItems.filter((item) => item.type === 'photo'),
    [uploadedMediaItems]
  );

  const previewVideo = useMemo(
    () => uploadedMediaItems.find((item) => item.type === 'video') ?? null,
    [uploadedMediaItems]
  );

  const registeredWhatsappNumber = useMemo(() => {
    const fromUser =
      (user as { phone?: { number?: string } } | null)?.phone?.number ||
      (user as { phoneNumber?: string } | null)?.phoneNumber ||
      '';
    return String(fromUser).replace(/[^\d+]/g, '');
  }, [user]);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    let active = true;

    const loadState = async () => {
      if (!user?.id || rolSeleccionado !== 'emprendedor') {
        if (active) {
          setCheckingProject(false);
          setHasExistingProject(false);
          setStatus('');
        }
        return;
      }

      if (active) {
        setCheckingProject(true);
        setStatus('');
      }

      const [projectsResponse, draftResponse] = await Promise.all([
        fetchCurrentUserProjects(getAccessToken),
        fetchCurrentUserPublicationDraft(getAccessToken),
      ]);

      if (!active) return;

      if (projectsResponse.error) {
        setStatus('Could not verify your current project state right now.');
        setHasExistingProject(false);
      } else {
        setHasExistingProject(((projectsResponse.data ?? []) as ProjectRecord[]).length > 0);
      }

      if (!draftResponse.error && draftResponse.data) {
        const promptJson = draftResponse.data.promptJson;
        if (promptJson && typeof promptJson === 'object' && !Array.isArray(promptJson)) {
          const source = promptJson as { fields?: unknown; step_index?: unknown };
          const fields =
            source.fields && typeof source.fields === 'object' && !Array.isArray(source.fields)
              ? (source.fields as Record<string, unknown>)
              : {};
          setAddress(normalizeDraftAddress(fields));
          setSelectedBusinessCategory(typeof fields.business_category === 'string' ? fields.business_category : '');
          setBusinessName(typeof fields.business_name === 'string' ? fields.business_name : '');
          setSelectedOperatingTime(typeof fields.operating_time === 'string' ? fields.operating_time : '');
          setBusinessOffer(typeof fields.offer_summary === 'string' ? fields.offer_summary : '');
          setBusinessDifferentiator(
            typeof fields.competitive_edge === 'string' ? fields.competitive_edge : ''
          );
          setMonthlySales(typeof fields.monthly_sales === 'string' ? fields.monthly_sales : '');
          setAverageTicket(typeof fields.average_ticket === 'string' ? fields.average_ticket : '');
          setMonthlyClients(typeof fields.monthly_clients === 'string' ? fields.monthly_clients : '');
          setCapitalRequiredUsd(
            typeof fields.capital_required_usd === 'string' ? fields.capital_required_usd : ''
          );
          setFundUsage(typeof fields.funds_usage === 'string' ? fields.funds_usage : '');
          setInterestRateEA(typeof fields.interest_rate_ea === 'string' ? fields.interest_rate_ea : '');
          setRoundCloseDate(typeof fields.round_close_date === 'string' ? fields.round_close_date : '');
          setAboutFounder(typeof fields.founder_profile === 'string' ? fields.founder_profile : '');
          setAboutTeam(typeof fields.team_profile === 'string' ? fields.team_profile : '');
          setBusinessAchievements(
            typeof fields.business_achievements === 'string' ? fields.business_achievements : ''
          );
          setGeneratedTittle(typeof fields.generated_tittle === 'string' ? fields.generated_tittle : '');
          setGeneratedDescription(
            typeof fields.generated_description === 'string' ? fields.generated_description : ''
          );
          if (Array.isArray(fields.compliance_items)) {
            setComplianceSelections(
              fields.compliance_items.filter((item): item is string => typeof item === 'string')
            );
          }
          const stepValue = Number(source.step_index);
          if (isStepInRange(stepValue) && stepValue < 17) {
            setCurrentStep(stepValue);
          }
          setDraftId(draftResponse.data.id);
        }
      }

      setCheckingProject(false);
    };

    void loadState();

    return () => {
      active = false;
    };
  }, [getAccessToken, rolSeleccionado, user?.id]);

  useEffect(() => {
    if (!isAddressModalOpen) return;
    if (searchQuery.trim().length < 3) return;

    let active = true;

    const timer = window.setTimeout(async () => {
      const { data, error } = await searchBusinessAddress(searchQuery.trim(), 'en');
      if (!active) return;

      if (error) {
        setStatus(`Address search failed: ${error}`);
        setSearchResults([]);
      } else {
        setSearchResults(data);
      }

      setIsSearching(false);
    }, 360);

    return () => {
      active = false;
      window.clearTimeout(timer);
      setIsSearching(false);
    };
  }, [isAddressModalOpen, searchQuery]);

  useEffect(() => {
    if (!hasInteracted || !user?.id || rolSeleccionado !== 'emprendedor' || hasExistingProject) return;

    const timer = window.setTimeout(async () => {
      setSavingDraft(true);
      const payload = buildDraftPayload(address);
      const { data, error } = await saveCurrentUserPublicationDraft(getAccessToken, {
        id: draftId,
        promptJson: payload.promptJson,
        promptText: payload.promptText,
        metadata: payload.metadata,
      });

      if (error || !data) {
        setStatus(`Could not save address step: ${error ?? 'Unknown error.'}`);
      } else {
        setDraftId(data.id);
      }

      setSavingDraft(false);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [address, draftId, getAccessToken, hasExistingProject, hasInteracted, rolSeleccionado, user?.id]);

  useEffect(
    () => () => {
      [...pendingMediaItems, ...uploadedMediaItems].forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
      });
    },
    [pendingMediaItems, uploadedMediaItems]
  );

  useEffect(() => {
    if (currentStep !== 16 || previewPhotos.length <= 1) return;

    const timer = window.setInterval(() => {
      setActivePhotoIndex((previous) => (previous + 1) % previewPhotos.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [currentStep, previewPhotos.length]);

  useEffect(() => {
    if (currentStep !== 17) return;

    const timer = window.setTimeout(() => {
      setCurrentStep(18);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 18) return;

    const timer = window.setTimeout(() => {
      setShowSuccessHomeButton(true);
    }, 1700);

    return () => window.clearTimeout(timer);
  }, [currentStep]);

  const applyAddressRecord = (record: BusinessAddressRecord, source: Exclude<AddressSource, ''>) => {
    setAddress(toAddressFromGeocode(record, source));
    setSearchQuery(record.formatted_address);
    setStatus('');
    setHasInteracted(true);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation is not available in this browser.');
      return;
    }

    setGeolocationLoading(true);
    setStatus('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const { data, error } = await reverseBusinessAddress(latitude, longitude, 'en');

        if (error || !data) {
          setStatus(`Could not resolve your location: ${error ?? 'Unknown geolocation error.'}`);
        } else {
          applyAddressRecord(data, 'use_my_location');
        }

        setGeolocationLoading(false);
      },
      (error) => {
        setGeolocationLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setStatus('Location permission was denied. Enable it and try again.');
          return;
        }
        setStatus('Could not get your location right now. Please try again.');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
      }
    );
  };

  const updateField = (key: keyof PublishAddressStepFields, value: string) => {
    setAddress((previous) => {
      const next: PublishAddressStepFields = {
        ...previous,
        [key]: value,
      };

      if (key !== 'source') {
        next.source = 'manual_edit';
      }

      return next;
    });
    setHasInteracted(true);
  };

  const handleMediaSelection = async (fileList: FileList | null) => {
    if (!fileList) return;

    const files = Array.from(fileList).filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    const mapped = await Promise.all(
      files.map(async (file) => {
        const type = file.type.startsWith('video/') ? ('video' as const) : ('photo' as const);
        const preparedFile = type === 'photo' ? await compressImageToWebp(file) : file;

        return {
          id: `${preparedFile.name}-${preparedFile.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          file: preparedFile,
          name: preparedFile.name,
          previewUrl: URL.createObjectURL(preparedFile),
          type,
        };
      })
    );

    setPendingMediaItems((previous) => [...previous, ...mapped]);
  };

  const handleRemovePendingMedia = (mediaId: string) => {
    setPendingMediaItems((previous) => {
      const target = previous.find((item) => item.id === mediaId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return previous.filter((item) => item.id !== mediaId);
    });
  };

  const handleUploadPendingMedia = async () => {
    if (pendingMediaItems.length === 0) return;

    setIsMediaModalOpen(false);
    setIsUploadingMedia(true);

    await new Promise((resolve) => {
      window.setTimeout(resolve, 1800);
    });

    const sorted = [...pendingMediaItems].sort((a, b) => {
      if (a.type === b.type) return 0;
      return a.type === 'video' ? -1 : 1;
    });

    setUploadedMediaItems((previous) =>
      [...previous, ...sorted].sort((a, b) => {
        if (a.type === b.type) return 0;
        return a.type === 'video' ? -1 : 1;
      })
    );
    setPendingMediaItems([]);
    setIsUploadingMedia(false);
  };

  const handleDragStartMedia = (mediaId: string) => {
    setDraggedMediaId(mediaId);
  };

  const handleDropMedia = (targetId: string) => {
    if (!draggedMediaId || draggedMediaId === targetId) return;

    setUploadedMediaItems((previous) => {
      const fromIndex = previous.findIndex((item) => item.id === draggedMediaId);
      const toIndex = previous.findIndex((item) => item.id === targetId);

      if (fromIndex === -1 || toIndex === -1) return previous;

      const next = [...previous];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });

    setDraggedMediaId(null);
  };

  const buildPublicationFields = () => ({
    business_name: businessName.trim(),
    business_address: address.formatted_address.trim(),
    business_category: selectedBusinessCategory.trim(),
    operating_time: selectedOperatingTime.trim(),
    offer_summary: businessOffer.trim(),
    competitive_edge: businessDifferentiator.trim(),
    monthly_sales: monthlySales.trim(),
    average_ticket: averageTicket.trim(),
    monthly_clients: monthlyClients.trim(),
    capital_required_usd: capitalRequiredUsd.trim(),
    funds_usage: fundUsage.trim(),
    interest_rate_ea: interestRateEA.trim(),
    round_close_date: roundCloseDate.trim(),
    founder_profile: aboutFounder.trim(),
    team_profile: aboutTeam.trim(),
    business_achievements: businessAchievements.trim(),
    media_photos_count: String(mediaCounts.photos),
    media_videos_count: String(mediaCounts.videos),
  });

  const handlePublishListing = async () => {
    setStatus('Saving publication...');
    const fields = buildPublicationFields();
    const publicationPayload = {
      version: 1,
      locale: 'en',
      step: 'publication_final_v1',
      createdAt: new Date().toISOString(),
      fields,
      generated: {
        tittle: generatedTittle,
        description: generatedDescription,
      },
    };

    const result = await saveCurrentUserPublicationDraft(getAccessToken, {
      id: draftId,
      promptJson: publicationPayload,
      promptText: buildPublicationPromptText(fields),
      metadata: {
        step: 'publication_final_v1',
        status: 'published',
        labels: Object.keys(fields),
      },
    });

    if (result.error || !result.data) {
      setStatus(`Could not save publication: ${result.error ?? 'Unknown error.'}`);
      return;
    }

    setDraftId(result.data.id);
    setStatus('');
    setShowSuccessHomeButton(false);
    setCurrentStep(17);
  };

  const buildPublicationPromptText = (fields: ReturnType<typeof buildPublicationFields>) =>
    Object.entries(fields)
      .map(([key, value]) => `${key}: ${value || 'Not provided'}`)
      .join('\n');

  const generatePublicationFromCollectedData = async () => {
    const fields = buildPublicationFields();
    const promptJson = {
      version: 1,
      locale: 'en',
      step: 'publication_generation_v1',
      createdAt: new Date().toISOString(),
      fields,
    };

    const promptText = buildPublicationPromptText(fields);
    const result = await createCurrentUserPublicationPrompt(getAccessToken, {
      promptJson,
      promptText,
      metadata: {
        step: 'publication_generation_v1',
        labels: Object.keys(fields),
      },
    });

    return result;
  };

  const handleContinue = async () => {
    if (currentStep === 1) {
      if (!canContinueStep1) return;
      setCurrentStep(2);
      setStatus('');
      return;
    }

    if (currentStep === 2) {
      if (!canContinueStep2) return;
      setCurrentStep(3);
      setStatus('');
      return;
    }

    if (currentStep === 3) {
      if (!canContinueStep3) return;
      setCurrentStep(4);
      setStatus('');
      return;
    }

    if (currentStep === 4) {
      if (!canContinueStep4) return;
      setCurrentStep(5);
      setStatus('');
      return;
    }

    if (currentStep === 5) {
      if (!canContinueStep5) return;
      setCurrentStep(6);
      setStatus('');
      return;
    }

    if (currentStep === 6) {
      if (!canContinueStep6) return;
      setCurrentStep(7);
      setStatus('');
      return;
    }

    if (currentStep === 7) {
      if (!canContinueStep7) return;
      setCurrentStep(8);
      setStatus('');
      return;
    }

    if (currentStep === 8) {
      if (!canContinueStep8) return;
      setCurrentStep(9);
      setStatus('');
      return;
    }

    if (currentStep === 9) {
      if (!canContinueStep9) return;
      setCurrentStep(10);
      setStatus('');
      return;
    }

    if (currentStep === 10) {
      if (!canContinueStep10) return;
      setCurrentStep(11);
      setStatus('');
      return;
    }

    if (currentStep === 11) {
      if (!canContinueStep11) return;
      setIsGeneratingPublication(true);
      setStatus('Generating publication copy...');

      const response = await generatePublicationFromCollectedData();

      if (response.error || !response.data) {
        setIsGeneratingPublication(false);
        setStatus(`Could not generate publication: ${response.error ?? 'Unknown error.'}`);
        return;
      }

      const optimized = response.data.optimizedPublication;
      const tittleValue = (optimized.tittle || optimized.title || '').slice(0, 50);
      const descriptionValue = (optimized.description || optimized.summary || '').slice(0, 500);
      setGeneratedPublication(optimized);
      setGeneratedTittle(tittleValue);
      setGeneratedDescription(descriptionValue);
      setIsGeneratingPublication(false);
      setStatus('');
      setCurrentStep(12);
      return;
    }

    if (currentStep === 12) {
      if (!canContinueStep12) return;
      setCurrentStep(13);
      setStatus('');
      return;
    }

    if (currentStep === 13) {
      if (!canContinueStep13) return;
      setCurrentStep(14);
      setStatus('');
      return;
    }

    if (currentStep === 14) {
      if (!canContinueStep14) return;
      setCurrentStep(15);
      setStatus('');
      return;
    }

    if (currentStep === 15) {
      if (!canContinueStep15) return;
      setCurrentStep(16);
      setStatus('');
      return;
    }

    if (!canContinueStep16) return;
    setStatus('Preview ready. You can publish now.');
  };

  const handleSaveAndExit = async () => {
    if (!user?.id || rolSeleccionado !== 'emprendedor' || hasExistingProject) {
      router.push('/feed');
      return;
    }

    setSavingDraft(true);
    const fields = {
      ...buildPublicationFields(),
      country: address.country,
      unit: address.unit,
      street_address: address.street_address,
      locality: address.locality,
      state: address.state,
      postcode: address.postcode,
      formatted_address: address.formatted_address,
      latitude: address.latitude,
      longitude: address.longitude,
      source: address.source,
      generated_tittle: generatedTittle,
      generated_description: generatedDescription,
      compliance_items: complianceSelections,
    };
    const payload = {
      promptJson: {
        version: 1,
        locale: 'en',
        step: 'publish_flow_v1',
        step_index: currentStep,
        createdAt: new Date().toISOString(),
        fields,
      },
      promptText: Object.entries(fields)
        .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
        .join('\n'),
      metadata: {
        step: 'publish_flow_v1',
        step_index: currentStep,
        labels: Object.keys(fields),
      },
    };
    await saveCurrentUserPublicationDraft(getAccessToken, {
      id: draftId,
      promptJson: payload.promptJson,
      promptText: payload.promptText,
      metadata: payload.metadata,
    });
    setSavingDraft(false);
    router.push('/feed');
  };

  if (rolSeleccionado !== 'emprendedor') {
    return <RoleRestrictedState />;
  }

  const progressStepIndex =
    currentStep <= 5 ? 0
    : currentStep <= 9 ? 1
    : currentStep <= 11 ? 2
    : currentStep <= 13 ? 3
    : 4;

  const resolveProgressStatus = (index: number): ProgressStepStatus => {
    if (index < progressStepIndex) return 'completed';
    if (index === progressStepIndex) return 'current';
    return 'upcoming';
  };

  return (
    <>
      <DesktopAppShell
        title=""
        subtitle=""
        hideHeader
        maxWidthClassName="max-w-none"
      >
        <div
          style={{ fontFamily: desktopFontFamily }}
          className="relative grid h-[80vh] grid-cols-[minmax(0,0.95fr)_minmax(420px,0.8fr)] gap-9 overflow-visible rounded-[34px] border border-[#E3EAF2] bg-white p-10 pb-24 shadow-[0_26px_70px_rgba(15,23,42,0.06)]"
        >
          {currentStep !== 17 && currentStep !== 18 ? (
            <button
              type="button"
              onClick={() => void handleSaveAndExit()}
              className="absolute right-10 top-8 z-30 h-10 rounded-full border border-black bg-transparent px-5 text-sm font-medium text-black transition hover:bg-black hover:text-white"
            >
              Save and exit
            </button>
          ) : null}

          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() =>
                setCurrentStep(
                  (prev) =>
                    (prev > 1
                      ? ((prev - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18)
                      : 1)
                )
              }
              className="absolute left-10 top-8 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D9E2EC] bg-white text-xl font-semibold leading-none text-[#0B1325] transition hover:border-[#B8C7D9]"
              aria-label="Back to previous step"
            >
              {'<'}
            </button>
          ) : null}

          <section
            className={`${
              currentStep >= 7 &&
              currentStep !== 10 &&
              currentStep !== 12 &&
              currentStep !== 13 &&
              currentStep !== 14 &&
              currentStep !== 15 &&
              currentStep !== 18
                ? 'hidden'
                : 'flex flex-col justify-center'
            }`}
          >
            {currentStep === 1 ? (
              <>
                <h2 className="max-w-xl text-[4.15rem] font-semibold leading-[0.95] tracking-[-0.055em] text-[#0B1325]">
                  Set your business address
                </h2>
                <p className="mt-6 max-w-xl text-[1.32rem] leading-8 text-[#4B5B72]">
                  Start by selecting the exact address of your venture. We will prefill the structured
                  fields for country, unit, street, locality, state, and postcode.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(true)}
                  className="mt-10 flex h-[68px] w-full max-w-xl items-center gap-3 rounded-full border border-[#CCD9E8] bg-white px-6 text-left text-lg text-[#0B1325] shadow-[0_16px_36px_rgba(15,23,42,0.06)] transition hover:border-[#6B39F4]/50"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF3FF] text-[#2E7CF6]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </span>
                  <span className="truncate">
                    {address.formatted_address || 'Enter your business address'}
                  </span>
                </button>
              </>
            ) : currentStep === 2 ? (
              <>
                <h2 className="max-w-xl text-[4.15rem] font-semibold leading-[0.95] tracking-[-0.055em] text-[#0B1325]">
                  Tell us about your entrepreneur business
                </h2>
                <p className="mt-6 max-w-xl text-[1.32rem] leading-8 text-[#4B5B72]">
                  In this step, we will ask you which type of business you have and if investors will fund
                  the entire opportunity or part of it. Then share the location and how many guests can stay.
                </p>
              </>
            ) : currentStep === 3 ? (
              <>
                <h2 className="max-w-xl text-[4.15rem] font-semibold leading-[0.95] tracking-[-0.055em] text-[#0B1325]">
                  Which of these best describes your business?
                </h2>
                <p className="mt-6 max-w-xl text-[1.32rem] leading-8 text-[#4B5B72]">
                  Choose one category to continue.
                </p>
              </>
            ) : currentStep === 4 ? (
              <>
                <h2 className="max-w-xl text-[4.15rem] font-semibold leading-[0.95] tracking-[-0.055em] text-[#0B1325]">
                  Great, now let&apos;s name your business
                </h2>
                <p className="mt-6 max-w-xl text-[1.32rem] leading-8 text-[#4B5B72]">
                  Give your venture a clear name investors will recognize instantly.
                </p>
                <input
                  type="text"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Enter your business name"
                  className={`${inputClassName} mt-8 max-w-xl text-base`}
                />
              </>
            ) : currentStep === 5 ? (
              <>
                <h2 className="max-w-xl text-[4.15rem] font-semibold leading-[0.95] tracking-[-0.055em] text-[#0B1325]">
                  How long has your business been operating?
                </h2>
                <p className="mt-6 max-w-xl text-[1.32rem] leading-8 text-[#4B5B72]">
                  Pick the option that best matches your current stage.
                </p>
              </>
            ) : currentStep === 6 ? (
              <>
                <h2 className="max-w-xl text-[4.15rem] font-semibold leading-[0.95] tracking-[-0.055em] text-[#0B1325]">
                  Step 2. Make your business stand out
                </h2>
                <p className="mt-6 max-w-xl text-[1.32rem] leading-8 text-[#4B5B72]">
                  In this section, we will collect key financial information from your business, then
                  help you craft a strong title and description for investors.
                </p>
              </>
            ) : currentStep === 7 ? (
              <>
                <h2 className="max-w-xl text-[3.3rem] font-semibold leading-[1.04] tracking-[-0.05em] text-[#0B1325]">
                  Let&apos;s capture what your business does and your monthly performance
                </h2>
                <p className="mt-6 max-w-xl text-[1.2rem] leading-8 text-[#4B5B72]">
                  These answers help us build a stronger AI-generated publication for investors.
                </p>
              </>
            ) : currentStep === 10 ? (
              <>
                <h2 className="max-w-xl text-[3.65rem] font-semibold leading-[1.02] tracking-[-0.05em] text-[#0B1325]">
                  Add some photos and videos of your Business
                </h2>
                <p className="mt-6 max-w-xl text-[1.2rem] leading-8 text-[#4B5B72]">
                  You&apos;ll need 5 photos and 1 video to get started. You can add more or make changes later.
                </p>
              </>
            ) : currentStep === 12 ? (
              <>
                <h2 className="max-w-xl text-[3.2rem] font-semibold leading-[1.04] tracking-[-0.05em] text-[#0B1325]">
                  Let&apos;s craft a strong title for your business
                </h2>
                <p className="mt-6 max-w-xl text-[1.2rem] leading-8 text-[#4B5B72]">
                  Keep it short and memorable. You can fine-tune it anytime later.
                </p>
              </>
            ) : currentStep === 13 ? (
              <>
                <h2 className="max-w-xl text-[3.2rem] font-semibold leading-[1.04] tracking-[-0.05em] text-[#0B1325]">
                  Create your description
                </h2>
                <p className="mt-6 max-w-xl text-[1.2rem] leading-8 text-[#4B5B72]">
                  Explain what makes your business unique and attractive for investors.
                </p>
              </>
            ) : currentStep === 14 ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B39F4]">Step 3</p>
                <h2 className="mt-2 max-w-xl text-[3.35rem] font-semibold leading-[1.04] tracking-[-0.05em] text-[#0B1325]">
                  Finish details and go live
                </h2>
                <p className="mt-6 max-w-xl text-[1.2rem] leading-8 text-[#4B5B72]">
                  Next, define your pricing, answer a few final questions, and publish whenever you are ready.
                </p>
              </>
            ) : currentStep === 15 ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B39F4]">Extras</p>
                <h2 className="mt-2 max-w-xl text-[3rem] font-semibold leading-[1.04] tracking-[-0.05em] text-[#0B1325]">
                  Add key compliance and legal details
                </h2>
                <p className="mt-6 max-w-xl text-[1.2rem] leading-8 text-[#4B5B72]">
                  Select the items your business can provide. We will use these details later in your publication profile.
                </p>
              </>
            ) : currentStep === 16 ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B39F4]">Preview</p>
                <h2 className="mt-2 max-w-xl text-[3rem] font-semibold leading-[1.04] tracking-[-0.05em] text-[#0B1325]">
                  Review your listing before publishing
                </h2>
                <p className="mt-6 max-w-xl text-[1.2rem] leading-8 text-[#4B5B72]">
                  Confirm images, description, and compliance details, then publish when ready.
                </p>
              </>
            ) : currentStep === 17 || currentStep === 18 ? null : (
              <>
                <h2 className="max-w-xl text-[3.25rem] font-semibold leading-[1.04] tracking-[-0.05em] text-[#0B1325]">
                  Upload your business media
                </h2>
                <p className="mt-6 max-w-xl text-[1.2rem] leading-8 text-[#4B5B72]">
                  Add your files and arrange them to match how you want investors to see your business.
                </p>
              </>
            )}

            <div className="mt-6 text-sm text-[#5D6A7F]">
              {checkingProject ? 'Checking your profile status...' : null}
              {!checkingProject && hasExistingProject
                ? 'You already have a published project. Manage updates from Portfolio.'
                : null}
              {savingDraft ? 'Saving your responses...' : null}
              {currentStep === 1 &&
              !checkingProject &&
              !hasExistingProject &&
              !savingDraft &&
              isAddressValid(address)
                ? 'Address details are complete.'
                : null}
              {currentStep === 7 &&
              !checkingProject &&
              !hasExistingProject &&
              !savingDraft &&
              canContinueStep7
                ? 'Business details and financial metrics are complete.'
                : null}
              {currentStep === 8 &&
              !checkingProject &&
              !hasExistingProject &&
              !savingDraft &&
              canContinueStep8
                ? 'Investment round details are complete.'
                : null}
              {currentStep === 9 &&
              !checkingProject &&
              !hasExistingProject &&
              !savingDraft &&
              canContinueStep9
                ? 'Founder and team details are complete.'
                : null}
              {currentStep === 11 &&
              !checkingProject &&
              !hasExistingProject &&
              !savingDraft
                ? `${mediaCounts.photos} photos and ${mediaCounts.videos} video selected.`
                : null}
              {currentStep === 13 &&
              !checkingProject &&
              !hasExistingProject &&
              !savingDraft &&
              generatedDescription.trim().length > 0
                ? `${generatedDescription.trim().length}/500 characters used.`
                : null}
              {currentStep === 14 && !checkingProject && !hasExistingProject && !savingDraft
                ? 'Final section intro is ready.'
                : null}
              {currentStep === 15 && !checkingProject && !hasExistingProject && !savingDraft
                ? `${complianceSelections.length} compliance item(s) selected.`
                : null}
              {currentStep === 16 && !checkingProject && !hasExistingProject && !savingDraft
                ? 'Preview generated from your collected data.'
                : null}
              {currentStep === 17 || currentStep === 18 ? '' : null}
            </div>

            {status ? <p className="mt-2 text-sm text-[#0B7A52]">{status}</p> : null}

            {currentStep === 12 ? (
              <div className="mt-8 max-w-xl rounded-3xl border border-[#DCE6F1] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
                <label className="block">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B39F4]">
                    tittle
                  </p>
                  <textarea
                    value={generatedTittle}
                    onChange={(event) => setGeneratedTittle(event.target.value.slice(0, 50))}
                    maxLength={50}
                    rows={4}
                    className={`${inputClassName} mt-3 resize-none text-base`}
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-12 flex items-center gap-3">
              <button
                type="button"
                onClick={handleContinue}
                disabled={
                  currentStep === 1
                    ? !canContinueStep1
                    : currentStep === 2
                      ? !canContinueStep2
                      : currentStep === 3
                        ? !canContinueStep3
                        : currentStep === 4
                          ? !canContinueStep4
                          : currentStep === 5
                            ? !canContinueStep5
                            : currentStep === 6
                              ? !canContinueStep6
                              : currentStep === 7
                                ? !canContinueStep7
                                : currentStep === 8
                                  ? !canContinueStep8
                                  : currentStep === 9
                                    ? !canContinueStep9
                                    : currentStep === 10
                                      ? !canContinueStep10
                                        : currentStep === 11
                                          ? !canContinueStep11
                                          : currentStep === 12
                                            ? !canContinueStep12
                                            : currentStep === 13
                                              ? !canContinueStep13
                                              : currentStep === 14
                                                ? !canContinueStep14
                                                : currentStep === 15
                                                  ? !canContinueStep15
                                                  : currentStep === 16
                                                    ? !canContinueStep16
                                                    : true
                }
                className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </section>

          <section
            className={`relative flex items-center justify-center ${
              currentStep === 7 || currentStep === 8 || currentStep === 9 || currentStep === 11 || currentStep === 16 ? 'col-span-2' : ''
            }`}
          >
            {currentStep === 3 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="mt-12 grid w-full max-w-[620px] grid-cols-3 gap-2"
              >
                {businessCategories.map((category) => {
                  const isSelected = selectedBusinessCategory === category.label;
                  return (
                    <motion.button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedBusinessCategory(category.label)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        isSelected
                          ? 'border-[#6B39F4] bg-[#F4EFFF] shadow-[0_14px_30px_rgba(107,57,244,0.16)]'
                          : 'border-[#DCE6F1] bg-white hover:border-[#C8D6E7]'
                      }`}
                    >
                      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#EEF3FB] text-black">
                        <BusinessCategoryIcon id={category.id} />
                      </div>
                      <p className="text-xs font-medium leading-4 text-[#0B1325]">{category.label}</p>
                    </motion.button>
                  );
                })}
              </motion.div>
            ) : currentStep === 5 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full max-w-[620px] space-y-3"
              >
                {operatingTimeOptions.map((option) => {
                  const isSelected = selectedOperatingTime === option;
                  return (
                    <motion.button
                      key={option}
                      type="button"
                      onClick={() => setSelectedOperatingTime(option)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.995 }}
                      className={`w-full rounded-2xl border px-6 py-5 text-left text-lg font-medium transition ${
                        isSelected
                          ? 'border-[#6B39F4] bg-[#F5F0FF] shadow-[0_16px_28px_rgba(107,57,244,0.14)]'
                          : 'border-[#DCE6F1] bg-white hover:border-[#C8D6E7] hover:bg-[#FCFDFF]'
                      }`}
                    >
                      {option}
                    </motion.button>
                  );
                })}
              </motion.div>
            ) : currentStep === 7 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full max-w-[1220px] space-y-5"
              >
                <div className="text-center">
                  <h2 className="text-[3.1rem] font-semibold leading-[1.05] tracking-[-0.05em] text-[#0B1325]">
                    Let&apos;s capture what your business does and your monthly performance
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-[1.12rem] leading-7 text-[#4B5B72]">
                    These answers help us build a stronger AI-generated publication for investors.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-[#DCE6F1] bg-white p-5">
                    <p className="text-sm font-semibold text-[#0B1325]">What do you sell exactly?</p>
                    <p className="mt-1 text-xs text-[#5D6A7F]">
                      Describe the products or services your business offers.
                    </p>
                    <textarea
                      value={businessOffer}
                      onChange={(event) => setBusinessOffer(event.target.value)}
                      placeholder="Example: We sell healthy ready-to-eat meals and weekly subscriptions for offices."
                      className={`${inputClassName} mt-3 min-h-[110px] resize-none text-sm`}
                    />

                    <p className="mt-5 text-sm font-semibold text-[#0B1325]">
                      What makes you different from competitors?
                    </p>
                    <p className="mt-1 text-xs text-[#5D6A7F]">
                      Tell us what you do differently and why customers choose you.
                    </p>
                    <textarea
                      value={businessDifferentiator}
                      onChange={(event) => setBusinessDifferentiator(event.target.value)}
                      placeholder="Example: We deliver in under 30 minutes with nutrition plans customized by dietitians."
                      className={`${inputClassName} mt-3 min-h-[110px] resize-none text-sm`}
                    />
                  </div>

                  <div className="rounded-2xl border border-[#DCE6F1] bg-white p-5">
                    <p className="text-sm font-semibold text-[#0B1325]">Monthly business metrics</p>
                    <div className="mt-4 grid grid-cols-1 gap-3">
                    <label className="flex items-center gap-3 rounded-xl border border-[#DCE6F1] bg-[#FBFDFF] px-4 py-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF3FB] text-black">
                        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 18V8" />
                          <path d="M10 18V6" />
                          <path d="M16 18V10" />
                          <path d="M22 18V4" />
                          <path d="M2 20h20" />
                        </svg>
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[#5D6A7F]">Total monthly sales (Units)</p>
                        <input
                          type="number"
                          min="0"
                          value={monthlySales}
                          onChange={(event) => setMonthlySales(event.target.value)}
                          placeholder="0"
                          className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-semibold text-[#0B1325] outline-none placeholder:text-[#9AA8BA]"
                        />
                      </div>
                    </label>

                    <label className="flex items-center gap-3 rounded-xl border border-[#DCE6F1] bg-[#FBFDFF] px-4 py-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF3FB] text-black">
                        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="M3 10h18" />
                          <path d="M9 15h2" />
                        </svg>
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[#5D6A7F]">Average ticket (USD)</p>
                        <input
                          type="number"
                          min="0"
                          value={averageTicket}
                          onChange={(event) => setAverageTicket(event.target.value)}
                          placeholder="0"
                          className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-semibold text-[#0B1325] outline-none placeholder:text-[#9AA8BA]"
                        />
                      </div>
                    </label>

                    <label className="flex items-center gap-3 rounded-xl border border-[#DCE6F1] bg-[#FBFDFF] px-4 py-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF3FB] text-black">
                        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="8" cy="9" r="3" />
                          <path d="M3 20c0-3 2.2-5 5-5s5 2 5 5" />
                          <circle cx="17" cy="10" r="2" />
                          <path d="M14.8 20c.2-2 1.8-3.6 4.2-3.9" />
                        </svg>
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[#5D6A7F]">Monthly clients</p>
                        <input
                          type="number"
                          min="0"
                          value={monthlyClients}
                          onChange={(event) => setMonthlyClients(event.target.value)}
                          placeholder="0"
                          className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-semibold text-[#0B1325] outline-none placeholder:text-[#9AA8BA]"
                        />
                      </div>
                    </label>
                  </div>
                </div>
                </div>
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!canContinueStep7}
                    className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            ) : currentStep === 8 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full max-w-[1220px] space-y-5"
              >
                <div className="text-center">
                  <h2 className="text-[3.1rem] font-semibold leading-[1.05] tracking-[-0.05em] text-[#0B1325]">
                    Define your investment round details
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-[1.12rem] leading-7 text-[#4B5B72]">
                    Share funding amount, usage, interest rate, and closing date so investors can evaluate your offer clearly.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-[#DCE6F1] bg-white p-4">
                    <label className="block">
                      <p className="text-sm font-semibold text-[#0B1325]">Capital required (USD)</p>
                      <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#DCE6F1] bg-[#FBFDFF] px-4 py-2.5">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF3FB] text-black">
                          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M14.8 8.5c-.7-.7-1.7-1-2.8-1-1.7 0-3 .9-3 2.2 0 1.2 1 1.8 2.7 2.2 1.9.4 3.3.9 3.3 2.5 0 1.5-1.4 2.4-3.3 2.4-1.3 0-2.5-.4-3.4-1.3" />
                            <path d="M12 6.5v11" />
                          </svg>
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={capitalRequiredUsd}
                          onChange={(event) => setCapitalRequiredUsd(event.target.value)}
                          placeholder="0"
                          className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-[#0B1325] outline-none placeholder:text-[#9AA8BA]"
                        />
                      </div>
                    </label>

                    <label className="mt-4 block">
                      <p className="text-sm font-semibold text-[#0B1325]">What will you use the funds for?</p>
                      <textarea
                        value={fundUsage}
                        onChange={(event) => setFundUsage(event.target.value)}
                        placeholder="Example: inventory expansion, marketing campaigns, hiring, and operations."
                        className={`${inputClassName} mt-2 min-h-[88px] resize-none text-sm`}
                      />
                    </label>

                    <div className="mt-4">
                      <p className="text-sm font-semibold text-[#0B1325]">Annual interest rate (EA)</p>
                      <div className="mt-2 rounded-xl border border-[#DCE6F1] bg-[#FBFDFF] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="60"
                          step="0.5"
                          value={interestRateEA || '1'}
                          onChange={(event) => setInterestRateEA(event.target.value)}
                          className="h-2 w-full cursor-pointer accent-[#6B39F4]"
                        />
                        <div className="w-[120px]">
                          <input
                            type="number"
                            min="1"
                            max="60"
                            step="0.5"
                            value={interestRateEA}
                            onChange={(event) => setInterestRateEA(event.target.value)}
                            placeholder="0"
                            className="w-full rounded-lg border border-[#DCE6F1] bg-white px-2 py-1.5 text-sm font-semibold text-[#0B1325] outline-none focus:border-[#6B39F4]"
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-[#5D6A7F]">Set your offered effective annual rate (%)</p>
                    </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#DCE6F1] bg-white p-4">
                    <label className="block">
                      <p className="text-sm font-semibold text-[#0B1325]">Investment round closing date</p>
                      <div className="mt-2 overflow-hidden rounded-2xl border border-[#DCE6F1] bg-white p-2">
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                          <DateCalendar
                            value={roundCloseDateValue}
                            onChange={(newValue) =>
                              setRoundCloseDate(newValue ? newValue.format('YYYY-MM-DD') : '')
                            }
                            disablePast
                            sx={{
                              width: '100%',
                              maxHeight: 295,
                              transform: 'scale(0.98)',
                              transformOrigin: 'top center',
                              '& .MuiPickersDay-root.Mui-selected': {
                                backgroundColor: '#6B39F4',
                              },
                              '& .MuiPickersDay-root.Mui-selected:hover': {
                                backgroundColor: '#5A2FCE',
                              },
                            }}
                          />
                        </LocalizationProvider>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!canContinueStep8}
                    className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            ) : currentStep === 9 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full max-w-[1220px] space-y-5"
              >
                <div className="text-center">
                  <h2 className="text-[3.1rem] font-semibold leading-[1.05] tracking-[-0.05em] text-[#0B1325]">
                    Tell us about you and your team
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-[1.12rem] leading-7 text-[#4B5B72]">
                    This helps investors trust the people behind the business.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-[#DCE6F1] bg-white p-5">
                    <label className="block">
                      <p className="text-sm font-semibold text-[#0B1325]">
                        Tell us about yourself
                      </p>
                      <p className="mt-1 text-xs text-[#5D6A7F]">
                        Who you are, brief summary, studies, and relevant experience.
                      </p>
                      <textarea
                        value={aboutFounder}
                        onChange={(event) => setAboutFounder(event.target.value)}
                        placeholder="Example: I am a mechanical engineer with 8 years of experience in food operations and scaling SMEs."
                        className={`${inputClassName} mt-3 min-h-[110px] resize-none text-sm`}
                      />
                    </label>

                    <label className="mt-5 block">
                      <p className="text-sm font-semibold text-[#0B1325]">
                        Tell us about your team
                      </p>
                      <p className="mt-1 text-xs text-[#5D6A7F]">
                        Number of employees, roles, and key capabilities.
                      </p>
                      <textarea
                        value={aboutTeam}
                        onChange={(event) => setAboutTeam(event.target.value)}
                        placeholder="Example: 12 team members across operations, sales, and finance, with strengths in logistics and customer retention."
                        className={`${inputClassName} mt-3 min-h-[110px] resize-none text-sm`}
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-[#DCE6F1] bg-white p-5">
                    <label className="block">
                      <p className="text-sm font-semibold text-[#0B1325]">Achievements</p>
                      <p className="mt-1 text-xs text-[#5D6A7F]">
                        Awards, recognitions, certifications, or key business milestones.
                      </p>
                      <textarea
                        value={businessAchievements}
                        onChange={(event) => setBusinessAchievements(event.target.value)}
                        placeholder="Example: Winner of local startup challenge 2025 and ISO 9001 certified operations."
                        className={`${inputClassName} mt-3 min-h-[280px] resize-none text-sm`}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!canContinueStep9}
                    className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            ) : currentStep === 11 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full max-w-none space-y-5"
              >
                {isUploadingMedia ? (
                  <div className="mx-auto w-full max-w-[1440px] space-y-5">
                    <h2 className="text-center text-[2.6rem] font-semibold tracking-[-0.045em] text-[#0B1325]">
                      Loading photos, please wait a moment
                    </h2>
                    <div className="grid w-full grid-cols-5 gap-3">
                      {Array.from({ length: 10 }).map((_, index) => (
                        <div
                          key={`media-skeleton-${index}`}
                          className="aspect-[16/10] animate-pulse rounded-2xl border border-[#E4ECF6] bg-[#EEF3FB]"
                        />
                      ))}
                    </div>
                  </div>
                ) : uploadedMediaItems.length === 0 ? (
                  <div className="mx-auto flex w-full max-w-[680px] justify-center">
                    <button
                      type="button"
                      onClick={() => setIsMediaModalOpen(true)}
                      className="group flex h-[250px] w-full max-w-[640px] flex-col items-center justify-center gap-4 rounded-[24px] border-2 border-dashed border-[#CBD8E8] bg-white px-6 transition hover:border-[#6B39F4]/55 hover:bg-[#FCFBFF]"
                    >
                      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF3FB] text-[#111827] transition group-hover:bg-[#EFE7FF]">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-8 w-8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 5v14" />
                          <path d="M5 12h14" />
                        </svg>
                      </span>
                      <p className="text-sm font-semibold text-[#0B1325]">
                        Add photos and videos
                      </p>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <h2 className="text-[3rem] font-semibold leading-[1.05] tracking-[-0.05em] text-[#0B1325]">
                        Ta-da! How does this look?
                      </h2>
                      <p className="mx-auto mt-3 text-center text-sm text-[#5D6A7F]">Drag to reorder</p>
                    </div>

                    <div className="mx-auto max-h-[44vh] w-full max-w-[1440px] overflow-y-auto rounded-2xl border border-[#E4ECF6] bg-[#F9FBFE] p-3">
                      <div className="grid w-full grid-cols-5 gap-3">
                        {uploadedMediaItems.map((item) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={() => handleDragStartMedia(item.id)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => handleDropMedia(item.id)}
                            className="group relative overflow-hidden rounded-2xl border border-[#DCE6F1] bg-[#F8FAFD]"
                          >
                            {item.type === 'video' ? (
                              <video
                                src={item.previewUrl}
                                className="aspect-[16/10] w-full object-cover"
                                controls
                                muted
                              />
                            ) : (
                              <img
                                src={item.previewUrl}
                                alt={item.name}
                                className="aspect-[16/10] w-full object-cover"
                              />
                            )}
                            <div className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white">
                              {item.type === 'video' ? 'Video' : 'Photo'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setIsMediaModalOpen(true)}
                        className="rounded-full border border-[#CFDAE8] px-4 py-2 text-xs font-semibold text-[#0B1325] transition hover:border-[#6B39F4]/45"
                      >
                        Add more
                      </button>

                      <button
                        type="button"
                        onClick={handleContinue}
                        disabled={!canContinueStep11}
                        className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Continue
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ) : currentStep === 12 ? null : currentStep === 13 ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-full max-w-[560px]"
              >
                <div className="rounded-3xl border border-[#DCE6F1] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
                  <label className="block">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B39F4]">
                      description
                    </p>
                    <textarea
                      value={generatedDescription}
                      onChange={(event) => setGeneratedDescription(event.target.value.slice(0, 500))}
                      maxLength={500}
                      rows={9}
                      className={`${inputClassName} mt-3 resize-none text-base`}
                    />
                  </label>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#6A778D]">
                    <span>
                      {generatedPublication ? 'AI publication response received.' : 'Waiting for API response.'}
                    </span>
                    <span>{generatedDescription.length}/500</span>
                  </div>
                </div>
              </motion.div>
            ) : currentStep === 15 ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-full max-w-[740px] space-y-4"
              >
                <div className="rounded-3xl border border-[#DCE6F1] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
                  <p className="text-sm font-semibold text-[#0B1325]">Share safety and business details</p>
                  <p className="mt-1 text-xs text-[#5D6A7F]">
                    Does your business have any of these?
                  </p>
                  <div className="mt-5 max-h-[42vh] space-y-3 overflow-y-auto pr-2">
                    {complianceChecklistOptions.map((option) => {
                      const selected = complianceSelections.includes(option);
                      return (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                            selected
                              ? 'border-[#6B39F4] bg-[#F5F0FF]'
                              : 'border-[#DCE6F1] bg-[#FBFDFF] hover:border-[#C8D6E7]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              setComplianceSelections((previous) =>
                                selected
                                  ? previous.filter((item) => item !== option)
                                  : [...previous, option]
                              )
                            }
                            className="mt-0.5 h-4 w-4 accent-[#6B39F4]"
                          />
                          <span className="text-sm leading-6 text-[#0F172A]">{option}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E3EAF2] bg-[#F8FAFD] p-5">
                  <p className="text-sm font-semibold text-[#0B1325]">Important things to know</p>
                  <p className="mt-2 text-sm leading-6 text-[#5D6A7F]">
                    Make sure all disclosures are accurate and aligned with local regulations. Include only verifiable legal, financial, and compliance information in your listing.
                  </p>
                </div>
              </motion.div>
            ) : currentStep === 16 ? (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex h-full w-full flex-col gap-4"
              >
                <div className="mx-auto max-w-3xl text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B39F4]">Preview</p>
                  <h2 className="mt-2 text-[2.85rem] font-semibold leading-[1.04] tracking-[-0.05em] text-[#0B1325]">
                    Review your listing before publishing
                  </h2>
                  <p className="mt-4 text-[1rem] leading-7 text-[#4B5B72]">
                    Confirm images, description, and compliance details, then publish when ready.
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-[#DCE6F1] bg-white shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
                  <div className="relative h-[300px] w-full overflow-hidden bg-[#EEF3FB]">
                    {previewPhotos.length > 0 ? (
                      <motion.div
                        animate={{ x: `-${activePhotoIndex * 100}%` }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                        className="flex h-full w-full"
                      >
                        {previewPhotos.map((photo) => (
                          <img
                            key={photo.id}
                            src={photo.previewUrl}
                            alt={photo.name}
                            className="h-full min-w-full object-cover"
                          />
                        ))}
                      </motion.div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[#6A778D]">
                        Add photos to preview your listing.
                      </div>
                    )}
                    {previewPhotos.length > 0 ? (
                      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/45 px-3 py-1.5">
                        {previewPhotos.map((photo, index) => (
                          <span
                            key={`photo-dot-${photo.id}`}
                            className={`h-2 w-2 rounded-full ${
                              activePhotoIndex === index ? 'bg-white' : 'bg-white/45'
                            }`}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4 p-6">
                    <h3 className="text-center text-2xl font-semibold tracking-[-0.03em] text-[#0B1325]">
                      {generatedTittle || 'Your business title'}
                    </h3>

                    <p className="text-center text-sm font-semibold text-[#6B39F4]">
                      Capital to raise: ${capitalRequiredUsd || '0'} USD
                    </p>

                    <div className="mx-auto max-w-3xl rounded-2xl border border-[#DCE6F1] bg-[#FBFDFF] p-4">
                      <p className="text-sm font-semibold text-[#0B1325]">
                        Send a message to the entrepreneur
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          value={whatsAppMessage}
                          onChange={(event) => setWhatsAppMessage(event.target.value)}
                          placeholder="Write your message"
                          className={`${inputClassName} h-11 text-sm`}
                        />
                        <a
                          href={
                            registeredWhatsappNumber
                              ? `https://wa.me/${registeredWhatsappNumber}?text=${encodeURIComponent(
                                  whatsAppMessage || `Hi, I'd like to know more about ${generatedTittle || 'your business'}.`
                                )}`
                              : undefined
                          }
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold text-white ${
                            registeredWhatsappNumber ? 'bg-[#10B981] hover:bg-[#059669]' : 'bg-[#A7B4C8] pointer-events-none'
                          }`}
                        >
                          Send
                        </a>
                      </div>
                    </div>

                    {complianceSelections.length > 0 ? (
                      <div className="overflow-x-auto">
                        <div className="flex min-w-max gap-2">
                          {complianceSelections.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-[#D5E0ED] bg-[#F8FBFF] px-3 py-1.5 text-xs font-medium text-[#334155]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <p className="text-sm leading-7 text-[#334155] [text-align:justify]">
                      {generatedDescription || 'Description will appear here once generated.'}
                    </p>

                    {previewVideo ? (
                      <div className="rounded-2xl border border-[#DCE6F1] bg-[#F8FAFD] p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6A778D]">
                          Featured video
                        </p>
                        <video src={previewVideo.previewUrl} controls className="h-56 w-full rounded-xl object-cover" />
                      </div>
                    ) : null}

                    <div className="flex justify-center pb-2">
                      <button
                        type="button"
                        onClick={() => void handlePublishListing()}
                        className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE]"
                      >
                        Publish
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : currentStep === 17 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex h-[74vh] w-full items-center justify-center"
              >
                <Lottie
                  animationData={publishStep17PublishingAnimation}
                  loop
                  autoplay
                  className="h-[740px] w-[740px] max-h-full max-w-full"
                />
              </motion.div>
            ) : currentStep === 18 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex h-[74vh] w-full flex-col items-center justify-center"
              >
                <Lottie
                  animationData={publishStep18SuccessAnimation}
                  loop
                  autoplay
                  className="h-[620px] w-[620px] max-h-full max-w-full"
                />
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
                  className="mt-2 text-center text-2xl font-semibold tracking-[-0.03em] text-[#0B1325]"
                >
                  Congrats, your publication is now online!
                </motion.p>
                {showSuccessHomeButton ? (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    onClick={() => router.push('/home')}
                    className="mt-6 h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE]"
                  >
                    Go back to home
                  </motion.button>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="relative h-full w-full overflow-visible"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative mx-auto h-[860px] w-[560px]"
                >
                  <Lottie
                    animationData={
                      currentStep === 1
                        ? publishAddressStepAnimation
                        : currentStep === 4
                          ? publishStep4NameAnimation
                        : currentStep === 10
                          ? publishStep10MediaAnimation
                        : currentStep === 14
                          ? publishStep14FinishAnimation
                        : currentStep === 6
                          ? publishStep6Animation
                          : publishStep2Animation
                    }
                    loop
                    autoplay
                    className="h-full w-full"
                  />
                </motion.div>
              </motion.div>
            )}
          </section>

          {currentStep !== 17 && currentStep !== 18 ? (
            <footer className="pointer-events-none absolute -bottom-28 left-0 right-0 border-t border-[#E8EEF6] bg-white/95 px-10 py-5 backdrop-blur-sm">
              <div className="pointer-events-auto flex items-start justify-between">
                {publishProgressSteps.map((step, index) => {
                  const status = resolveProgressStatus(index);
                  const isLast = index === publishProgressSteps.length - 1;
                  const isCurrent = status === 'current';
                  const isCompleted = status === 'completed';
                  const lineClass = index < progressStepIndex ? 'bg-[#6B39F4]' : 'bg-[#D6DCE5]';

                  return (
                    <div key={step.title} className="relative flex flex-1 flex-col items-center">
                      {index < publishProgressSteps.length - 1 ? (
                        <div className={`absolute left-1/2 top-5 h-[2px] w-full ${lineClass}`} />
                      ) : null}

                      <div className="relative z-10 mb-3">
                        {isLast ? (
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${
                              isCompleted || isCurrent
                                ? 'bg-[#6B39F4] text-white'
                                : 'border-2 border-[#D0D5DD] bg-white text-[#9AA3B2]'
                            }`}
                          >
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                              <path d="m12 2.8 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17l-5.56 2.92 1.06-6.2L3 9.33l6.22-.9L12 2.8Z" />
                            </svg>
                          </div>
                        ) : isCompleted ? (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6B39F4] text-white">
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m5 12 4.2 4.2L19 6.8" />
                            </svg>
                          </div>
                        ) : isCurrent ? (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#6B39F4] bg-white">
                            <div className="h-3 w-3 rounded-full bg-[#6B39F4]" />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#D0D5DD] bg-white">
                            <div className="h-3 w-3 rounded-full bg-[#A2ABB9]" />
                          </div>
                        )}
                      </div>

                      <div className="max-w-[170px] text-center">
                        <h3 className={`text-[15px] font-semibold ${isCurrent ? 'text-[#6B39F4]' : 'text-[#0B1325]'}`}>
                          {step.title}
                        </h3>
                        <p className={`mt-1 text-xs leading-5 ${isCurrent ? 'text-[#6B39F4]' : 'text-[#6B7280]'}`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </footer>
          ) : null}
        </div>
      </DesktopAppShell>

      <AnimatePresence>
        {isAddressModalOpen ? (
          <motion.div
            className="fixed inset-0 z-[90] hidden items-center justify-center bg-[#0B1325]/40 px-8 backdrop-blur-[2px] lg:flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-3xl rounded-[30px] border border-[#E4ECF6] bg-white p-7 shadow-[0_36px_80px_rgba(15,23,42,0.24)]"
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2E7CF6]">Address modal</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#0F172A]">
                    Enter your business address
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D4DEEA] text-[#64748B] transition hover:border-[#A6B6C9] hover:text-[#0F172A]"
                  aria-label="Close address modal"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 6 12 12" />
                    <path d="m18 6-12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <input
                  value={searchQuery}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setSearchQuery(nextValue);
                    if (nextValue.trim().length < 3) setSearchResults([]);
                    setIsSearching(nextValue.trim().length >= 3);
                    setStatus('');
                  }}
                  placeholder="Search your address"
                  className={inputClassName}
                />

                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={geolocationLoading}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#CDE4D8] bg-[#ECF9F2] px-4 text-sm font-semibold text-[#0B7A52] transition hover:bg-[#E0F6EB] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="7" />
                    <path d="M12 2v3" />
                    <path d="M12 19v3" />
                    <path d="m5 5 2 2" />
                    <path d="m17 17 2 2" />
                  </svg>
                  {geolocationLoading ? 'Resolving your location...' : 'Use my location'}
                </button>
              </div>

              <div className="mt-4 max-h-44 overflow-y-auto rounded-2xl border border-[#E4ECF6] bg-[#F9FBFE]">
                {isSearching ? <p className="px-4 py-3 text-sm text-[#64748B]">Searching addresses...</p> : null}
                {!isSearching && searchResults.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[#94A3B8]">
                    Type at least 3 characters to search for matching addresses.
                  </p>
                ) : null}
                {!isSearching && searchResults.length > 0
                  ? searchResults.map((result) => (
                      <button
                        key={`${result.provider_place_id}-${result.formatted_address}`}
                        type="button"
                        onClick={() => applyAddressRecord(result, 'manual_search')}
                        className="w-full border-b border-[#E9F0F8] px-4 py-3 text-left text-sm text-[#0F172A] transition hover:bg-[#EDF4FF] last:border-b-0"
                      >
                        {result.formatted_address}
                      </button>
                    ))
                  : null}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <input
                  className={inputClassName}
                  placeholder="Country"
                  value={address.country}
                  onChange={(event) => updateField('country', event.target.value)}
                />
                <input
                  className={inputClassName}
                  placeholder="Unit"
                  value={address.unit}
                  onChange={(event) => updateField('unit', event.target.value)}
                />
                <input
                  className={`${inputClassName} col-span-2`}
                  placeholder="Street address"
                  value={address.street_address}
                  onChange={(event) => updateField('street_address', event.target.value)}
                />
                <input
                  className={inputClassName}
                  placeholder="Locality"
                  value={address.locality}
                  onChange={(event) => updateField('locality', event.target.value)}
                />
                <input
                  className={inputClassName}
                  placeholder="State"
                  value={address.state}
                  onChange={(event) => updateField('state', event.target.value)}
                />
                <input
                  className={inputClassName}
                  placeholder="Postcode"
                  value={address.postcode}
                  onChange={(event) => updateField('postcode', event.target.value)}
                />
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <p className="text-xs text-[#64748B]">
                  Required: country, street, locality, state, postcode, and formatted address.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!canContinueStep1) return;
                    setIsAddressModalOpen(false);
                  }}
                  disabled={!canContinueStep1}
                  className="h-11 rounded-full bg-[#6B39F4] px-6 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isMediaModalOpen ? (
          <motion.div
            className="fixed inset-0 z-[95] hidden items-center justify-center bg-[#0B1325]/45 px-8 backdrop-blur-[2px] lg:flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-5xl rounded-[30px] border border-[#E4ECF6] bg-white p-7 shadow-[0_36px_80px_rgba(15,23,42,0.24)]"
              initial={{ opacity: 0, y: 22, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[#0F172A]">
                    Upload photos and videos
                  </h3>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Please add at least 5 photos and 1 video.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D4DEEA] text-[#64748B] transition hover:border-[#A6B6C9] hover:text-[#0F172A]"
                  aria-label="Close media modal"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 6 12 12" />
                    <path d="m18 6-12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => mediaInputRef.current?.click()}
                    className="h-11 rounded-full border border-[#CFDAE8] bg-white px-5 text-sm font-semibold text-[#0B1325] transition hover:border-[#6B39F4]/45"
                  >
                    Browse
                  </button>
                  <button
                    type="button"
                    onClick={() => mediaInputRef.current?.click()}
                    className="h-11 rounded-full border border-[#CFDAE8] bg-[#F8FAFF] px-5 text-sm font-semibold text-[#0B1325] transition hover:border-[#6B39F4]/45"
                  >
                    Add more
                  </button>
                </div>
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void handleMediaSelection(event.target.files);
                    event.target.value = '';
                  }}
                />
              </div>

              <div className="mt-5 max-h-[52vh] overflow-y-auto rounded-2xl border border-[#E4ECF6] bg-[#F9FBFE] p-4">
                {pendingMediaItems.length === 0 ? (
                  <p className="py-14 text-center text-sm text-[#8A97AA]">
                    No files selected yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {pendingMediaItems.map((item) => (
                      <div
                        key={item.id}
                        className="relative overflow-hidden rounded-2xl border border-[#DCE6F1] bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemovePendingMedia(item.id)}
                          className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black"
                          aria-label="Remove media item"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m6 6 12 12" />
                            <path d="m18 6-12 12" />
                          </svg>
                        </button>
                        {item.type === 'video' ? (
                          <video src={item.previewUrl} className="h-64 w-full object-cover" controls muted />
                        ) : (
                          <img src={item.previewUrl} alt={item.name} className="h-64 w-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(false)}
                  className="h-11 rounded-full border border-[#CFDAE8] px-5 text-sm font-semibold text-[#0B1325] transition hover:border-[#94A8C0]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleUploadPendingMedia()}
                  disabled={pendingMediaItems.length === 0}
                  className="h-11 rounded-full bg-[#6B39F4] px-6 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Upload
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.14),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-36 text-[#101828] lg:hidden">
        <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8 pt-8">
          <PageBackButton fallbackHref="/feed" label="Back" />

          <header className="flex flex-col gap-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8A93A8]">
              Guided flow v2
            </p>
            <h1 className="text-[2rem] font-semibold tracking-[-0.065em] text-[#1C2336]">Publish project</h1>
            <p className="text-sm leading-6 text-[#7B879C]">
              Mobile flow will be styled in a separate iteration.
            </p>
          </header>

          <section className={mobileSurfaceClassName}>
            <p className="text-sm leading-6 text-[#667085]">
              Web step 1 was implemented first. Mobile styling will be delivered next.
            </p>
          </section>
        </div>
      </main>

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </>
  );
}
