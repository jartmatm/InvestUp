'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { AnimatePresence, motion } from 'framer-motion';
import Lottie from 'lottie-react';
import dayjs from 'dayjs';
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
import { FileUpload } from '@/components/application/file-upload/file-upload-base';
import {
  AccordionContent,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from '@/components/tailgrids/core/accordion';
import { AspectRatio } from '@/components/tailgrids/core/aspect-ratio';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/tailgrids/core/collapsible';
import { TextArea } from '@/components/tailgrids/core/text-area';
import { DatePicker } from '@/core/date-picker/single-date';
import { Spinner } from '@/core/spinner';
import { useInvestApp } from '@/lib/investapp-context';
import {
  createCurrentUserPublicationPrompt,
  fetchCurrentUserPublicationDraft,
  type OptimizedPublication,
  saveCurrentUserPublicationDraft,
} from '@/utils/client/current-user-publication-prompts';
import { uploadCurrentUserProjectMedia } from '@/utils/client/current-user-project-media';
import { createCurrentUserProject, fetchCurrentUserProjects } from '@/utils/client/current-user-projects';
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

type PublishStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

type ProgressStepStatus = 'completed' | 'current' | 'upcoming';

type ProgressStep = {
  title: string;
  description: string;
};

type LeafletModules = {
  leaflet: typeof import('leaflet');
  reactLeaflet: typeof import('react-leaflet');
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

const wizardStepSkeletonDurationMs = 320;
const defaultMobileMapCenter = { lat: -37.8136, lng: 144.9631 };

const inputClassName =
  'w-full rounded-2xl border border-[#D8E2EC] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2E7CF6] focus:ring-4 focus:ring-[#2E7CF6]/10';

const mediaImageMaxDimension = 1600;
const mediaImageWebpQuality = 0.82;
const mediaVideoWebmBitrate = 900_000;
const mediaVideoWebmAudioBitrate = 96_000;

const toWebpFileName = (name: string) => {
  const baseName = name.replace(/\.[^/.]+$/, '');
  return `${baseName || 'business-media'}.webp`;
};

const toWebmFileName = (name: string) => {
  const baseName = name.replace(/\.[^/.]+$/, '');
  return `${baseName || 'business-media'}.webm`;
};

const getSupportedWebmMimeType = () => {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }

  const preferredTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return preferredTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? null;
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

const compressVideoToWebm = async (file: File): Promise<File> => {
  if (!file.type.startsWith('video/')) return file;
  if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') return file;

  const mimeType = getSupportedWebmMimeType();
  if (!mimeType) return file;

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve, reject) => {
      const onLoadedMetadata = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Could not load selected video.'));
      };
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onError);
    });

    const capture = (video as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    }).captureStream?.() ??
      (video as HTMLVideoElement & { mozCaptureStream?: () => MediaStream }).mozCaptureStream?.();

    if (!capture) return file;

    const recordedChunks: BlobPart[] = [];
    const recorder = new MediaRecorder(capture, {
      mimeType,
      videoBitsPerSecond: mediaVideoWebmBitrate,
      audioBitsPerSecond: mediaVideoWebmAudioBitrate,
    });

    const recordingComplete = new Promise<Blob>((resolve, reject) => {
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      });

      recorder.addEventListener('stop', () => {
        if (recordedChunks.length === 0) {
          reject(new Error('No data recorded while converting video.'));
          return;
        }

        resolve(new Blob(recordedChunks, { type: 'video/webm' }));
      });

      recorder.addEventListener('error', () => {
        reject(new Error('MediaRecorder failed while converting video.'));
      });
    });

    recorder.start();
    const playPromise = video.play();
    if (playPromise) {
      await playPromise.catch(() => {
        throw new Error('Could not play selected video for conversion.');
      });
    }

    await new Promise<void>((resolve) => {
      const onEnded = () => {
        video.removeEventListener('ended', onEnded);
        resolve();
      };
      video.addEventListener('ended', onEnded);
    });

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }

    const convertedBlob = await recordingComplete;
    if (convertedBlob.size <= 0) return file;

    if (convertedBlob.size >= file.size && file.type === 'video/webm') {
      return file;
    }

    return new File([convertedBlob], toWebmFileName(file.name), {
      type: 'video/webm',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    video.pause();
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

const operatingTimeDescriptions: Record<(typeof operatingTimeOptions)[number], string> = {
  '< 5 months': 'You are validating the first signals and building early traction.',
  '5 months - 1 year': 'You have recent operating history and early customer evidence.',
  '1 - 3 years': 'You have an established rhythm, sales history, and repeatable operations.',
  '> 5 years': 'You have a mature business with long-term operating experience.',
};

const mobileStepOneProgressSteps = [2, 3, 4, 5, 1, 6] as const;

const countryOptions = [
  'Australia',
  'United States',
  'Canada',
  'United Kingdom',
  'Colombia',
  'Argentina',
  'Brazil',
  'Chile',
  'Mexico',
  'Peru',
  'Spain',
  'France',
  'Germany',
  'Italy',
  'Portugal',
  'Netherlands',
  'Switzerland',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Ireland',
  'New Zealand',
  'Japan',
  'Singapore',
  'South Korea',
  'India',
  'China',
  'United Arab Emirates',
  'South Africa',
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

const buildLongDescriptionFromOptimized = (optimized: OptimizedPublication) => {
  const sectionToText = (value: string | { paragraph?: string | null } | undefined) => {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    return (value.paragraph ?? '').trim();
  };

  const chunks = [
    optimized.description,
    optimized.summary,
    sectionToText(optimized.overview),
    sectionToText(optimized.whatWeDo),
    sectionToText(optimized.howWeDoIt),
    sectionToText(optimized.financialInformation),
    sectionToText(optimized.investment),
    sectionToText(optimized.target),
    sectionToText(optimized.team),
    sectionToText(optimized.gallery),
    sectionToText(optimized.extras),
  ]
    .map((value) => (value ?? '').trim())
    .filter(Boolean);

  const uniqueChunks: string[] = [];
  chunks.forEach((chunk) => {
    if (!uniqueChunks.includes(chunk)) uniqueChunks.push(chunk);
  });

  return uniqueChunks.join('\n\n').slice(0, 5000);
};

const isAddressValid = (address: PublishAddressStepFields) =>
  requiredAddressKeys.every((key) => String(address[key]).trim().length > 0);

const buildFormattedAddressFromManualFields = (address: PublishAddressStepFields) =>
  [
    [address.street_address, address.unit].filter(Boolean).join(', ').trim(),
    address.locality,
    address.state,
    address.postcode,
    address.country,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');

function BusinessCategoryIcon({ id, className = 'h-5 w-5' }: { id: string; className?: string }) {
  const commonProps = {
    className,
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

const isStepInRange = (value: number): value is PublishStep =>
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

function WizardStepSkeletonOverlay() {
  return (
    <div className="absolute inset-0 z-40 rounded-[34px] bg-white/90 p-10 pb-24 backdrop-blur-[1px]">
      <div className="grid h-full grid-cols-[minmax(0,0.95fr)_minmax(420px,0.8fr)] gap-9">
        <div className="flex flex-col justify-center gap-5">
          <div className="h-5 w-24 animate-pulse rounded-full bg-[#E7EDF6]" />
          <div className="h-16 w-[84%] animate-pulse rounded-3xl bg-[#E7EDF6]" />
          <div className="h-16 w-[76%] animate-pulse rounded-3xl bg-[#EDF2F9]" />
          <div className="h-12 w-[52%] animate-pulse rounded-full bg-[#E3EAF5]" />
          <div className="h-11 w-40 animate-pulse rounded-full bg-[#DEDDFB]" />
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-[1040px] space-y-4">
            <div className="h-11 w-56 animate-pulse rounded-2xl bg-[#E7EDF6]" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`wizard-overlay-skeleton-${index}`} className="h-36 animate-pulse rounded-3xl bg-[#EEF3FB]" />
              ))}
            </div>
            <div className="flex justify-end">
              <div className="h-11 w-36 animate-pulse rounded-full bg-[#DDD8FC]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileWizardStepSkeletonOverlay() {
  return (
    <div className="absolute inset-0 z-40 bg-white/90 px-[clamp(1.25rem,5.6vw,2.1rem)] pb-[max(env(safe-area-inset-bottom),0.8rem)] pt-[max(env(safe-area-inset-top),0.8rem)] backdrop-blur-[1px]">
      <div className="mx-auto flex h-full w-full max-w-[560px] flex-col">
        <div className="flex items-center justify-between">
          <div className="h-11 w-11 animate-pulse rounded-full bg-[#ECEEF3]" />
          <div className="h-12 w-36 animate-pulse rounded-full bg-[#ECEEF3]" />
        </div>
        <div className="flex min-h-0 flex-1 items-end justify-center py-5">
          <div className="h-[42dvh] max-h-96 w-full animate-pulse rounded-[32px] bg-[#F0F2F6]" />
        </div>
        <div className="space-y-3 pb-5">
          <div className="h-6 w-24 animate-pulse rounded-full bg-[#ECEEF3]" />
          <div className="h-12 w-[92%] animate-pulse rounded-2xl bg-[#E5E8EF]" />
          <div className="h-12 w-[70%] animate-pulse rounded-2xl bg-[#EEF0F5]" />
          <div className="h-20 w-full animate-pulse rounded-3xl bg-[#F0F2F6]" />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-2 animate-pulse rounded-full bg-[#DED8FE]" />
          <div className="h-2 animate-pulse rounded-full bg-[#ECEEF3]" />
          <div className="h-2 animate-pulse rounded-full bg-[#ECEEF3]" />
        </div>
      </div>
    </div>
  );
}

function MobileMapPreview({
  address,
  compact = false,
}: {
  address: PublishAddressStepFields;
  compact?: boolean;
}) {
  const [leafletModules, setLeafletModules] = useState<LeafletModules | null>(null);
  const mapCenter =
    typeof address.latitude === 'number' && typeof address.longitude === 'number'
      ? { lat: address.latitude, lng: address.longitude }
      : defaultMobileMapCenter;
  const markerPosition: [number, number] = [mapCenter.lat, mapCenter.lng];
  const zoom = typeof address.latitude === 'number' && typeof address.longitude === 'number' ? 15 : 4;

  useEffect(() => {
    let active = true;

    Promise.all([import('leaflet'), import('react-leaflet')]).then(([leaflet, reactLeaflet]) => {
      if (active) setLeafletModules({ leaflet, reactLeaflet });
    });

    return () => {
      active = false;
    };
  }, []);

  if (!leafletModules) {
    return (
      <div
        className={`relative overflow-hidden rounded-[28px] border border-[#DDE7D9] bg-[linear-gradient(135deg,#BBDDE8_0%,#D4ECF3_46%,#BBDDE8_100%)] ${
          compact ? 'h-[clamp(9rem,24dvh,13rem)]' : 'min-h-[clamp(18rem,48dvh,30rem)] flex-1'
        }`}
      >
        <div className="absolute left-1/2 top-1/2 flex h-[clamp(2.9rem,12vw,4rem)] w-[clamp(2.9rem,12vw,4rem)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_10px_28px_rgba(15,23,42,0.2)]">
          <span className="h-[62%] w-[62%] rounded-full bg-black" />
        </div>
      </div>
    );
  }

  const { leaflet, reactLeaflet } = leafletModules;
  const { MapContainer, Marker, TileLayer } = reactLeaflet;
  const markerIcon = leaflet.divIcon({
    className: '',
    html: '<span style="display:flex;height:42px;width:42px;align-items:center;justify-content:center;border-radius:999px;background:white;box-shadow:0 10px 28px rgba(15,23,42,.22)"><span style="height:26px;width:26px;border-radius:999px;background:#000"></span></span>',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-[#DDE7D9] bg-[#CFE8F1] ${
        compact ? 'h-[clamp(9rem,24dvh,13rem)]' : 'min-h-[clamp(18rem,48dvh,30rem)] flex-1'
      }`}
    >
      <MapContainer
        key={`${mapCenter.lat}-${mapCenter.lng}-${zoom}`}
        center={markerPosition}
        zoom={zoom}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={markerPosition} icon={markerIcon} />
      </MapContainer>
    </div>
  );
}

function MobileIntroIcon({ type }: { type: 'describe' | 'standout' | 'publish' }) {
  const commonPathProps = {
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <span className="flex h-[clamp(3.35rem,14vw,5.25rem)] w-[clamp(3.35rem,14vw,5.25rem)] shrink-0 items-center justify-center rounded-[28%] bg-[#F7F7F7] text-black shadow-[0_12px_26px_rgba(15,23,42,0.07)]">
      {type === 'describe' ? (
        <svg viewBox="0 0 64 64" className="h-[66%] w-[66%]" fill="none" aria-hidden="true">
          <path d="M14 49V23l18-10 18 10v26" {...commonPathProps} />
          <path d="M23 49V32h18v17" {...commonPathProps} />
          <path d="M20 25h.01M32 21h.01M44 25h.01" {...commonPathProps} />
          <path d="M13 52h38" {...commonPathProps} />
          <path d="M47 16c4 1.5 6.5 4.9 6.5 9 0 6.6-6.5 12.2-6.5 12.2S40.5 31.6 40.5 25c0-4.1 2.5-7.5 6.5-9Z" {...commonPathProps} />
          <circle cx="47" cy="25" r="2.4" fill="currentColor" />
        </svg>
      ) : null}
      {type === 'standout' ? (
        <svg viewBox="0 0 64 64" className="h-[66%] w-[66%]" fill="none" aria-hidden="true">
          <rect x="14" y="14" width="28" height="36" rx="4" {...commonPathProps} />
          <path d="M20 23h16M20 31h12M20 39h16" {...commonPathProps} />
          <path d="M43 26l5.2 2.2L54 26l-2.2 5.2L54 37l-5.8-2.2L43 37l2.2-5.8L43 26Z" {...commonPathProps} />
          <path d="M11 50h42" {...commonPathProps} />
          <path d="M45 45h8" {...commonPathProps} />
        </svg>
      ) : null}
      {type === 'publish' ? (
        <svg viewBox="0 0 64 64" className="h-[66%] w-[66%]" fill="none" aria-hidden="true">
          <path d="M16 49h32" {...commonPathProps} />
          <path d="M20 49V18h24v31" {...commonPathProps} />
          <path d="M29 49V36h8v13" {...commonPathProps} />
          <path d="M27 25h10" {...commonPathProps} />
          <path d="M45 17l4-4 4 4" {...commonPathProps} />
          <path d="M49 13v17" {...commonPathProps} />
          <path d="M13 28l6-6" {...commonPathProps} />
          <path d="M13 22h6v6" {...commonPathProps} />
        </svg>
      ) : null}
    </span>
  );
}

function MobilePublishIntroSplash({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: () => void;
}) {
  const steps = [
    {
      number: '1',
      title: 'Describe your venture',
      description:
        'Share the basics investors need first: location, category, and your registered business name.',
      icon: 'describe' as const,
    },
    {
      number: '2',
      title: 'Make it stand out',
      description:
        'Add at least five photos, optional videos, a strong title, and a clear description. We will help polish it.',
      icon: 'standout' as const,
    },
    {
      number: '3',
      title: 'Finish and publish',
      description:
        'Choose your funding goal, installments, interest rate, review the details, and launch your listing.',
      icon: 'publish' as const,
    },
  ];

  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-white text-[#1F1F1F] lg:hidden">
      <div className="flex shrink-0 items-center px-[clamp(1rem,5vw,1.75rem)] pt-[max(env(safe-area-inset-top),0.65rem)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close publish flow"
          className="flex h-[clamp(2.5rem,10vw,3rem)] w-[clamp(2.5rem,10vw,3rem)] items-center justify-center rounded-full text-[#1F1F1F] transition active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-[68%] w-[68%]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 px-[clamp(1.25rem,5.6vw,2.1rem)] pb-[clamp(0.45rem,1.7dvh,0.9rem)]">
        <section className="mx-auto grid h-full w-full max-w-[560px] grid-rows-[auto_1fr]">
          <h1 className="mt-[clamp(1.1rem,5.2dvh,3.6rem)] max-w-[12.5ch] text-[clamp(2.08rem,8.3vw,3.35rem)] font-extrabold leading-[1.02] tracking-[-0.064em] text-[#1F1F1F]">
            Getting started with InvestApp is simple
          </h1>

          <div className="mt-[clamp(1rem,3.8dvh,2.7rem)] min-h-0 divide-y divide-[#ECECEC]">
            {steps.map((step) => (
              <div key={step.number}>
                <article className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[clamp(0.65rem,3vw,1.15rem)] py-[clamp(0.75rem,2.6dvh,1.65rem)]">
                  <p className="self-start pt-0.5 text-[clamp(1.18rem,4.8vw,1.7rem)] font-medium leading-none text-[#1F1F1F]">
                    {step.number}
                  </p>
                  <div className="min-w-0">
                    <h2 className="text-[clamp(1.15rem,5vw,1.75rem)] font-extrabold leading-[1.06] tracking-[-0.038em] text-[#1F1F1F]">
                      {step.title}
                    </h2>
                    <p className="mt-[clamp(0.35rem,1dvh,0.55rem)] text-[clamp(0.82rem,3.55vw,1.08rem)] font-medium leading-[1.22] tracking-[-0.018em] text-[#6F6F6F]">
                      {step.description}
                    </p>
                  </div>
                  <MobileIntroIcon type={step.icon} />
                </article>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="shrink-0 bg-white px-[clamp(1.25rem,5.6vw,2.1rem)] pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-[clamp(0.35rem,1.3dvh,0.85rem)]">
        <button
          type="button"
          onClick={onStart}
          className="mx-auto flex min-h-[clamp(3.2rem,7.4dvh,4.25rem)] w-full max-w-[560px] items-center justify-center rounded-[18px] bg-[#6B39F4] px-6 text-[clamp(0.98rem,4.1vw,1.24rem)] font-bold tracking-[-0.02em] text-white shadow-[0_18px_36px_rgba(107,57,244,0.24)] transition active:scale-[0.985]"
        >
          Let&apos;s get started
        </button>
      </div>
    </main>
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
  const [currentStep, setCurrentStep] = useState<PublishStep>(1);
  const [isStepTransitionLoading, setIsStepTransitionLoading] = useState(false);
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
  const roundCloseDateValue = useMemo<Date | null>(
    () => (roundCloseDate ? dayjs(roundCloseDate).toDate() : null),
    [roundCloseDate],
  );
  const roundCloseDateMinValue = useMemo(() => dayjs().startOf('day').toDate(), []);
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
  const [isContinuing, setIsContinuing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishRequested, setPublishRequested] = useState(false);
  const [showMobileIntro, setShowMobileIntro] = useState(true);
  const stepSkeletonTimeoutRef = useRef<number | null>(null);
  const mediaItemsRef = useRef<UploadMediaItem[]>([]);
  const mobileLocationRequestedRef = useRef(false);

  const canContinueStep1 = useMemo(
    () => isAddressValid(address) && !checkingProject && !hasExistingProject,
    [address, checkingProject, hasExistingProject]
  );

  const canContinueStep2 = useMemo(
    () => !checkingProject && !hasExistingProject,
    [checkingProject, hasExistingProject]
  );

  const canContinueStep3 = useMemo(
    () =>
      selectedBusinessCategory.trim().length > 0 &&
      !checkingProject &&
      !hasExistingProject,
    [selectedBusinessCategory, checkingProject, hasExistingProject]
  );

  const canContinueStep4 = useMemo(
    () =>
      businessName.trim().length > 0 &&
      !checkingProject &&
      !hasExistingProject,
    [businessName, checkingProject, hasExistingProject]
  );

  const canContinueStep5 = useMemo(
    () =>
      selectedOperatingTime.trim().length > 0 &&
      !checkingProject &&
      !hasExistingProject,
    [selectedOperatingTime, checkingProject, hasExistingProject]
  );

  const canContinueStep6 = useMemo(
    () => !checkingProject && !hasExistingProject,
    [checkingProject, hasExistingProject]
  );

  const canContinueStep7 = useMemo(
    () =>
      businessOffer.trim().length > 0 &&
      businessDifferentiator.trim().length > 0 &&
      Number(monthlySales) > 0 &&
      Number(averageTicket) > 0 &&
      Number(monthlyClients) > 0 &&
      !checkingProject &&
      !hasExistingProject,
    [
      businessOffer,
      businessDifferentiator,
      monthlySales,
      averageTicket,
      monthlyClients,
      checkingProject,
      hasExistingProject,
    ]
  );

  const canContinueStep8 = useMemo(
    () =>
      Number(capitalRequiredUsd) > 0 &&
      fundUsage.trim().length > 0 &&
      Number(interestRateEA) > 0 &&
      roundCloseDate.trim().length > 0 &&
      !checkingProject &&
      !hasExistingProject,
    [
      capitalRequiredUsd,
      fundUsage,
      interestRateEA,
      roundCloseDate,
      checkingProject,
      hasExistingProject,
    ]
  );

  const canContinueStep9 = useMemo(
    () =>
      aboutFounder.trim().length > 0 &&
      aboutTeam.trim().length > 0 &&
      !checkingProject &&
      !hasExistingProject,
    [
      aboutFounder,
      aboutTeam,
      checkingProject,
      hasExistingProject,
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
    () => !checkingProject && !hasExistingProject,
    [checkingProject, hasExistingProject]
  );

  const canContinueStep11 = useMemo(
    () =>
      mediaCounts.photos >= 5 &&
      !checkingProject &&
      !hasExistingProject &&
      !isUploadingMedia,
    [mediaCounts, checkingProject, hasExistingProject, isUploadingMedia]
  );

  const canContinueStep12 = useMemo(
    () =>
      generatedTittle.trim().length > 0 &&
      generatedTittle.trim().length <= 50 &&
      !checkingProject &&
      !hasExistingProject &&
      !isGeneratingPublication,
    [generatedTittle, checkingProject, hasExistingProject, isGeneratingPublication]
  );

  const canContinueStep13 = useMemo(
    () =>
      generatedDescription.trim().length > 0 &&
      generatedDescription.trim().length <= 5000 &&
      !checkingProject &&
      !hasExistingProject &&
      !isGeneratingPublication,
    [
      generatedDescription,
      checkingProject,
      hasExistingProject,
      isGeneratingPublication,
    ]
  );

  const canContinueStep14 = useMemo(
    () => !checkingProject && !hasExistingProject,
    [checkingProject, hasExistingProject]
  );

  const canContinueStep15 = useMemo(
    () =>
      complianceSelections.length > 0 &&
      !checkingProject &&
      !hasExistingProject,
    [complianceSelections, checkingProject, hasExistingProject]
  );

  const canContinueStep16 = useMemo(
    () => !checkingProject && !hasExistingProject,
    [checkingProject, hasExistingProject]
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

  const goToStep = (nextStep: PublishStep, withSkeleton = true) => {
    setCurrentStep(nextStep);

    if (!withSkeleton) {
      setIsStepTransitionLoading(false);
      return;
    }

    setIsStepTransitionLoading(true);

    if (stepSkeletonTimeoutRef.current !== null) {
      window.clearTimeout(stepSkeletonTimeoutRef.current);
    }

    stepSkeletonTimeoutRef.current = window.setTimeout(() => {
      setIsStepTransitionLoading(false);
      stepSkeletonTimeoutRef.current = null;
    }, wizardStepSkeletonDurationMs);
  };

  useEffect(
    () => () => {
      if (stepSkeletonTimeoutRef.current !== null) {
        window.clearTimeout(stepSkeletonTimeoutRef.current);
      }
    },
    []
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
            goToStep(stepValue, false);
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
        if (error.includes('returned 429')) {
          setStatus('Address service is busy. Please wait a few seconds and try again.');
        } else {
          setStatus(`Address search failed: ${error}`);
        }
      } else {
        setStatus('');
        setSearchResults(data);
      }

      setIsSearching(false);
    }, 700);

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

  useEffect(() => {
    mediaItemsRef.current = [...pendingMediaItems, ...uploadedMediaItems];
  }, [pendingMediaItems, uploadedMediaItems]);

  useEffect(
    () => () => {
      mediaItemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
      });
    },
    []
  );

  useEffect(() => {
    if (currentStep !== 16 || previewPhotos.length <= 1) return;

    const timer = window.setInterval(() => {
      setActivePhotoIndex((previous) => (previous + 1) % previewPhotos.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [currentStep, previewPhotos.length]);

  useEffect(() => {
    if (currentStep !== 18) return;

    const timer = window.setTimeout(() => {
      setShowSuccessHomeButton(true);
    }, 1700);

    return () => window.clearTimeout(timer);
  }, [currentStep]);

  const applyAddressRecord = useCallback((record: BusinessAddressRecord, source: Exclude<AddressSource, ''>) => {
    setAddress(toAddressFromGeocode(record, source));
    setSearchQuery(record.formatted_address);
    setStatus('');
    setHasInteracted(true);
  }, []);

  const handleUseMyLocation = useCallback(() => {
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
  }, [applyAddressRecord]);

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

  const handleSaveManualAddress = () => {
    const formattedManualAddress = buildFormattedAddressFromManualFields(address);
    const manualAddressWithFormatted: PublishAddressStepFields = {
      ...address,
      formatted_address: formattedManualAddress || address.formatted_address.trim(),
      source: address.source || 'manual_edit',
    };

    if (!isAddressValid(manualAddressWithFormatted)) {
      setStatus('Complete country, street, locality, state, and formatted address.');
      return;
    }

    setAddress(manualAddressWithFormatted);
    setHasInteracted(true);
    setStatus('');
    setIsAddressModalOpen(false);
  };

  useEffect(() => {
    if (showMobileIntro || currentStep !== 1 || mobileLocationRequestedRef.current || address.formatted_address) return;

    mobileLocationRequestedRef.current = true;
    handleUseMyLocation();
  }, [address.formatted_address, currentStep, handleUseMyLocation, showMobileIntro]);

  const handleMediaSelection = async (fileList: FileList | null) => {
    if (!fileList) return;

    const files = Array.from(fileList).filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    const mapped = await Promise.all(
      files.map(async (file) => {
        const type = file.type.startsWith('video/') ? ('video' as const) : ('photo' as const);
        const preparedFile =
          type === 'photo' ? await compressImageToWebp(file) : await compressVideoToWebm(file);

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

  const handleRemoveUploadedMedia = (mediaId: string) => {
    setUploadedMediaItems((previous) => {
      const target = previous.find((item) => item.id === mediaId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return previous.filter((item) => item.id !== mediaId);
    });
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

  const buildPublicationPromptText = (fields: ReturnType<typeof buildPublicationFields>) =>
    Object.entries(fields)
      .map(([key, value]) => `${key}: ${value || 'Not provided'}`)
      .join('\n');

  const handlePublishListing = useCallback(async () => {
    if (isPublishing) return;
    setIsPublishing(true);
    setStatus('Uploading media...');
    const fields = buildPublicationFields();
    try {
      const mediaFiles = uploadedMediaItems.map((item) => item.file);
      const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value.trim());

      let uploadedPhotos: string[] = [];
      let uploadedVideo: string | null = null;

      if (mediaFiles.length > 0) {
        const mediaUploadResult = await uploadCurrentUserProjectMedia(getAccessToken, mediaFiles, {
          timeoutMs: 120_000,
          onProgress: ({ index, total, fileName }) => {
            setStatus(`Uploading media... (${index}/${total}) ${fileName}`);
          },
        });
        if (mediaUploadResult.error || !mediaUploadResult.data) {
          setStatus(`Could not upload media: ${mediaUploadResult.error ?? 'Unknown error.'}`);
          goToStep(16, false);
          return;
        }
        uploadedPhotos = mediaUploadResult.data
          .filter((item) => item.type === 'photo')
          .map((item) => item.publicUrl);
        uploadedVideo =
          mediaUploadResult.data.find((item) => item.type === 'video')?.publicUrl ?? null;
      } else {
        uploadedPhotos = previewPhotos
          .map((item) => item.previewUrl)
          .filter((url) => isRemoteUrl(url));
        uploadedVideo =
          previewVideo && isRemoteUrl(previewVideo.previewUrl) ? previewVideo.previewUrl : null;
      }

      if (uploadedPhotos.length === 0) {
        setStatus('Could not publish project: at least one photo is required.');
        goToStep(16, false);
        return;
      }

      setStatus('Creating publication...');
      const normalizedAmountRequested =
        Number(capitalRequiredUsd) > 0 ? Number(capitalRequiredUsd) : 1000;
      const normalizedMinimumInvestment = Math.max(
        50,
        Math.floor(normalizedAmountRequested * 0.05)
      );
      const normalizedInterestRate = Number(interestRateEA) >= 0 ? Number(interestRateEA) : 0;
      const publicationEndDate =
        roundCloseDate && dayjs(roundCloseDate).isAfter(dayjs())
          ? roundCloseDate
          : dayjs().add(30, 'day').format('YYYY-MM-DD');
      const openingDate = dayjs().format('YYYY-MM-DD');
      const phoneNumber = registeredWhatsappNumber || '0000000000';

      const publishProjectResult = await createCurrentUserProject(getAccessToken, {
        title: generatedTittle.trim() || businessName.trim() || 'Business opportunity',
        business_name: businessName.trim() || 'Business',
        sector: selectedBusinessCategory.trim() || 'General',
        legal_representative: aboutFounder.trim() || businessName.trim() || 'Business owner',
        opening_date: openingDate,
        address: address.formatted_address.trim() || 'Address not provided',
        phone: phoneNumber,
        city: address.locality.trim() || 'Unknown city',
        country: address.country.trim() || 'Unknown country',
        description: generatedDescription.trim() || businessOffer.trim() || 'Business opportunity',
        publication_end_date: publicationEndDate,
        currency: 'USD',
        amount_requested: normalizedAmountRequested,
        minimum_investment: normalizedMinimumInvestment,
        installment_count: 12,
        interest_rate: normalizedInterestRate,
        photo_urls: uploadedPhotos,
        video_url: uploadedVideo,
        metadata: {
          source: 'publish_wizard',
          publication_form_fields: fields,
          optimized_publication: generatedPublication,
          generated_publication: {
            tittle: generatedTittle,
            description: generatedDescription,
          },
          operating_time: selectedOperatingTime,
          funds_usage: fundUsage,
          compliance_selections: complianceSelections,
        },
      });

      if (publishProjectResult.error || !publishProjectResult.data) {
        setStatus(`Could not publish project: ${publishProjectResult.error ?? 'Unknown error.'}`);
        goToStep(16, false);
        return;
      }

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
        goToStep(16, false);
        return;
      }

      setDraftId(result.data.id);
      setStatus('');
      setShowSuccessHomeButton(false);
      goToStep(18, false);
    } finally {
      setIsPublishing(false);
      setPublishRequested(false);
    }
  }, [
    isPublishing,
    buildPublicationFields,
    getAccessToken,
    uploadedMediaItems,
    previewPhotos,
    previewVideo,
    capitalRequiredUsd,
    interestRateEA,
    roundCloseDate,
    registeredWhatsappNumber,
    generatedTittle,
    generatedPublication,
    businessName,
    selectedBusinessCategory,
    aboutFounder,
    address.formatted_address,
    address.locality,
    address.country,
    generatedDescription,
    businessOffer,
    selectedOperatingTime,
    fundUsage,
    complianceSelections,
    draftId,
    goToStep,
    buildPublicationPromptText,
  ]);

  useEffect(() => {
    if (currentStep !== 17 || !publishRequested || isPublishing) return;

    void handlePublishListing();
  }, [currentStep, publishRequested, isPublishing, handlePublishListing]);

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
    if (isContinuing) return;
    setIsContinuing(true);
    try {
    if (currentStep === 1) {
      if (!canContinueStep1) return;
      goToStep(2);
      setStatus('');
      return;
    }

    if (currentStep === 2) {
      if (!canContinueStep2) return;
      goToStep(3);
      setStatus('');
      return;
    }

    if (currentStep === 3) {
      if (!canContinueStep3) return;
      goToStep(4);
      setStatus('');
      return;
    }

    if (currentStep === 4) {
      if (!canContinueStep4) return;
      goToStep(5);
      setStatus('');
      return;
    }

    if (currentStep === 5) {
      if (!canContinueStep5) return;
      goToStep(6);
      setStatus('');
      return;
    }

    if (currentStep === 6) {
      if (!canContinueStep6) return;
      goToStep(7);
      setStatus('');
      return;
    }

    if (currentStep === 7) {
      if (!canContinueStep7) return;
      goToStep(8);
      setStatus('');
      return;
    }

    if (currentStep === 8) {
      if (!canContinueStep8) return;
      goToStep(9);
      setStatus('');
      return;
    }

    if (currentStep === 9) {
      if (!canContinueStep9) return;
      goToStep(10);
      setStatus('');
      return;
    }

    if (currentStep === 10) {
      if (!canContinueStep10) return;
      goToStep(11);
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
      const descriptionValue = buildLongDescriptionFromOptimized(optimized);
      setGeneratedPublication(optimized);
      setGeneratedTittle(tittleValue);
      setGeneratedDescription(descriptionValue);
      setIsGeneratingPublication(false);
      setStatus('');
      goToStep(12);
      return;
    }

    if (currentStep === 12) {
      if (!canContinueStep12) return;
      goToStep(13);
      setStatus('');
      return;
    }

    if (currentStep === 13) {
      if (!canContinueStep13) return;
      goToStep(14);
      setStatus('');
      return;
    }

    if (currentStep === 14) {
      if (!canContinueStep14) return;
      goToStep(15);
      setStatus('');
      return;
    }

    if (currentStep === 15) {
      if (!canContinueStep15) return;
      goToStep(16);
      setStatus('');
      return;
    }

    if (!canContinueStep16) return;
    setStatus('Preview ready. You can publish now.');
    } finally {
      setIsContinuing(false);
    }
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

  const mobileProgressSegmentFills = (() => {
    if (currentStep <= 6) {
      const currentIndex = mobileStepOneProgressSteps.findIndex((step) => step === currentStep);
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;
      return [((safeIndex + 1) / mobileStepOneProgressSteps.length) * 100, 0, 0];
    }

    if (currentStep <= 13) return [100, 100, 0];
    return [100, 100, 100];
  })();

  const canContinueCurrentStep =
    currentStep === 1
      ? canContinueStep1
      : currentStep === 2
        ? canContinueStep2
        : currentStep === 3
          ? canContinueStep3
          : currentStep === 4
            ? canContinueStep4
            : currentStep === 5
              ? canContinueStep5
              : currentStep === 6
                ? canContinueStep6
                : currentStep === 7
                  ? canContinueStep7
                  : currentStep === 8
                    ? canContinueStep8
                    : currentStep === 9
                      ? canContinueStep9
                      : currentStep === 10
                        ? canContinueStep10
                        : currentStep === 11
                          ? canContinueStep11
                          : currentStep === 12
                            ? canContinueStep12
                            : currentStep === 13
                              ? canContinueStep13
                              : currentStep === 14
                                ? canContinueStep14
                                : currentStep === 15
                                  ? canContinueStep15
                                  : currentStep === 16
                                    ? canContinueStep16
                                    : false;

  const handleMobileContinue = async () => {
    if (isContinuing) return;

    if (currentStep === 5) {
      if (!canContinueStep5) return;
      setIsContinuing(true);
      try {
        goToStep(1);
        setStatus('');
      } finally {
        setIsContinuing(false);
      }
      return;
    }

    if (currentStep === 1) {
      if (!canContinueStep1) return;
      setIsContinuing(true);
      try {
        goToStep(6);
        setStatus('');
      } finally {
        setIsContinuing(false);
      }
      return;
    }

    await handleContinue();
  };

  const handleMobileBack = () => {
    if (currentStep === 2) {
      setShowMobileIntro(true);
      return;
    }

    if (currentStep === 1) {
      goToStep(5);
      return;
    }

    if (currentStep === 6) {
      goToStep(1);
      return;
    }

    if (currentStep > 1) {
      goToStep((currentStep - 1) as PublishStep);
    }
  };

  const showWizardSkeleton = checkingProject || isStepTransitionLoading;

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
          className={`relative overflow-visible rounded-[34px] border border-[#E3EAF2] bg-white p-10 shadow-[0_26px_70px_rgba(15,23,42,0.06)] ${
            currentStep === 17 || currentStep === 18
              ? 'flex h-[82vh] items-center justify-center'
              : 'grid h-[80vh] grid-cols-[minmax(0,0.95fr)_minmax(420px,0.8fr)] gap-9 pb-24'
          }`}
        >
          {showWizardSkeleton ? <WizardStepSkeletonOverlay /> : null}

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
              onClick={() => goToStep((currentStep - 1) as PublishStep)}
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
              currentStep !== 17 &&
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
                  You&apos;ll need at least 5 photos to get started. You can add a video optionally and make changes later.
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

            {currentStep !== 17 && currentStep !== 18 ? (
              <>
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
                    ? ''
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
                    ? `${generatedDescription.trim().length}/5000 characters used.`
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
                </div>

                {status ? <p className="mt-2 text-sm text-[#0B7A52]">{status}</p> : null}
              </>
            ) : null}

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

            {currentStep !== 17 && currentStep !== 18 ? (
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
                      || isContinuing
                  }
                  className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isContinuing ? (
                    <>
                      <Spinner size="sm" type="dotted" className="mr-2 inline-block align-[-4px]" />
                      Saving...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            ) : null}
          </section>

          <section
            className={`relative flex items-center justify-center ${
              currentStep === 7 ||
              currentStep === 8 ||
              currentStep === 9 ||
              currentStep === 11 ||
              currentStep === 16 ||
              currentStep === 17 ||
              currentStep === 18
                ? 'col-span-2'
                : ''
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
                className="w-full max-w-[1120px] space-y-4"
              >
                <div className="text-center">
                  <h2 className="mx-auto max-w-4xl text-[2.65rem] font-semibold leading-[1.03] tracking-[-0.052em] text-[#0B1325]">
                    Let&apos;s capture what your business does and your monthly performance
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-[1rem] leading-6 text-[#4B5B72]">
                    These answers help us build a stronger AI-generated publication for investors.
                  </p>
                </div>

                <div className="grid grid-cols-[minmax(0,1.08fr)_minmax(320px,0.78fr)] gap-4">
                  <AccordionRoot variant="style_two" className="gap-3">
                    <AccordionItem className="overflow-hidden rounded-2xl border border-[#DCE6F1] bg-white shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
                      <AccordionTrigger className="px-5 py-4 text-base font-semibold tracking-[-0.03em] text-[#0B1325] data-[state=open]:pb-3">
                        What do you sell exactly?
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-0">
                        <p className="mb-3 text-xs leading-5 text-[#5D6A7F]">
                          Describe the products or services your business offers.
                        </p>
                        <TextArea
                          value={businessOffer}
                          onChange={(event) => setBusinessOffer(event.target.value)}
                          placeholder="Example: We sell healthy ready-to-eat meals and weekly subscriptions for offices."
                          className="min-h-[132px] resize-none rounded-2xl border-[#DCE6F1] bg-[#FBFDFF] text-sm text-[#0B1325] placeholder:text-[#9AA8BA] focus:border-[#6B39F4] focus:ring-[#6B39F4]/10"
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem className="overflow-hidden rounded-2xl border border-[#DCE6F1] bg-white shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
                      <AccordionTrigger className="px-5 py-4 text-base font-semibold tracking-[-0.03em] text-[#0B1325] data-[state=open]:pb-3">
                        What makes you different from competitors?
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-0">
                        <p className="mb-3 text-xs leading-5 text-[#5D6A7F]">
                          Tell us what you do differently and why customers choose you.
                        </p>
                        <TextArea
                          value={businessDifferentiator}
                          onChange={(event) => setBusinessDifferentiator(event.target.value)}
                          placeholder="Example: We deliver in under 30 minutes with nutrition plans customized by dietitians."
                          className="min-h-[132px] resize-none rounded-2xl border-[#DCE6F1] bg-[#FBFDFF] text-sm text-[#0B1325] placeholder:text-[#9AA8BA] focus:border-[#6B39F4] focus:ring-[#6B39F4]/10"
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </AccordionRoot>

                  <Collapsible className="max-w-none overflow-hidden rounded-2xl border border-[#DCE6F1] bg-white shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
                    <CollapsibleTrigger className="px-5 py-4 text-base font-semibold tracking-[-0.03em] text-[#0B1325]">
                      <span>Monthly business metrics</span>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 transition group-data-expanded:rotate-180" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 px-5 pb-5">
                      {[
                        {
                          label: 'Total monthly sales (Units)',
                          value: monthlySales,
                          onChange: setMonthlySales,
                        },
                        {
                          label: 'Average ticket (USD)',
                          value: averageTicket,
                          onChange: setAverageTicket,
                        },
                        {
                          label: 'Monthly clients',
                          value: monthlyClients,
                          onChange: setMonthlyClients,
                        },
                      ].map((metric) => (
                        <label
                          key={metric.label}
                          className="block rounded-xl border border-[#DCE6F1] bg-[#FBFDFF] px-4 py-3"
                        >
                          <span className="block text-xs font-medium text-[#5D6A7F]">{metric.label}</span>
                          <input
                            type="number"
                            min="0"
                            value={metric.value}
                            onChange={(event) => metric.onChange(event.target.value)}
                            placeholder="0"
                            className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-semibold text-[#0B1325] outline-none placeholder:text-[#9AA8BA]"
                          />
                        </label>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!canContinueStep7 || isContinuing}
                    className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isContinuing ? (
                      <>
                        <Spinner size="sm" type="dotted" className="mr-2 inline-block align-[-4px]" />
                        Saving...
                      </>
                    ) : (
                      'Continue'
                    )}
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

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(330px,0.72fr)]">
                  <div className="space-y-4">
                    <AccordionRoot variant="style_two" className="gap-3">
                      <AccordionItem className="overflow-hidden rounded-3xl border border-[#DCE6F1] bg-white shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
                        <AccordionTrigger className="px-5 py-4 text-base font-semibold tracking-[-0.03em] text-[#0B1325] data-[state=open]:pb-3">
                          Capital required and interest rate
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 px-5 pb-5 pt-0">
                          <label className="block">
                            <p className="text-sm font-semibold text-[#0B1325]">Capital required (USD)</p>
                            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#DCE6F1] bg-[#FBFDFF] px-4 py-3">
                              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FB] text-black">
                                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                                className="w-full border-0 bg-transparent p-0 text-base font-semibold text-[#0B1325] outline-none placeholder:text-[#9AA8BA]"
                              />
                            </div>
                          </label>

                          <div>
                            <p className="text-sm font-semibold text-[#0B1325]">Annual interest rate (EA)</p>
                            <div className="mt-2 rounded-2xl border border-[#DCE6F1] bg-[#FBFDFF] px-4 py-3">
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
                                    className="w-full rounded-xl border border-[#DCE6F1] bg-white px-3 py-2 text-sm font-semibold text-[#0B1325] outline-none focus:border-[#6B39F4]"
                                  />
                                </div>
                              </div>
                              <p className="mt-2 text-xs text-[#5D6A7F]">Set your offered effective annual rate (%)</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </AccordionRoot>

                    <label className="block rounded-3xl border border-[#DCE6F1] bg-white p-5 shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
                      <p className="text-sm font-semibold text-[#0B1325]">What will you use the funds for?</p>
                      <p className="mt-1 text-xs leading-5 text-[#5D6A7F]">
                        Be specific about how the capital turns into growth.
                      </p>
                      <TextArea
                        value={fundUsage}
                        onChange={(event) => setFundUsage(event.target.value)}
                        placeholder="Example: inventory expansion, marketing campaigns, hiring, and operations."
                        className="mt-3 min-h-[126px] resize-none rounded-2xl border-[#DCE6F1] bg-[#FBFDFF] text-sm"
                      />
                    </label>
                  </div>

                  <div className="rounded-3xl border border-[#DCE6F1] bg-white p-5 shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
                    <p className="text-sm font-semibold text-[#0B1325]">Investment round closing date</p>
                    <p className="mt-1 text-xs leading-5 text-[#5D6A7F]">
                      Choose the last day investors can participate in this round.
                    </p>
                    <DatePicker
                      value={roundCloseDateValue}
                      minDate={roundCloseDateMinValue}
                      onChange={(date) => setRoundCloseDate(dayjs(date).format('YYYY-MM-DD'))}
                      placeholder="Select closing date"
                      className="mt-4"
                    />
                    <div className="mt-4 rounded-2xl bg-[#F7F9FC] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A8798]">
                        Selected close date
                      </p>
                      <p className="mt-1 text-lg font-semibold tracking-[-0.035em] text-[#0B1325]">
                        {roundCloseDate ? dayjs(roundCloseDate).format('MMMM D, YYYY') : 'Not selected yet'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!canContinueStep8 || isContinuing}
                    className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isContinuing ? (
                      <>
                        <Spinner size="sm" type="dotted" className="mr-2 inline-block align-[-4px]" />
                        Saving...
                      </>
                    ) : (
                      'Continue'
                    )}
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
                    disabled={!canContinueStep9 || isContinuing}
                    className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isContinuing ? (
                      <>
                        <Spinner size="sm" type="dotted" className="mr-2 inline-block align-[-4px]" />
                        Saving...
                      </>
                    ) : (
                      'Continue'
                    )}
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
                        <AspectRatio
                          key={`media-skeleton-${index}`}
                          customRatio={1.6}
                          className="animate-pulse rounded-2xl border border-[#E4ECF6] bg-[#EEF3FB]"
                        >
                          <span className="sr-only">Loading media</span>
                        </AspectRatio>
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
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRemoveUploadedMedia(item.id);
                              }}
                              className="absolute right-2 top-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FF4D4F] text-white shadow-[0_10px_20px_rgba(239,68,68,0.3)] transition hover:bg-[#E63537]"
                              aria-label="Remove media"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                            </button>
                            {item.type === 'video' ? (
                              <AspectRatio customRatio={1.6}>
                                <video
                                  src={item.previewUrl}
                                  className="h-full w-full object-cover"
                                  controls
                                  muted
                                />
                              </AspectRatio>
                            ) : (
                              <AspectRatio customRatio={1.6}>
                                <img
                                  src={item.previewUrl}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              </AspectRatio>
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
                        disabled={!canContinueStep11 || isContinuing}
                        className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isContinuing ? (
                          <>
                            <Spinner size="sm" type="dotted" className="mr-2 inline-block align-[-4px]" />
                            Saving...
                          </>
                        ) : (
                          'Continue'
                        )}
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
                      onChange={(event) => setGeneratedDescription(event.target.value.slice(0, 5000))}
                      maxLength={5000}
                      rows={9}
                      className={`${inputClassName} mt-3 resize-none text-base`}
                    />
                  </label>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#6A778D]">
                    <span>
                      {generatedPublication ? 'AI publication response received.' : 'Waiting for API response.'}
                    </span>
                    <span>{generatedDescription.length}/5000</span>
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
                className="flex h-full w-full min-h-0 flex-col gap-4 pb-20"
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

                <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-[#DCE6F1] bg-white pb-8 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
                  <AspectRatio ratio="21/9" className="bg-[#EEF3FB]">
                    <div className="relative h-full w-full overflow-hidden">
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
                  </AspectRatio>

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
                        <AspectRatio ratio="video" className="overflow-hidden rounded-xl">
                          <video src={previewVideo.previewUrl} controls className="h-full w-full object-cover" />
                        </AspectRatio>
                      </div>
                    ) : null}

                    <div className="flex justify-center pb-2">
                      {status ? <p className="mr-4 self-center text-sm text-[#0B7A52]">{status}</p> : null}
                      <button
                        type="button"
                        onClick={() => {
                          if (isPublishing) return;
                          setPublishRequested(true);
                          setStatus('');
                          goToStep(17, false);
                        }}
                        disabled={isPublishing}
                        className="h-12 rounded-full bg-[#6B39F4] px-7 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE]"
                      >
                        {isPublishing ? (
                          <>
                            <Spinner size="sm" type="dotted" className="mr-2 inline-block align-[-4px]" />
                            Publishing...
                          </>
                        ) : (
                          'Publish'
                        )}
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
                className="flex h-full w-full flex-col items-center justify-center"
              >
                <Lottie
                  animationData={publishStep17PublishingAnimation}
                  loop
                  autoplay
                  className="h-[92%] w-[92%] max-h-full max-w-full"
                />
                <p className="mt-2 text-center text-base font-medium text-[#334155]">
                  <Spinner size="md" type="dotted-round" className="mx-auto mb-3" />
                  {status || 'Publishing your project...'}
                </p>
              </motion.div>
            ) : currentStep === 18 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex h-full w-full flex-col items-center justify-center"
              >
                <Lottie
                  animationData={publishStep18SuccessAnimation}
                  loop
                  autoplay
                  className="h-[82%] w-[82%] max-h-full max-w-full"
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
                  Required: country, street, locality, and state. Postcode is optional.
                </p>
                <button
                  type="button"
                  onClick={handleSaveManualAddress}
                  className="h-11 rounded-full bg-[#6B39F4] px-6 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(107,57,244,0.24)] transition hover:bg-[#5A2FCE] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save address
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isAddressModalOpen ? (
          <motion.div
            className="fixed inset-0 z-[95] flex items-end bg-black/35 backdrop-blur-[2px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="max-h-[92dvh] w-full overflow-hidden rounded-t-[34px] bg-white shadow-[0_-22px_60px_rgba(15,23,42,0.28)]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <div className="flex items-center border-b border-[#ECECEC] px-[clamp(1.25rem,5.6vw,2rem)] pb-4 pt-[max(env(safe-area-inset-top),1rem)]">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[#242424] transition active:scale-95"
                  aria-label="Close address editor"
                >
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2">
                    <path d="M6 6l12 12" />
                    <path d="M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <div className="max-h-[calc(92dvh-5rem)] overflow-y-auto px-[clamp(1.25rem,5.6vw,2rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 [-webkit-overflow-scrolling:touch]">
                <h2 className="text-[clamp(2rem,8.5vw,3.25rem)] font-extrabold leading-[0.98] tracking-[-0.068em] text-[#1F1F1F]">
                  Enter your business address
                </h2>

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
                    className="h-14 w-full rounded-2xl border border-[#D7D7D7] bg-white px-4 text-base font-semibold text-[#1F1F1F] outline-none transition placeholder:text-[#8E8E8E] focus:border-[#242424]"
                  />

                  <div className="max-h-36 overflow-y-auto rounded-2xl border border-[#E2E2E2] bg-[#FAFAFA]">
                    {isSearching ? <p className="px-4 py-3 text-sm font-semibold text-[#6F6F6F]">Searching addresses...</p> : null}
                    {!isSearching && searchResults.length > 0
                      ? searchResults.map((result) => (
                          <button
                            key={`mobile-${result.provider_place_id}-${result.formatted_address}`}
                            type="button"
                            onClick={() => applyAddressRecord(result, 'manual_search')}
                            className="w-full border-b border-[#EAEAEA] px-4 py-3 text-left text-sm font-semibold text-[#242424] last:border-b-0"
                          >
                            {result.formatted_address}
                          </button>
                        ))
                      : null}
                    {!isSearching && searchResults.length === 0 ? (
                      <p className="px-4 py-3 text-sm font-medium text-[#8A8A8A]">Type 3+ characters or edit the fields manually.</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[24px] border border-[#9D9D9D]">
                  <label className="block border-b border-[#9D9D9D] px-4 py-3">
                    <span className="block text-sm font-semibold text-[#777777]">Country / region</span>
                    <select
                      value={address.country}
                      onChange={(event) => updateField('country', event.target.value)}
                      className="mt-1 h-9 w-full bg-transparent text-[1.35rem] font-medium tracking-[-0.04em] text-[#242424] outline-none"
                    >
                      <option value="">Select a country</option>
                      {countryOptions.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block border-b border-[#9D9D9D] px-4 py-4">
                    <span className="block text-sm font-semibold text-[#777777]">Flat number</span>
                    <input
                      value={address.unit}
                      onChange={(event) => updateField('unit', event.target.value)}
                      placeholder="Optional"
                      className="mt-1 w-full bg-transparent text-[1.25rem] font-medium tracking-[-0.035em] text-[#242424] outline-none placeholder:text-[#9A9A9A]"
                    />
                  </label>

                  <label className="block border-b border-[#9D9D9D] px-4 py-4">
                    <span className="block text-sm font-semibold text-[#777777]">Street number / name</span>
                    <input
                      value={address.street_address}
                      onChange={(event) => updateField('street_address', event.target.value)}
                      placeholder="55 Haines Street"
                      className="mt-1 w-full bg-transparent text-[1.25rem] font-medium tracking-[-0.035em] text-[#242424] outline-none placeholder:text-[#9A9A9A]"
                    />
                  </label>

                  <label className="block border-b border-[#9D9D9D] px-4 py-4">
                    <span className="block text-sm font-semibold text-[#777777]">Location / suburb</span>
                    <input
                      value={address.locality}
                      onChange={(event) => updateField('locality', event.target.value)}
                      placeholder="North Melbourne"
                      className="mt-1 w-full bg-transparent text-[1.25rem] font-medium tracking-[-0.035em] text-[#242424] outline-none placeholder:text-[#9A9A9A]"
                    />
                  </label>

                  <label className="block border-b border-[#9D9D9D] px-4 py-4">
                    <span className="block text-sm font-semibold text-[#777777]">State / province</span>
                    <input
                      value={address.state}
                      onChange={(event) => updateField('state', event.target.value)}
                      placeholder="Victoria"
                      className="mt-1 w-full bg-transparent text-[1.25rem] font-medium tracking-[-0.035em] text-[#242424] outline-none placeholder:text-[#9A9A9A]"
                    />
                  </label>

                  <label className="block px-4 py-4">
                    <span className="block text-sm font-semibold text-[#777777]">Postal code</span>
                    <input
                      value={address.postcode}
                      onChange={(event) => updateField('postcode', event.target.value)}
                      placeholder="Optional"
                      className="mt-1 w-full bg-transparent text-[1.25rem] font-medium tracking-[-0.035em] text-[#242424] outline-none placeholder:text-[#9A9A9A]"
                    />
                  </label>
                </div>

                <div className="mt-5">
                  <MobileMapPreview address={address} compact />
                </div>

                {status ? <p className="mt-3 text-sm font-semibold text-[#6B39F4]">{status}</p> : null}

                <button
                  type="button"
                  onClick={handleSaveManualAddress}
                  className="mt-5 flex h-14 w-full items-center justify-center rounded-[16px] bg-[#242424] text-lg font-extrabold tracking-[-0.04em] text-white transition active:scale-[0.99]"
                >
                  Looks good
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
                    Please add at least 5 photos. Video is optional.
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

              <div className="mt-5">
                <FileUpload.DropZone
                  accept="image/*,video/*"
                  allowsMultiple
                  hint="PNG, JPG, WEBP or videos (MP4/WEBM). Minimum 5 photos. Video optional."
                  onDropFiles={(files) => {
                    void handleMediaSelection(files);
                  }}
                  className="border border-dashed border-[#CFDAE8] bg-[#F8FAFF] text-[#4B5565] ring-0"
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
                          <AspectRatio ratio="video">
                            <video src={item.previewUrl} className="h-full w-full object-cover" controls muted />
                          </AspectRatio>
                        ) : (
                          <AspectRatio ratio="video">
                            <img src={item.previewUrl} alt={item.name} className="h-full w-full object-cover" />
                          </AspectRatio>
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

      {showMobileIntro ? (
        <MobilePublishIntroSplash
          onClose={() => router.push('/feed')}
          onStart={() => {
            goToStep(2, false);
            setShowMobileIntro(false);
          }}
        />
      ) : (
        <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-white text-[#1F1F1F] lg:hidden">
          {showWizardSkeleton ? <MobileWizardStepSkeletonOverlay /> : null}

          <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-[clamp(1rem,5vw,1.75rem)] pt-[max(env(safe-area-inset-top),0.65rem)]">
            <button
              type="button"
              onClick={() => void handleSaveAndExit()}
              aria-label="Close publish flow and save draft"
              className="flex h-[clamp(2.5rem,10vw,3rem)] w-[clamp(2.5rem,10vw,3rem)] items-center justify-center rounded-full text-[#1F1F1F] transition active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="h-[68%] w-[68%]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </svg>
            </button>

            <button
              type="button"
              className="h-[clamp(2.8rem,10.5vw,3.45rem)] rounded-full border border-[#DEDEDE] bg-white px-[clamp(1rem,5vw,1.6rem)] text-[clamp(0.92rem,4vw,1.18rem)] font-extrabold tracking-[-0.035em] text-[#252525] shadow-[0_8px_18px_rgba(15,23,42,0.035)] transition active:scale-[0.98]"
            >
              Need help?
            </button>
          </header>

          <section className="mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col px-[clamp(1.25rem,5.6vw,2.1rem)] pb-[clamp(0.75rem,2.8dvh,1.45rem)]">
            {currentStep === 1 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex min-h-0 flex-1 flex-col pt-[clamp(1.45rem,5.5dvh,3.4rem)]"
              >
                <h1 className="max-w-[11.5ch] text-[clamp(2.05rem,9vw,3.65rem)] font-extrabold leading-[0.98] tracking-[-0.068em] text-[#1F1F1F]">
                  Set your business address
                </h1>
                <p className="mt-[clamp(0.75rem,2dvh,1.15rem)] max-w-[31rem] text-[clamp(0.95rem,3.95vw,1.24rem)] font-medium leading-[1.3] tracking-[-0.024em] text-[#6F6F6F]">
                  Start by selecting the exact address of your venture. We will prefill the structured fields
                  for country, unit, street, locality, state, and postcode.
                </p>

                <div className="relative mt-[clamp(1.2rem,3.4dvh,2rem)] min-h-0 flex-1">
                  <MobileMapPreview address={address} />
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="absolute left-4 right-4 top-4 flex min-h-[clamp(3.5rem,8.2dvh,4.65rem)] items-center gap-4 rounded-full bg-white px-[clamp(1rem,4.5vw,1.45rem)] text-left shadow-[0_16px_34px_rgba(15,23,42,0.16)] transition active:scale-[0.99]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3F3F3] text-[#1F1F1F]">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                        <path d="M12 2.25A7.25 7.25 0 0 0 4.75 9.5c0 5.2 6.35 11.6 6.62 11.87a.9.9 0 0 0 1.26 0c.27-.27 6.62-6.67 6.62-11.87A7.25 7.25 0 0 0 12 2.25Zm0 10.1a2.85 2.85 0 1 1 0-5.7 2.85 2.85 0 0 1 0 5.7Z" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[clamp(1rem,4.2vw,1.26rem)] font-extrabold tracking-[-0.04em] text-[#252525]">
                        {address.formatted_address || 'Search your address'}
                      </span>
                      {geolocationLoading ? (
                        <span className="mt-1 block text-sm font-semibold text-[#6B39F4]">Resolving your location...</span>
                      ) : null}
                    </span>
                  </button>
                </div>

                {status && currentStep === 1 ? (
                  <p className="mt-2 text-sm font-semibold text-[#6B39F4]">{status}</p>
                ) : null}
              </motion.div>
            ) : currentStep === 3 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="min-h-0 flex-1 overflow-y-auto pt-[clamp(1.6rem,6dvh,4.1rem)] [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
              >
                <h1 className="max-w-[13ch] text-[clamp(2rem,8.8vw,3.55rem)] font-extrabold leading-[0.98] tracking-[-0.068em] text-[#1F1F1F]">
                  Which of these best describes your business?
                </h1>

                <div className="mt-[clamp(1.45rem,4dvh,2.45rem)] grid grid-cols-2 gap-[clamp(0.75rem,3.3vw,1.1rem)] pb-6">
                  {businessCategories.map((category) => {
                    const isSelected = selectedBusinessCategory === category.label;
                    return (
                      <motion.button
                        key={category.id}
                        type="button"
                        onClick={() => setSelectedBusinessCategory(category.label)}
                        whileTap={{ scale: 0.985 }}
                        className={`flex min-h-[clamp(7.2rem,19dvh,10rem)] flex-col items-start justify-between rounded-[18px] border bg-white p-[clamp(0.9rem,4vw,1.35rem)] text-left transition ${
                          isSelected
                            ? 'border-[#6B39F4] shadow-[0_16px_30px_rgba(107,57,244,0.16)] ring-2 ring-[#6B39F4]/15'
                            : 'border-[#DEDEDE] shadow-[0_5px_12px_rgba(15,23,42,0.025)]'
                        }`}
                      >
                        <span
                          className={`flex h-[clamp(2.45rem,10.5vw,3.25rem)] w-[clamp(2.45rem,10.5vw,3.25rem)] items-center justify-center rounded-2xl ${
                            isSelected ? 'bg-[#F2EEFF] text-[#4D20D8]' : 'bg-white text-[#222222]'
                          }`}
                        >
                          <BusinessCategoryIcon id={category.id} className="h-[clamp(1.7rem,7vw,2.25rem)] w-[clamp(1.7rem,7vw,2.25rem)]" />
                        </span>
                        <span className="text-[clamp(0.98rem,4.4vw,1.28rem)] font-extrabold leading-[1.05] tracking-[-0.042em] text-[#262626]">
                          {category.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ) : currentStep === 4 ? (
              <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,0.98fr)_auto]">
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="flex min-h-0 items-end justify-center"
                >
                  <Lottie
                    animationData={publishStep4NameAnimation}
                    loop
                    autoplay
                    className="h-full max-h-[clamp(16rem,42dvh,26rem)] w-full"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
                  className="pb-[clamp(0.9rem,2.6dvh,1.6rem)]"
                >
                  <h1 className="max-w-[10.5ch] text-[clamp(2.18rem,9.4vw,3.85rem)] font-extrabold leading-[0.96] tracking-[-0.07em] text-[#1F1F1F]">
                    Great, now let&apos;s name your business
                  </h1>
                  <p className="mt-[clamp(0.75rem,2dvh,1.1rem)] text-[clamp(0.96rem,4.05vw,1.32rem)] font-medium leading-[1.32] tracking-[-0.024em] text-[#343434]">
                    Give your venture a clear name investors will recognize instantly.
                  </p>

                  <label className="mt-[clamp(1rem,2.8dvh,1.55rem)] block rounded-[24px] border border-[#DEDEDE] bg-white p-[clamp(0.8rem,3.5vw,1rem)] shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition focus-within:border-[#6B39F4]">
                    <span className="mb-2 block px-2 text-[clamp(0.72rem,3vw,0.86rem)] font-extrabold uppercase tracking-[0.12em] text-[#777777]">
                      Business name
                    </span>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      placeholder="Enter your business name"
                      className="h-[clamp(3.15rem,7.2dvh,4rem)] w-full rounded-[18px] border border-[#EFEFEF] bg-[#FAFAFA] px-4 text-[clamp(1rem,4.2vw,1.25rem)] font-bold tracking-[-0.035em] text-[#1F1F1F] outline-none transition placeholder:text-[#A5A5A5] focus:border-[#6B39F4] focus:bg-white focus:ring-4 focus:ring-[#6B39F4]/10"
                    />
                  </label>
                </motion.div>
              </div>
            ) : currentStep === 5 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="min-h-0 flex-1 overflow-y-auto pt-[clamp(1.6rem,6dvh,4.1rem)] [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
              >
                <h1 className="max-w-[12ch] text-[clamp(2rem,8.8vw,3.55rem)] font-extrabold leading-[0.98] tracking-[-0.068em] text-[#1F1F1F]">
                  How long has your business been operating?
                </h1>
                <p className="mt-[clamp(0.75rem,2dvh,1.15rem)] max-w-[28rem] text-[clamp(0.98rem,4.05vw,1.3rem)] font-medium leading-[1.32] tracking-[-0.024em] text-[#6F6F6F]">
                  Pick the option that best matches your current stage.
                </p>

                <div className="mt-[clamp(1.35rem,3.8dvh,2.25rem)] space-y-[clamp(0.75rem,2.5dvh,1.1rem)] pb-6">
                  {operatingTimeOptions.map((option) => {
                    const isSelected = selectedOperatingTime === option;
                    return (
                      <motion.button
                        key={option}
                        type="button"
                        onClick={() => setSelectedOperatingTime(option)}
                        whileTap={{ scale: 0.99 }}
                        className={`flex w-full items-center gap-4 rounded-[24px] border bg-white p-[clamp(1rem,4.5vw,1.45rem)] text-left transition ${
                          isSelected
                            ? 'border-[#242424] shadow-[0_14px_28px_rgba(15,23,42,0.08)]'
                            : 'border-[#DEDEDE] shadow-[0_5px_12px_rgba(15,23,42,0.025)]'
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[clamp(1.05rem,4.5vw,1.38rem)] font-extrabold leading-[1.05] tracking-[-0.043em] text-[#262626]">
                            {option}
                          </span>
                          <span className="mt-2 block text-[clamp(0.86rem,3.7vw,1.08rem)] font-medium leading-[1.28] tracking-[-0.02em] text-[#747474]">
                            {operatingTimeDescriptions[option]}
                          </span>
                        </span>
                        <span
                          className={`flex h-[clamp(2.65rem,10.5vw,3.35rem)] w-[clamp(2.65rem,10.5vw,3.35rem)] shrink-0 items-center justify-center rounded-2xl ${
                            isSelected ? 'bg-[#F2EEFF] text-[#4D20D8]' : 'bg-white text-[#242424]'
                          }`}
                        >
                          <svg viewBox="0 0 24 24" className="h-[68%] w-[68%]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" aria-hidden="true">
                            <circle cx="12" cy="12" r="8" />
                            <path d="M12 7v5l3.2 2" />
                          </svg>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ) : currentStep === 6 ? (
              <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.08fr)_auto]">
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="flex min-h-0 items-end justify-center"
                >
                  <Lottie
                    animationData={publishStep6Animation}
                    loop
                    autoplay
                    className="h-full max-h-[clamp(17rem,47dvh,28rem)] w-full"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
                  className="pb-[clamp(0.9rem,2.6dvh,1.6rem)]"
                >
                  <p className="text-[clamp(1.05rem,4.4vw,1.38rem)] font-extrabold leading-none tracking-[-0.035em] text-[#242424]">
                    Step 2
                  </p>
                  <h1 className="mt-[clamp(0.55rem,1.6dvh,0.9rem)] max-w-[11.5ch] text-[clamp(2.25rem,10vw,4.05rem)] font-extrabold leading-[0.94] tracking-[-0.07em] text-[#1F1F1F]">
                    Make your business stand out
                  </h1>
                  <p className="mt-[clamp(0.75rem,2dvh,1.15rem)] text-[clamp(0.98rem,4.2vw,1.42rem)] font-medium leading-[1.32] tracking-[-0.026em] text-[#333333]">
                    In this section, we&apos;ll collect key financial information from your business, then
                    help you craft a strong title and description for investors.
                  </p>
                </motion.div>
              </div>
            ) : currentStep === 7 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="min-h-0 flex-1 overflow-y-auto pt-[clamp(1.35rem,4.8dvh,3.1rem)] [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
              >
                <h1 className="max-w-[12ch] text-[clamp(2rem,8.6vw,3.45rem)] font-extrabold leading-[0.98] tracking-[-0.068em] text-[#1F1F1F]">
                  Let&apos;s capture what your business does and your monthly performance
                </h1>
                <p className="mt-[clamp(0.75rem,2dvh,1.1rem)] max-w-[30rem] text-[clamp(0.94rem,3.9vw,1.22rem)] font-medium leading-[1.3] tracking-[-0.024em] text-[#6F6F6F]">
                  These answers help us build a stronger AI-generated publication for investors.
                </p>

                <div className="mt-[clamp(1.15rem,3.2dvh,1.9rem)] space-y-3 pb-6">
                  <AccordionRoot variant="style_two" className="gap-3">
                    <AccordionItem className="overflow-hidden rounded-[24px] border border-[#DEDEDE] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                      <AccordionTrigger className="py-5 pl-[calc(1.25rem+5px)] pr-5 text-[clamp(1rem,4.25vw,1.25rem)] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#242424] data-[state=open]:pb-3">
                        What do you sell exactly?
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-0">
                        <p className="mb-3 text-sm font-medium leading-5 text-[#777777]">
                          Describe the products or services your business offers.
                        </p>
                        <TextArea
                          value={businessOffer}
                          onChange={(event) => setBusinessOffer(event.target.value)}
                          placeholder="Example: We sell healthy ready-to-eat meals and weekly subscriptions for offices."
                          className="min-h-[9rem] resize-none rounded-[20px] border-[#E2E2E2] bg-[#FAFAFA] text-[1rem] font-semibold leading-6 tracking-[-0.025em] text-[#242424] placeholder:text-[#9A9A9A] focus:border-[#6B39F4] focus:ring-[#6B39F4]/10"
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem className="overflow-hidden rounded-[24px] border border-[#DEDEDE] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                      <AccordionTrigger className="py-5 pl-[calc(1.25rem+5px)] pr-5 text-[clamp(1rem,4.25vw,1.25rem)] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#242424] data-[state=open]:pb-3">
                        What makes you different from competitors?
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-0">
                        <p className="mb-3 text-sm font-medium leading-5 text-[#777777]">
                          Tell us why customers choose you and what is hard to copy.
                        </p>
                        <TextArea
                          value={businessDifferentiator}
                          onChange={(event) => setBusinessDifferentiator(event.target.value)}
                          placeholder="Example: We deliver in under 30 minutes with plans customized by dietitians."
                          className="min-h-[9rem] resize-none rounded-[20px] border-[#E2E2E2] bg-[#FAFAFA] text-[1rem] font-semibold leading-6 tracking-[-0.025em] text-[#242424] placeholder:text-[#9A9A9A] focus:border-[#6B39F4] focus:ring-[#6B39F4]/10"
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </AccordionRoot>

                  <Collapsible className="max-w-none overflow-hidden rounded-[24px] border border-[#DEDEDE] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                    <CollapsibleTrigger className="px-5 py-5 text-[clamp(1rem,4.25vw,1.25rem)] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#242424]">
                      <span>Monthly business metrics</span>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 transition group-data-expanded:rotate-180" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 px-5 pb-5">
                      <label className="block rounded-[20px] border border-[#E2E2E2] bg-[#FAFAFA] px-4 py-3">
                        <span className="block text-xs font-extrabold uppercase tracking-[0.12em] text-[#777777]">
                          Total monthly sales
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={monthlySales}
                          onChange={(event) => setMonthlySales(event.target.value)}
                          placeholder="0"
                          className="mt-1 h-10 w-full bg-transparent text-[1.2rem] font-extrabold tracking-[-0.04em] text-[#242424] outline-none placeholder:text-[#9A9A9A]"
                        />
                      </label>

                      <label className="block rounded-[20px] border border-[#E2E2E2] bg-[#FAFAFA] px-4 py-3">
                        <span className="block text-xs font-extrabold uppercase tracking-[0.12em] text-[#777777]">
                          Average ticket
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={averageTicket}
                          onChange={(event) => setAverageTicket(event.target.value)}
                          placeholder="0"
                          className="mt-1 h-10 w-full bg-transparent text-[1.2rem] font-extrabold tracking-[-0.04em] text-[#242424] outline-none placeholder:text-[#9A9A9A]"
                        />
                      </label>

                      <label className="block rounded-[20px] border border-[#E2E2E2] bg-[#FAFAFA] px-4 py-3">
                        <span className="block text-xs font-extrabold uppercase tracking-[0.12em] text-[#777777]">
                          Monthly clients
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={monthlyClients}
                          onChange={(event) => setMonthlyClients(event.target.value)}
                          placeholder="0"
                          className="mt-1 h-10 w-full bg-transparent text-[1.2rem] font-extrabold tracking-[-0.04em] text-[#242424] outline-none placeholder:text-[#9A9A9A]"
                        />
                      </label>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </motion.div>
            ) : currentStep === 8 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="min-h-0 flex-1 overflow-y-auto pt-[clamp(1.35rem,4.8dvh,3.1rem)] [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
              >
                <h1 className="max-w-[12ch] text-[clamp(2rem,8.6vw,3.45rem)] font-extrabold leading-[0.98] tracking-[-0.068em] text-[#1F1F1F]">
                  Define your investment round details
                </h1>
                <p className="mt-[clamp(0.75rem,2dvh,1.1rem)] max-w-[31rem] text-[clamp(0.94rem,3.9vw,1.22rem)] font-medium leading-[1.3] tracking-[-0.024em] text-[#6F6F6F]">
                  Share the target amount, investor return, use of funds, and closing date for this round.
                </p>

                <div className="mt-[clamp(1.15rem,3.2dvh,1.9rem)] space-y-3 pb-6">
                  <AccordionRoot variant="style_two" className="gap-3">
                    <AccordionItem className="overflow-hidden rounded-[24px] border border-[#DEDEDE] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                      <AccordionTrigger className="py-5 pl-[calc(1.25rem+5px)] pr-5 text-[clamp(1rem,4.25vw,1.25rem)] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#242424] data-[state=open]:pb-3">
                        Capital required and interest rate
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 px-5 pb-5 pt-0">
                        <label className="block rounded-[20px] border border-[#E2E2E2] bg-[#FAFAFA] px-4 py-3">
                          <span className="block text-xs font-extrabold uppercase tracking-[0.12em] text-[#777777]">
                            Capital required (USD)
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={capitalRequiredUsd}
                            onChange={(event) => setCapitalRequiredUsd(event.target.value)}
                            placeholder="0"
                            className="mt-1 h-11 w-full bg-transparent text-[1.35rem] font-extrabold tracking-[-0.045em] text-[#242424] outline-none placeholder:text-[#9A9A9A]"
                          />
                        </label>

                        <div className="rounded-[20px] border border-[#E2E2E2] bg-[#FAFAFA] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#777777]">
                              Annual interest rate (EA)
                            </span>
                            <input
                              type="number"
                              min="1"
                              max="60"
                              step="0.5"
                              value={interestRateEA}
                              onChange={(event) => setInterestRateEA(event.target.value)}
                              placeholder="0"
                              className="h-10 w-20 rounded-2xl border border-[#E2E2E2] bg-white px-3 text-right text-base font-extrabold tracking-[-0.035em] text-[#242424] outline-none focus:border-[#6B39F4]"
                            />
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="60"
                            step="0.5"
                            value={interestRateEA || '1'}
                            onChange={(event) => setInterestRateEA(event.target.value)}
                            className="mt-4 h-2 w-full cursor-pointer accent-[#6B39F4]"
                          />
                          <p className="mt-2 text-sm font-medium leading-5 text-[#777777]">
                            Set the effective annual rate offered to investors.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </AccordionRoot>

                  <Collapsible className="max-w-none overflow-hidden rounded-[24px] border border-[#DEDEDE] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                    <CollapsibleTrigger className="px-5 py-5 text-[clamp(1rem,4.25vw,1.25rem)] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#242424]">
                      <span>What will you use the funds for?</span>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 transition group-data-expanded:rotate-180" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-5 pb-5">
                      <p className="mb-3 text-sm font-medium leading-5 text-[#777777]">
                        Be specific about how the capital turns into growth.
                      </p>
                      <TextArea
                        value={fundUsage}
                        onChange={(event) => setFundUsage(event.target.value)}
                        placeholder="Example: inventory expansion, marketing campaigns, hiring, and operations."
                        className="min-h-[9rem] resize-none rounded-[20px] border-[#E2E2E2] bg-[#FAFAFA] text-[1rem] font-semibold leading-6 tracking-[-0.025em] text-[#242424] placeholder:text-[#9A9A9A] focus:border-[#6B39F4] focus:ring-[#6B39F4]/10"
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="rounded-[24px] border border-[#DEDEDE] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                    <p className="text-[clamp(1rem,4.25vw,1.25rem)] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#242424]">
                      Investment round closing date
                    </p>
                    <p className="mt-2 text-sm font-medium leading-5 text-[#777777]">
                      Choose the last day investors can participate in this round.
                    </p>
                    <DatePicker
                      value={roundCloseDateValue}
                      minDate={roundCloseDateMinValue}
                      onChange={(date) => setRoundCloseDate(dayjs(date).format('YYYY-MM-DD'))}
                      placeholder="Select closing date"
                      className="mt-4"
                    />
                    <div className="mt-3 rounded-[20px] bg-[#F7F7F7] px-4 py-3">
                      <span className="block text-xs font-extrabold uppercase tracking-[0.12em] text-[#777777]">
                        Selected close date
                      </span>
                      <span className="mt-1 block text-[1.1rem] font-extrabold tracking-[-0.04em] text-[#242424]">
                        {roundCloseDate ? dayjs(roundCloseDate).format('MMMM D, YYYY') : 'Not selected yet'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.08fr)_auto]">
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="flex min-h-0 items-end justify-center"
                >
                  <Lottie
                    animationData={publishStep2Animation}
                    loop
                    autoplay
                    className="h-full max-h-[clamp(17rem,47dvh,28rem)] w-full"
                  />
                </motion.div>

                <div className="pb-[clamp(0.9rem,2.6dvh,1.6rem)]">
                  <p className="text-[clamp(1.05rem,4.4vw,1.38rem)] font-extrabold leading-none tracking-[-0.035em] text-[#242424]">
                    Step 1
                  </p>
                  <h1 className="mt-[clamp(0.55rem,1.6dvh,0.9rem)] max-w-[11.5ch] text-[clamp(2.25rem,10vw,4.05rem)] font-extrabold leading-[0.94] tracking-[-0.07em] text-[#1F1F1F]">
                    Tell us about your entrepreneur business
                  </h1>
                  <p className="mt-[clamp(0.75rem,2dvh,1.15rem)] text-[clamp(0.98rem,4.2vw,1.42rem)] font-medium leading-[1.32] tracking-[-0.026em] text-[#333333]">
                    We&apos;ll ask what type of business you run, what investors will fund, and the first details
                    that help your opportunity feel clear and investable.
                  </p>
                </div>
              </div>
            )}

            <div className="shrink-0 space-y-[clamp(1rem,2.8dvh,1.45rem)] bg-white pt-[clamp(0.35rem,1.2dvh,0.8rem)]">
              <div className="grid grid-cols-3 gap-1.5">
                {mobileProgressSegmentFills.map((fill, index) => (
                  <span
                    key={`mobile-progress-${index}`}
                    className="h-[clamp(0.42rem,1.6vw,0.56rem)] overflow-hidden rounded-full bg-[#E9E9E9]"
                  >
                    <span
                      className="block h-full rounded-full bg-[#6B39F4] transition-[width] duration-300 ease-out"
                      style={{ width: `${fill}%` }}
                    />
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between gap-5 pb-[max(env(safe-area-inset-bottom),0rem)]">
                <button
                  type="button"
                  onClick={handleMobileBack}
                  className="text-[clamp(1rem,4.2vw,1.25rem)] font-extrabold tracking-[-0.035em] text-[#242424] underline decoration-2 underline-offset-4 transition active:scale-[0.98]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void handleMobileContinue()}
                  disabled={!canContinueCurrentStep || isContinuing}
                  className="flex min-h-[clamp(3.35rem,7.8dvh,4.25rem)] min-w-[clamp(9rem,34vw,12rem)] items-center justify-center rounded-[16px] bg-[#6B39F4] px-6 text-[clamp(1rem,4.1vw,1.25rem)] font-extrabold tracking-[-0.035em] text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-[#DCDCDC] disabled:shadow-none"
                >
                  {isContinuing ? (
                    <>
                      <Spinner size="sm" type="dotted" className="mr-2 inline-block align-[-4px]" />
                      Saving...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </div>
          </section>
        </main>
      )}
    </>
  );
}
