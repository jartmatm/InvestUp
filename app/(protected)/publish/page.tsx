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
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'saas', label: 'SaaS' },
  { id: 'retail', label: 'Retail' },
  { id: 'health', label: 'Health & Wellness' },
  { id: 'education', label: 'Education' },
  { id: 'fintech', label: 'Fintech' },
  { id: 'real_estate', label: 'Real Estate' },
  { id: 'travel', label: 'Travel' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'creative', label: 'Creative Studio' },
  { id: 'agritech', label: 'AgriTech' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'other', label: 'Other' },
];

const isAddressValid = (address: PublishAddressStepFields) =>
  requiredAddressKeys.every((key) => String(address[key]).trim().length > 0);

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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedBusinessCategory, setSelectedBusinessCategory] = useState<string>('');

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

    if (!canContinueStep3) return;
    setStatus('Step 3 ready. Continue to the next step.');
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
              onClick={() => setCurrentStep((prev) => (prev === 3 ? 2 : 1))}
              className="absolute left-10 top-8 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D9E2EC] bg-white text-xl font-semibold leading-none text-[#0B1325] transition hover:border-[#B8C7D9]"
              aria-label="Back to previous step"
            >
              {'<'}
            </button>
          ) : null}

          <section className="flex flex-col justify-center">
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
            ) : (
              <>
                <h2 className="max-w-xl text-[4.15rem] font-semibold leading-[0.95] tracking-[-0.055em] text-[#0B1325]">
                  Which of these best describes your business?
                </h2>
                <p className="mt-6 max-w-xl text-[1.32rem] leading-8 text-[#4B5B72]">
                  Choose one category to continue.
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
                      : !canContinueStep3
                }
                className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </section>

          <section className="relative flex items-center justify-center">
            {currentStep === 3 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="grid w-full grid-cols-3 gap-3"
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
                      className={`rounded-2xl border px-4 py-5 text-left transition ${
                        isSelected
                          ? 'border-[#6B39F4] bg-[#F4EFFF] shadow-[0_14px_30px_rgba(107,57,244,0.16)]'
                          : 'border-[#DCE6F1] bg-white hover:border-[#C8D6E7]'
                      }`}
                    >
                      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF3FB] text-[#263444]">
                        <span className="text-sm font-semibold">{category.label.charAt(0)}</span>
                      </div>
                      <p className="text-sm font-medium text-[#0B1325]">{category.label}</p>
                    </motion.button>
                  );
                })}
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
                    animationData={currentStep === 1 ? publishAddressStepAnimation : publishStep2Animation}
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
