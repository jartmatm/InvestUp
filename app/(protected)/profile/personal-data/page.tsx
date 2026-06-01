'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useLocale, useTranslations } from 'next-intl';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';
import BottomNav from '@/components/BottomNav';
import {
  DesktopAppShell,
  DesktopMetricCard,
  DesktopSectionCard,
} from '@/components/DesktopAppShell';
import { Avatar } from '@/components/tailgrids/core/avatar';
import { AppCombobox } from '@/components/tailgrids/core/app-combobox';
import { Button } from '@/components/tailgrids/core/button';
import { useInvestApp } from '@/lib/investapp-context';
import { writeProfileAvatarCache, writeProfileSummaryCache } from '@/lib/profile-summary-cache';
import {
  fetchCurrentUserRoleChangeEligibility,
  type CurrentUserRoleChangeEligibility,
} from '@/utils/client/current-user-role-change-eligibility';
import {
  fetchCurrentUserKycSummary,
  uploadCurrentUserKycDocument,
} from '@/utils/client/current-user-kyc';
import {
  fetchCurrentUserProfile,
  patchCurrentUserProfile,
} from '@/utils/client/current-user-profile';
import {
  KYC_ALLOWED_DOCUMENT_ACCEPT,
  formatKycLevelLimit,
  getKycLevelBadgeLabel,
  type CurrentUserKycSummary,
  type KycDocumentType,
} from '@/utils/kyc/shared';

type ProfileForm = {
  id: string;
  email: string;
  name: string;
  surname: string;
  phone_number: string;
  country: string;
  gender: string;
  address: string;
  role: 'investor' | 'entrepreneur' | '';
  avatar_url: string;
};

type CountryOption = { code: string; name: string; dialCode: string };

type SurfaceProps = {
  children: ReactNode;
  className?: string;
};

type FieldShellProps = {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  helper?: ReactNode;
};

const getCountryOptions = (locale: string): CountryOption[] => {
  const regionNames = new Intl.DisplayNames([locale, 'en'], { type: 'region' });
  return getCountries()
    .map((code) => ({
      code,
      name: regionNames.of(code) ?? code,
      dialCode: `+${getCountryCallingCode(code)}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
};

const emptyForm: ProfileForm = {
  id: '',
  email: '',
  name: '',
  surname: '',
  country: '',
  phone_number: '',
  gender: '',
  address: '',
  role: '',
  avatar_url: '',
};

const fieldControlClassName =
  'w-full bg-transparent text-[0.98rem] font-medium tracking-[-0.025em] text-[#162033] outline-none placeholder:text-[#9BA5B9] disabled:text-[#9BA5B9]';

const mapDbRoleToFront = (role: string): 'inversor' | 'emprendedor' | null => {
  if (role === 'investor') return 'inversor';
  if (role === 'entrepreneur') return 'emprendedor';
  return null;
};

const mapFrontRoleToDb = (role: 'inversor' | 'emprendedor' | null): 'investor' | 'entrepreneur' | '' => {
  if (role === 'inversor') return 'investor';
  if (role === 'emprendedor') return 'entrepreneur';
  return '';
};

const getDocumentTone = (status?: string) => {
  if (status === 'approved') return 'border-[#9FE3BE] bg-[#E8F9F1] text-[#14845A]';
  if (status === 'rejected') return 'border-[#F4B3BD] bg-[#FFF1F3] text-[#C73A57]';
  if (status === 'submitted') return 'border-[#FFDB93] bg-[#FFF7E6] text-[#C77C00]';
  return 'border-[#E3D9FF] bg-[#F6F1FF] text-[#6B39F4]';
};

const getDocumentLabelKey = (status?: string) => {
  if (status === 'approved') return 'documentStatus.approved';
  if (status === 'rejected') return 'documentStatus.rejected';
  if (status === 'submitted') return 'documentStatus.submitted';
  return 'documentStatus.missing';
};

const getStatusTone = (message: string) => {
  if (/could not|error/i.test(message)) {
    return 'border-[#F4C3CB] bg-[#FFF3F5] text-[#B93852]';
  }

  if (/uploaded|updated|success/i.test(message)) {
    return 'border-[#BEE8D2] bg-[#EEF9F2] text-[#177B58]';
  }

  return 'border-[#E4D9FF] bg-[#F6F1FF] text-[#6B39F4]';
};

function Surface({ children, className = '' }: SurfaceProps) {
  return (
    <section
      className={`rounded-[30px] border border-white/85 bg-white/88 p-4 shadow-[0_24px_70px_rgba(31,38,64,0.10)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl ${className}`}
    >
      {children}
    </section>
  );
}

function FieldShell({ label, icon, children, helper }: FieldShellProps) {
  return (
    <label className="flex flex-col gap-2.5">
      <span className="px-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#7B879C]">
        {label}
      </span>
      <div className="flex items-center gap-3 rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-3.5 py-3 shadow-[0_16px_32px_rgba(31,38,64,0.05)] transition focus-within:border-[#D7C8FF] focus-within:ring-4 focus-within:ring-[#6B39F4]/10">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F1FF] text-[#6B39F4] shadow-[0_10px_20px_rgba(107,57,244,0.10)]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {helper ? <span className="px-1 text-xs leading-5 text-[#7B879C]">{helper}</span> : null}
    </label>
  );
}

function IconBack() {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function IconCamera() {
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
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.1-1.5h5.8L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z" />
      <circle cx="12" cy="12.5" r="3.25" />
    </svg>
  );
}

function IconLimit() {
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
      <rect x="3.5" y="6.5" width="17" height="11" rx="3" />
      <path d="M15.5 10.5h5" />
      <path d="M16.5 12h.01" />
    </svg>
  );
}

function IconBriefcase() {
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
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 15.5Z" />
      <path d="M9 6V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1" />
      <path d="M4 11h16" />
    </svg>
  );
}

function IconDocument() {
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
      <path d="M8 3.5h6l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 12h6" />
      <path d="M9 15.5h6" />
    </svg>
  );
}

function IconHomeDoc() {
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
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6.5 9.5V19h11V9.5" />
      <path d="M9 12.5h6" />
      <path d="M9 15.5h4" />
    </svg>
  );
}

function IconUpload() {
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
      <path d="M12 15V5" />
      <path d="m8.5 8.5 3.5-3.5 3.5 3.5" />
      <path d="M5 18.5h14" />
    </svg>
  );
}

function IconId() {
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
      <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
      <circle cx="8.5" cy="12" r="1.5" />
      <path d="M12 10h5" />
      <path d="M12 13.5h5" />
    </svg>
  );
}

function IconUser() {
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
      <path d="M18 20v-1.4A4.6 4.6 0 0 0 13.4 14h-2.8A4.6 4.6 0 0 0 6 18.6V20" />
      <circle cx="12" cy="8" r="3" />
    </svg>
  );
}

function IconMail() {
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
      <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
      <path d="m5.5 8 6.5 4.75L18.5 8" />
    </svg>
  );
}

function IconGender() {
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
      <circle cx="11" cy="13" r="4" />
      <path d="M15 9 20 4" />
      <path d="M16 4h4v4" />
    </svg>
  );
}

function IconGlobe() {
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
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <path d="M12 4a12 12 0 0 1 0 16" />
      <path d="M12 4a12 12 0 0 0 0 16" />
    </svg>
  );
}

function IconMapPin() {
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
      <path d="M12 20s6-4.4 6-10a6 6 0 1 0-12 0c0 5.6 6 10 6 10Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconPhone() {
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
      <path d="M6.5 4.5h3l1.3 3.3-1.8 1.8a14.6 14.6 0 0 0 5.4 5.4l1.8-1.8 3.3 1.3v3a1.5 1.5 0 0 1-1.6 1.5A15.9 15.9 0 0 1 5 6.1 1.5 1.5 0 0 1 6.5 4.5Z" />
    </svg>
  );
}

export default function PersonalDataPage() {
  const locale = useLocale();
  const t = useTranslations('ProfilePages.personalDataPage');
  const tx = (key: string) => t(key as never);
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, smartWalletAddress, guardarRol, pushNotification, rolSeleccionado } =
    useInvestApp();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [availableColumns, setAvailableColumns] = useState<Set<string>>(new Set());
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingRoleEligibility, setLoadingRoleEligibility] = useState(true);
  const [roleEligibility, setRoleEligibility] =
    useState<CurrentUserRoleChangeEligibility | null>(null);
  const [kycSummary, setKycSummary] = useState<CurrentUserKycSummary | null>(null);
  const [loadingKyc, setLoadingKyc] = useState(true);
  const [uploadingDocument, setUploadingDocument] = useState<KycDocumentType | null>(null);
  const [kycStatus, setKycStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const countryOptions = useMemo(() => getCountryOptions(locale), [locale]);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      setLoadingProfile(true);
      setStatus('');

      const { data, error } = await fetchCurrentUserProfile<Record<string, unknown> | null>(
        getAccessToken
      );

      if (error) {
        setStatus(t('couldNotLoadProfile'));
      }

      const cols = new Set<string>(Object.keys(data ?? {}));
      setAvailableColumns(cols);

      const role = (data?.role as 'investor' | 'entrepreneur' | null) ?? '';
      const rawProfileData = data?.profile_data ?? data?.metadata ?? null;
      let profileData: Partial<ProfileForm> | null = null;

      if (rawProfileData && typeof rawProfileData === 'string') {
        try {
          profileData = JSON.parse(rawProfileData) as Partial<ProfileForm>;
        } catch {
          profileData = null;
        }
      } else if (rawProfileData && typeof rawProfileData === 'object') {
        profileData = rawProfileData as Partial<ProfileForm>;
      }

      const countryRaw = ((data?.country as string | null) ?? profileData?.country ?? '').trim();
      const countryByCode = countryOptions.find((option) => option.code === countryRaw.toUpperCase());
      const countryByName = countryOptions.find(
        (option) => option.name.toLowerCase() === countryRaw.toLowerCase()
      );
      const normalizedCountryCode = countryByCode?.code ?? countryByName?.code ?? '';

      setForm({
        id: user.id,
        email: (data?.email as string | null) ?? user.email?.address ?? '',
        name: (data?.name as string | null) ?? profileData?.name ?? '',
        surname: (data?.surname as string | null) ?? profileData?.surname ?? '',
        country: normalizedCountryCode,
        phone_number: (data?.phone_number as string | null) ?? profileData?.phone_number ?? '',
        gender: (data?.gender as string | null) ?? profileData?.gender ?? '',
        address: (data?.address as string | null) ?? profileData?.address ?? '',
        role,
        avatar_url: (data?.avatar_url as string | null) ?? profileData?.avatar_url ?? '',
      });
      setLoadingProfile(false);
    };

    void loadProfile();
  }, [countryOptions, getAccessToken, t, user?.email?.address, user?.id]);

  useEffect(() => {
    const loadRoleEligibility = async () => {
      if (!user?.id) {
        setRoleEligibility(null);
        setLoadingRoleEligibility(false);
        return;
      }

      setLoadingRoleEligibility(true);
      const { data, error } = await fetchCurrentUserRoleChangeEligibility(getAccessToken);
      if (error) {
        setRoleEligibility(null);
        setLoadingRoleEligibility(false);
        return;
      }

      setRoleEligibility(data);
      setLoadingRoleEligibility(false);
    };

    void loadRoleEligibility();
  }, [getAccessToken, user?.id]);

  const refreshKycSummary = useCallback(
    async (requestedAmountUsd?: number) => {
      if (!user?.id) {
        setKycSummary(null);
        setLoadingKyc(false);
        return null;
      }

      setLoadingKyc(true);
      const { data, error } = await fetchCurrentUserKycSummary(getAccessToken, requestedAmountUsd);
      if (error) {
        setKycStatus(t('couldNotLoadKyc', { error }));
        setLoadingKyc(false);
        return null;
      }

      setKycStatus('');
      setKycSummary(data);
      setLoadingKyc(false);
      return data;
    },
    [getAccessToken, t, user?.id]
  );

  useEffect(() => {
    void refreshKycSummary();
  }, [refreshKycSummary]);

  const canEditEmail = useMemo(() => availableColumns.has('email') || availableColumns.size === 0, [availableColumns]);
  const hasAnyExtendedField = useMemo(
    () =>
      [
        'name',
        'surname',
        'phone_number',
        'country',
        'gender',
        'address',
        'avatar_url',
        'profile_data',
        'metadata',
      ].some((field) => availableColumns.has(field)),
    [availableColumns]
  );

  const displayName = useMemo(() => {
    const fullName = `${form.name} ${form.surname}`.trim();
    if (fullName) return fullName;
    const fromEmail = (form.email || user?.email?.address || '').split('@')[0];
    return fromEmail || t('userFallback');
  }, [form.email, form.name, form.surname, t, user?.email?.address]);

  const displayEmail = useMemo(() => {
    return form.email || user?.email?.address || t('noEmail');
  }, [form.email, t, user?.email?.address]);

  const roleBadge = useMemo(() => {
    if (form.role === 'investor') return t('investor');
    if (form.role === 'entrepreneur') return t('entrepreneur');
    return t('profile');
  }, [form.role, t]);

  const kycBadgeLabel = useMemo(
    () => getKycLevelBadgeLabel(kycSummary?.approvedLevel ?? 0),
    [kycSummary?.approvedLevel]
  );

  const kycLimitLabel = useMemo(
    () => formatKycLevelLimit(kycSummary?.currentLevelLimitUsd ?? 0),
    [kycSummary?.currentLevelLimitUsd]
  );

  const kycBadgeClassName =
    (kycSummary?.approvedLevel ?? 0) > 0
      ? 'border-[#9FE3BE] bg-[#E8F9F1] text-[#14845A]'
      : 'border-[#FFDB93] bg-[#FFF7E6] text-[#C77C00]';

  const currentDbRole = useMemo(() => mapFrontRoleToDb(rolSeleccionado), [rolSeleccionado]);

  const requestedFrontRole = useMemo(
    () => (form.role ? mapDbRoleToFront(form.role) : null),
    [form.role]
  );

  const isRoleChangeRequested = Boolean(
    requestedFrontRole && rolSeleccionado && requestedFrontRole !== rolSeleccionado
  );

  const isRoleSelectionLocked = Boolean(
    rolSeleccionado && roleEligibility && !roleEligibility.canChangeRole
  );

  const avatarInitial = displayName.slice(0, 1).toUpperCase();
  const statusClassName = status ? getStatusTone(status) : '';
  const kycStatusClassName = kycStatus ? getStatusTone(kycStatus) : '';

  const updateForm = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onAvatarFile = async (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      updateForm('avatar_url', result);
      if (typeof window !== 'undefined' && user?.id && result) {
        writeProfileAvatarCache(user.id, result);
        window.dispatchEvent(new Event('investapp-profile-updated'));
      }
    };
    reader.readAsDataURL(file);
  };

  const onCountryChange = (countryCode: string) => {
    updateForm('country', countryCode);
    const option = countryOptions.find((item) => item.code === countryCode);
    if (!option) return;
    setForm((prev) => {
      const value = prev.phone_number.trim();
      if (!value) return { ...prev, phone_number: `${option.dialCode} ` };
      const sanitized = value.replace(/^\+\d+\s*/, '');
      return { ...prev, phone_number: `${option.dialCode} ${sanitized}`.trimEnd() };
    });
  };

  const uploadKycDocument = async (documentType: KycDocumentType, file: File | null) => {
    if (!file) return;

    setUploadingDocument(documentType);
    setKycStatus('');

    try {
      const { error } = await uploadCurrentUserKycDocument(getAccessToken, documentType, file);
      if (error) {
        setKycStatus(error);
        return;
      }

      setKycStatus(t('kycDocumentUploaded'));
      await refreshKycSummary();
    } finally {
      setUploadingDocument(null);
    }
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    setStatus('');

    try {
      const payload: Record<string, unknown> = {
        id: user.id,
        email: canEditEmail ? form.email || null : user.email?.address ?? null,
        wallet_address: smartWalletAddress ?? null,
      };
      const selectedCountry = countryOptions.find((item) => item.code === form.country);

      if (form.role && !isRoleChangeRequested) payload.role = form.role;
      if (availableColumns.has('name')) payload.name = form.name || null;
      if (availableColumns.has('surname')) payload.surname = form.surname || null;
      if (availableColumns.has('phone_number')) payload.phone_number = form.phone_number || null;
      if (availableColumns.has('country')) {
        payload.country = selectedCountry?.name ?? form.country ?? null;
      }
      if (availableColumns.has('gender')) payload.gender = form.gender || null;
      if (availableColumns.has('address')) payload.address = form.address || null;
      if (availableColumns.has('avatar_url')) payload.avatar_url = form.avatar_url || null;

      const profileData = {
        name: form.name || null,
        surname: form.surname || null,
        phone_number: form.phone_number || null,
        country: selectedCountry?.name ?? form.country ?? null,
        gender: form.gender || null,
        address: form.address || null,
        avatar_url: form.avatar_url || null,
      };

      if (availableColumns.has('profile_data')) payload.profile_data = profileData;
      if (availableColumns.has('metadata')) payload.metadata = profileData;

      const { error } = await patchCurrentUserProfile(getAccessToken, payload);
      if (error) {
        setStatus(t('couldNotSave', { error }));
        return;
      }

      if (isRoleChangeRequested && requestedFrontRole) {
        if (roleEligibility && !roleEligibility.canChangeRole) {
          setForm((prev) => ({ ...prev, role: currentDbRole }));
          setStatus(
            t('profileUpdatedBut', {
              message: roleEligibility.message ?? t('roleCannotChangeNow'),
            })
          );
          return;
        }

        try {
          await guardarRol(requestedFrontRole);
        } catch (caughtError) {
          const message =
            caughtError instanceof Error
              ? caughtError.message
              : t('roleCouldNotChangeNow');
          setForm((prev) => ({ ...prev, role: currentDbRole }));
          setStatus(t('profileUpdatedBut', { message }));
          return;
        }
      }

      if (typeof window !== 'undefined') {
        const nextEmail = form.email || user.email?.address || '';
        const nextDisplayName =
          `${form.name} ${form.surname}`.trim() || (nextEmail ? nextEmail.split('@')[0] : t('userFallback'));

        try {
          if (user.id) {
            writeProfileSummaryCache(user.id, {
              avatarUrl: form.avatar_url,
              displayName: nextDisplayName,
              email: nextEmail,
            });
          }
        } catch (caughtError) {
          console.error('Error caching profile summary locally:', caughtError);
        }

        window.dispatchEvent(new Event('investapp-profile-updated'));
      }

      try {
        pushNotification({
          kind: 'profile_update',
          title: t('profileUpdatedNotificationTitle'),
          body: t('profileUpdatedNotificationBody'),
          actionHref: '/profile/personal-data',
        });
      } catch (caughtError) {
        console.error('Error pushing profile notification:', caughtError);
      }

      if (!hasAnyExtendedField) {
        setStatus(
          t('basicSaveCompleted')
        );
      } else {
        setStatus(t('profileUpdatedSuccessfully'));
      }

      void fetchCurrentUserRoleChangeEligibility(getAccessToken)
        .then(({ data }) => {
          if (data) {
            setRoleEligibility(data);
          }
        })
        .catch((caughtError) => {
          console.error('Error refreshing role eligibility after profile save:', caughtError);
        });

      void refreshKycSummary();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : t('unknownSaveError');
      console.error('Unexpected error saving profile:', caughtError);
      setStatus(t('profileUpdatedRefreshFailed', { message }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DesktopAppShell
        title={t('title')}
        subtitle={t('subtitle')}
        eyebrow={t('eyebrow')}
        maxWidthClassName="max-w-none"
      >
        <section className="grid grid-cols-3 gap-4">
          <DesktopMetricCard
            icon={<IconLimit />}
            label={t('currentLimit')}
            value={loadingKyc ? t('checking') : kycLimitLabel}
            detail={t('currentLimitDetail')}
            tone="purple"
          />
          <DesktopMetricCard
            icon={<IconBriefcase />}
            label={t('role')}
            value={roleBadge}
            detail={isRoleSelectionLocked ? t('roleChangeLocked') : t('roleCanBeReviewed')}
            tone="blue"
          />
          <DesktopMetricCard
            icon={<IconDocument />}
            label={t('kyc')}
            value={loadingKyc ? t('updating') : kycBadgeLabel}
            detail={t('complianceStatus')}
            tone={(kycSummary?.approvedLevel ?? 0) > 0 ? 'green' : 'amber'}
          />
        </section>

        <section className="grid grid-cols-[360px_minmax(0,1fr)] gap-6">
          <DesktopSectionCard title={t('identityProfile')} subtitle={t('identityProfileSubtitle')}>
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar
                  src={form.avatar_url ? form.avatar_url : undefined}
                  alt={displayName}
                  fallback={avatarInitial}
                  className="h-32 w-32 rounded-full border-[4px] border-white bg-[#F4F0FF] text-[2.2rem] font-semibold text-[#5D35E8] shadow-[0_18px_38px_rgba(31,38,64,0.14)] ring-1 ring-[#E0D8FF]"
                />
                <span className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white shadow-[0_12px_24px_rgba(107,57,244,0.28)]">
                  <IconCamera />
                </span>
              </div>
              <label
                htmlFor="desktop-personal-data-avatar"
                className="mt-5 inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-[#D9CCFF] bg-[#F8F5FF] px-5 text-sm font-bold text-[#6B39F4] transition hover:bg-[#F1ECFF]"
              >
                {t('changeAvatar')}
              </label>
              <input
                id="desktop-personal-data-avatar"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => onAvatarFile(event.target.files?.[0] ?? null)}
              />
              <h2 className="mt-5 text-xl font-bold tracking-[-0.045em] text-[#111827]">{displayName}</h2>
              <p className="mt-1 text-sm font-medium text-[#73809A]">{displayEmail}</p>
              <div className="mt-5 w-full rounded-2xl bg-[#F8F9FB] px-4 py-3 text-left">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8A95A8]">
                  {t('wallet')}
                </p>
                <p className="mt-1 break-all text-sm font-bold text-[#111827]">
                  {smartWalletAddress || t('walletNotSynced')}
                </p>
              </div>
            </div>
          </DesktopSectionCard>

          <DesktopSectionCard title={t('accountInformation')} subtitle={t('accountInformationSubtitle')}>
            <div className="grid grid-cols-2 gap-4">
              <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder={t('name')} className="h-12 rounded-2xl border border-[#E2E6F0] bg-white px-4 text-sm font-semibold text-[#17203A] outline-none focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10" />
              <input value={form.surname} onChange={(event) => updateForm('surname', event.target.value)} placeholder={t('surname')} className="h-12 rounded-2xl border border-[#E2E6F0] bg-white px-4 text-sm font-semibold text-[#17203A] outline-none focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10" />
              <input value={form.email} onChange={(event) => updateForm('email', event.target.value)} disabled={!canEditEmail} placeholder={t('email')} className="h-12 rounded-2xl border border-[#E2E6F0] bg-white px-4 text-sm font-semibold text-[#17203A] outline-none focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10 disabled:bg-[#F8F9FB] disabled:text-[#9BA5B8]" />
              <input value={form.phone_number} onChange={(event) => updateForm('phone_number', event.target.value)} placeholder={t('phoneNumber')} className="h-12 rounded-2xl border border-[#E2E6F0] bg-white px-4 text-sm font-semibold text-[#17203A] outline-none focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10" />
              <AppCombobox
                value={form.country}
                onChange={onCountryChange}
                options={[
                  { value: '', label: t('country') },
                  ...countryOptions.map((option) => ({ value: option.code, label: option.name })),
                ]}
              />
              <AppCombobox
                value={form.gender}
                onChange={(next) => updateForm('gender', next)}
                options={[
                  { value: '', label: t('gender') },
                  { value: 'female', label: t('female') },
                  { value: 'male', label: t('male') },
                  { value: 'non_binary', label: t('nonBinary') },
                  { value: 'prefer_not_to_say', label: t('preferNotToSay') },
                ]}
              />
              <input value={form.address} onChange={(event) => updateForm('address', event.target.value)} placeholder={t('address')} className="col-span-2 h-12 rounded-2xl border border-[#E2E6F0] bg-white px-4 text-sm font-semibold text-[#17203A] outline-none focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10" />
              <AppCombobox
                className="col-span-2"
                value={form.role}
                disabled={loadingRoleEligibility || isRoleSelectionLocked}
                onChange={(next) => updateForm('role', next)}
                options={[
                  { value: '', label: t('role') },
                  { value: 'investor', label: t('investor') },
                  { value: 'entrepreneur', label: t('entrepreneur') },
                ]}
              />
            </div>
            {status ? (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${statusClassName}`}>
                {status}
              </div>
            ) : null}
            <Button
              onClick={() => void saveProfile()}
              disabled={saving || loadingProfile}
              variant="primary"
              className="mt-5 h-12 rounded-2xl bg-[linear-gradient(135deg,#7C5CFF_0%,#5B2FF4_100%)] px-5 text-sm font-bold text-white shadow-[0_18px_36px_rgba(107,57,244,0.24)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {saving ? t('saving') : t('saveProfile')}
            </Button>
          </DesktopSectionCard>
        </section>
      </DesktopAppShell>

      <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.14),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-36 text-[#101828] lg:hidden">
        <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-28 top-72 h-64 w-64 rounded-full bg-[#B9A8FF]/14 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8 pt-8">
          <header className="flex flex-col gap-4">
            <Button
              variant="ghost"
              iconOnly
              size="sm"
              onClick={() => router.push('/profile')}
              className="flex min-h-[44px] w-11 items-center justify-center rounded-full border border-white/90 bg-white/88 text-[#1C2336] shadow-[0_16px_34px_rgba(31,38,64,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
              aria-label={t('backToProfile')}
            >
              <IconBack />
            </Button>

            <div className="flex flex-col gap-1">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#8A93A8]">
                InvestApp
              </span>
              <h1 className="text-[2rem] font-semibold tracking-[-0.065em] text-[#1C2336]">
                {t('title')}
              </h1>
              <p className="max-w-[28rem] text-sm leading-6 text-[#7B879C]">
                {t('mobileSubtitle')}
              </p>
            </div>
          </header>

          <Surface className="bg-[linear-gradient(160deg,rgba(107,57,244,0.14)_0%,rgba(255,255,255,0.94)_46%,rgba(76,110,245,0.08)_100%)]">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar
                  src={form.avatar_url ? form.avatar_url : undefined}
                  alt={displayName}
                  fallback={avatarInitial}
                  className="h-28 w-28 rounded-full border-[4px] border-white bg-[#F4F0FF] text-[2rem] font-semibold text-[#5D35E8] shadow-[0_18px_38px_rgba(31,38,64,0.14)] ring-1 ring-[#E0D8FF]"
                />
                <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white shadow-[0_12px_24px_rgba(107,57,244,0.28)]">
                  <IconCamera />
                </span>
              </div>

              <span
                className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${kycBadgeClassName}`}
              >
                {loadingKyc ? t('updatingLevel') : kycBadgeLabel}
              </span>
              <h2 className="mt-4 text-[1.45rem] font-semibold tracking-[-0.04em] text-[#1C2336]">
                {displayName}
              </h2>
              <p className="mt-1 text-sm text-[#7B879C]">{displayEmail}</p>

              <label
                htmlFor="personal-data-avatar"
                className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-full border border-[#D9CCFF] bg-white/85 px-5 text-sm font-semibold text-[#6B39F4] shadow-[0_12px_28px_rgba(107,57,244,0.10)] transition hover:-translate-y-0.5 hover:bg-white"
              >
                {t('change')}
              </label>
              <input
                id="personal-data-avatar"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => onAvatarFile(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/82 px-4 py-4 shadow-[0_16px_32px_rgba(31,38,64,0.06)]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F1FF] text-[#6B39F4]">
                  <IconLimit />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8A93A8]">
                    {t('currentLimit')}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1C2336]">
                    {loadingKyc ? t('checkingLimits') : kycLimitLabel}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#7B879C]">
                    {t('currentLimitDetail')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/82 px-4 py-4 shadow-[0_16px_32px_rgba(31,38,64,0.06)]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#4C6EF5]">
                  <IconBriefcase />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8A93A8]">
                    {t('role')}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1C2336]">{roleBadge}</p>
                  <p className="mt-1 text-xs leading-5 text-[#7B879C]">
                    {t('activeAccountProfile')}
                  </p>
                </div>
              </div>
            </div>
          </Surface>

          <Surface className="bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(247,250,255,0.94)_100%)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
                  {t('complianceKyc')}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
                  {t('complianceTitle')}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#7B879C]">
                  {loadingKyc
                    ? t('refreshingVerification')
                    : kycSummary?.exempt
                      ? t('accountExempt')
                      : t('currentMovement', {
                          amount: kycSummary?.movementUsd?.toFixed(2) ?? '0.00',
                          limit: kycLimitLabel,
                        })}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${kycBadgeClassName}`}
              >
                {loadingKyc ? t('levelPending') : kycBadgeLabel}
              </span>
            </div>

            {!kycSummary?.exempt && kycSummary?.missingForCurrentLevel?.length ? (
              <div className="mt-4 rounded-[22px] border border-[#FFDB93] bg-[#FFF8EA] px-4 py-3 text-sm leading-6 text-[#9C6900]">
                {t('missingForCurrentLevel', {
                  items: kycSummary.missingForCurrentLevel.join(', '),
                })}
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-3">
              {([
                {
                  type: 'identity_document',
                  title: t('identityDocument'),
                  description: t('identityDocumentDescription'),
                  icon: <IconDocument />,
                },
                {
                  type: 'proof_of_residence',
                  title: t('proofOfResidence'),
                  description: t('proofOfResidenceDescription'),
                  icon: <IconHomeDoc />,
                },
              ] as const).map((item) => {
                const documentSummary = kycSummary?.documents[item.type];
                const isUploading = uploadingDocument === item.type;

                return (
                  <div
                    key={item.type}
                    className="flex flex-col gap-3 rounded-[24px] border border-[#EEF1F7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 shadow-[0_14px_28px_rgba(31,38,64,0.05)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F1FF] text-[#6B39F4]">
                        {item.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1C2336]">{item.title}</p>
                            <p className="mt-1 text-xs leading-5 text-[#7B879C]">
                              {item.description}
                            </p>
                          </div>
                          <span
                            className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] ${getDocumentTone(documentSummary?.status)}`}
                          >
                            {tx(getDocumentLabelKey(documentSummary?.status))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 flex-1 text-xs leading-5 text-[#7B879C]">
                        {documentSummary?.fileName
                          ? t('latestFile', { file: documentSummary.fileName })
                          : t('noFileUploaded')}
                      </p>
                      <label
                        htmlFor={`kyc-upload-${item.type}`}
                        className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#D9CCFF] bg-[#F6F1FF] px-4 text-sm font-semibold text-[#6B39F4] transition hover:-translate-y-0.5 hover:bg-[#F1E8FF]"
                      >
                        <IconUpload />
                        {isUploading ? t('uploading') : t('upload')}
                      </label>
                      <input
                        id={`kyc-upload-${item.type}`}
                        type="file"
                        accept={KYC_ALLOWED_DOCUMENT_ACCEPT}
                        className="sr-only"
                        disabled={isUploading}
                        onChange={(event) => {
                          const selectedFile = event.target.files?.[0] ?? null;
                          void uploadKycDocument(item.type, selectedFile);
                          event.currentTarget.value = '';
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {kycStatus ? (
              <div className={`mt-4 rounded-[22px] border px-4 py-3 text-sm leading-6 ${kycStatusClassName}`}>
                {kycStatus}
              </div>
            ) : null}
          </Surface>

          <Surface className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,255,0.98)_100%)]">
            <div className="flex flex-col gap-1">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
                {t('personalForm')}
              </p>
              <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
                {t('reviewProfileDetails')}
              </h3>
              <p className="text-sm leading-6 text-[#7B879C]">
                {t('reviewProfileDescription')}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <FieldShell label={t('id')} icon={<IconId />}>
                <input value={form.id} readOnly placeholder={t('id')} className={fieldControlClassName} />
              </FieldShell>

              <FieldShell label={t('firstName')} icon={<IconUser />}>
                <input
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder={t('firstName')}
                  className={fieldControlClassName}
                />
              </FieldShell>

              <FieldShell label={t('lastName')} icon={<IconUser />}>
                <input
                  value={form.surname}
                  onChange={(event) => updateForm('surname', event.target.value)}
                  placeholder={t('lastName')}
                  className={fieldControlClassName}
                />
              </FieldShell>

              <FieldShell
                label={t('email')}
                icon={<IconMail />}
                helper={!canEditEmail ? t('emailLocked') : undefined}
              >
                <input
                  value={form.email}
                  onChange={(event) => updateForm('email', event.target.value)}
                  readOnly={!canEditEmail}
                  placeholder={t('email')}
                  className={fieldControlClassName}
                />
              </FieldShell>

              <FieldShell label={t('gender')} icon={<IconGender />}>
                <AppCombobox
                  value={form.gender}
                  onChange={(next) => updateForm('gender', next)}
                  options={[
                    { value: '', label: t('gender') },
                    { value: 'male', label: t('male') },
                    { value: 'female', label: t('female') },
                    { value: 'prefer_not_to_say', label: t('preferNotToSay') },
                  ]}
                />
              </FieldShell>

              <FieldShell label={t('country')} icon={<IconGlobe />}>
                <AppCombobox
                  value={form.country}
                  onChange={onCountryChange}
                  options={[
                    { value: '', label: t('country') },
                    ...countryOptions.map((option) => ({
                      value: option.code,
                      label: `${option.name} (${option.dialCode})`,
                    })),
                  ]}
                />
              </FieldShell>

              <FieldShell label={t('address')} icon={<IconMapPin />}>
                <input
                  value={form.address}
                  onChange={(event) => updateForm('address', event.target.value)}
                  placeholder={t('address')}
                  className={fieldControlClassName}
                />
              </FieldShell>

              <FieldShell label={t('phone')} icon={<IconPhone />}>
                <input
                  value={form.phone_number}
                  onChange={(event) => updateForm('phone_number', event.target.value)}
                  placeholder={t('phoneNumber')}
                  className={fieldControlClassName}
                />
              </FieldShell>

              <FieldShell
                label={t('role')}
                icon={<IconBriefcase />}
                helper={
                  roleEligibility?.canChangeRole === false
                    ? roleEligibility.message ??
                      t('roleChangeEligibilityFallback')
                    : t('roleHelper')
                }
              >
                <AppCombobox
                  value={form.role}
                  disabled={loadingRoleEligibility || isRoleSelectionLocked}
                  onChange={(next) => updateForm('role', next)}
                  options={[
                    { value: '', label: t('role') },
                    { value: 'investor', label: t('investorProfile') },
                    { value: 'entrepreneur', label: t('entrepreneurProfile') },
                  ]}
                />
              </FieldShell>

              {status ? (
                <div className={`rounded-[22px] border px-4 py-3 text-sm leading-6 ${statusClassName}`}>
                  {status}
                </div>
              ) : null}

              <div className="rounded-[26px] border border-[#ECE8FF] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(246,244,255,0.98)_100%)] p-3 shadow-[0_18px_36px_rgba(31,38,64,0.08)]">
                <Button
                  variant="primary"
                  onClick={saveProfile}
                  disabled={saving || loadingProfile}
                  className="flex min-h-[56px] w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] px-5 text-base font-semibold tracking-[-0.02em] text-white shadow-[0_22px_38px_rgba(107,57,244,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? t('saving') : t('saveChanges')}
                </Button>
              </div>
            </div>
          </Surface>

          {loadingProfile ? (
            <div className="rounded-[22px] border border-[#E8ECF6] bg-white/80 px-4 py-3 text-sm text-[#7B879C] shadow-[0_12px_28px_rgba(31,38,64,0.05)]">
              {t('loadingProfileDetails')}
            </div>
          ) : null}
        </div>
      </main>

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </>
  );
}
