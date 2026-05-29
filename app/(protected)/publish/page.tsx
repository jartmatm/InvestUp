'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { AnimatePresence, motion } from 'framer-motion';
import Lottie from 'lottie-react';
import BottomNav from '@/components/BottomNav';
import { DesktopAppShell, DesktopSectionCard } from '@/components/DesktopAppShell';
import publishAddressStepAnimation from '@/components/animations/publish-address-step1.json';
import publishStep2Animation from '@/components/animations/publish-step2.json';
import publishStep6Animation from '@/components/animations/publish-step6.json';
import PageBackButton from '@/components/PageBackButton';
import { useInvestApp } from '@/lib/investapp-context';
import {
  fetchCurrentUserPublicationDraft,
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

const mobileSurfaceClassName =
  'rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-[0_22px_52px_rgba(17,24,39,0.08)] backdrop-blur-sm';

const inputClassName =
  'w-full rounded-2xl border border-[#D8E2EC] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2E7CF6] focus:ring-4 focus:ring-[#2E7CF6]/10';

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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9>(1);
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
          const fields = (promptJson as { fields?: unknown }).fields;
          setAddress(normalizeDraftAddress(fields));
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

  const handleContinue = () => {
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

    if (!canContinueStep9) return;
    setStatus('Founder and team details captured. Continue to the next section.');
  };

  const handleSaveAndExit = async () => {
    if (!user?.id || rolSeleccionado !== 'emprendedor' || hasExistingProject) {
      router.push('/feed');
      return;
    }

    setSavingDraft(true);
    const payload = buildDraftPayload(address);
    await saveCurrentUserPublicationDraft(getAccessToken, {
      id: draftId,
      promptJson: payload.promptJson,
      promptText: payload.promptText,
      metadata: {
        ...payload.metadata,
        step: 'entrepreneur_business_intro_v2',
      },
    });
    setSavingDraft(false);
    router.push('/feed');
  };

  if (rolSeleccionado !== 'emprendedor') {
    return <RoleRestrictedState />;
  }

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
          className="relative grid min-h-[74vh] grid-cols-[minmax(0,0.95fr)_minmax(420px,0.8fr)] gap-9 rounded-[34px] border border-[#E3EAF2] bg-white p-10 shadow-[0_26px_70px_rgba(15,23,42,0.06)]"
        >
          <button
            type="button"
            onClick={() => void handleSaveAndExit()}
            className="absolute right-10 top-8 h-10 rounded-full border border-black bg-transparent px-5 text-sm font-medium text-black transition hover:bg-black hover:text-white"
          >
            Save and exit
          </button>

          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() =>
                setCurrentStep(
                  (prev) =>
                    (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) : 1)
                )
              }
              className="absolute left-10 top-8 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D9E2EC] bg-white text-xl font-semibold leading-none text-[#0B1325] transition hover:border-[#B8C7D9]"
              aria-label="Back to previous step"
            >
              {'<'}
            </button>
          ) : null}

          <section className={`${currentStep >= 7 ? 'hidden' : 'flex flex-col justify-center'}`}>
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
            ) : (
              <>
                <h2 className="max-w-xl text-[3.25rem] font-semibold leading-[1.04] tracking-[-0.05em] text-[#0B1325]">
                  Define your investment round details
                </h2>
                <p className="mt-6 max-w-xl text-[1.2rem] leading-8 text-[#4B5B72]">
                  Share funding amount, usage, interest rate, and closing date so investors can evaluate your offer clearly.
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
              {currentStep === 3 &&
              !checkingProject &&
              !hasExistingProject &&
              !savingDraft &&
              selectedBusinessCategory
                ? `Selected category: ${selectedBusinessCategory}.`
                : null}
              {currentStep === 4 &&
              !checkingProject &&
              !hasExistingProject &&
              !savingDraft &&
              businessName.trim().length > 0
                ? `Business name: ${businessName.trim()}.`
                : null}
              {currentStep === 5 &&
              !checkingProject &&
              !hasExistingProject &&
              !savingDraft &&
              selectedOperatingTime
                ? `Operating time: ${selectedOperatingTime}.`
                : null}
              {currentStep === 6 && !checkingProject && !hasExistingProject && !savingDraft
                ? 'Financial section intro is ready.'
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
            </div>

            {status ? <p className="mt-2 text-sm text-[#0B7A52]">{status}</p> : null}

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
                                  : !canContinueStep9
                }
                className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </section>

          <section
            className={`relative flex items-center justify-center ${
              currentStep >= 7 ? 'col-span-2 justify-center pt-20' : ''
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
                className="w-full max-w-[660px] space-y-4"
              >
                <div className="text-center">
                  <h2 className="text-[3.1rem] font-semibold leading-[1.05] tracking-[-0.05em] text-[#0B1325]">
                    Let&apos;s capture what your business does and your monthly performance
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-[1.12rem] leading-7 text-[#4B5B72]">
                    These answers help us build a stronger AI-generated publication for investors.
                  </p>
                </div>

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
                        <p className="text-xs font-medium text-[#5D6A7F]">Total monthly sales</p>
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
                        <p className="text-xs font-medium text-[#5D6A7F]">Average ticket</p>
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
                className="w-full max-w-[660px] space-y-4"
              >
                <div className="text-center">
                  <h2 className="text-[3.1rem] font-semibold leading-[1.05] tracking-[-0.05em] text-[#0B1325]">
                    Define your investment round details
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-[1.12rem] leading-7 text-[#4B5B72]">
                    Share funding amount, usage, interest rate, and closing date so investors can evaluate your offer clearly.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#DCE6F1] bg-white p-5">
                  <label className="block">
                    <p className="text-sm font-semibold text-[#0B1325]">Capital required (USD)</p>
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#DCE6F1] bg-[#FBFDFF] px-4 py-3">
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

                  <label className="mt-5 block">
                    <p className="text-sm font-semibold text-[#0B1325]">What will you use the funds for?</p>
                    <textarea
                      value={fundUsage}
                      onChange={(event) => setFundUsage(event.target.value)}
                      placeholder="Example: inventory expansion, marketing campaigns, hiring, and operations."
                      className={`${inputClassName} mt-3 min-h-[110px] resize-none text-sm`}
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-[#DCE6F1] bg-white p-5">
                  <p className="text-sm font-semibold text-[#0B1325]">Annual interest rate (EA)</p>
                  <div className="mt-4 rounded-xl border border-[#DCE6F1] bg-[#FBFDFF] px-4 py-4">
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

                  <label className="mt-5 block">
                    <p className="text-sm font-semibold text-[#0B1325]">Investment round closing date</p>
                    <input
                      type="date"
                      value={roundCloseDate}
                      onChange={(event) => setRoundCloseDate(event.target.value)}
                      className={`${inputClassName} mt-3 text-sm`}
                    />
                  </label>
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
                className="w-full max-w-[700px] space-y-4"
              >
                <div className="text-center">
                  <h2 className="text-[3.1rem] font-semibold leading-[1.05] tracking-[-0.05em] text-[#0B1325]">
                    Tell us about you and your team
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-[1.12rem] leading-7 text-[#4B5B72]">
                    This helps investors trust the people behind the business.
                  </p>
                </div>

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
                      className={`${inputClassName} mt-3 min-h-[100px] resize-none text-sm`}
                    />
                  </label>
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
                  onClick={handleContinue}
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
