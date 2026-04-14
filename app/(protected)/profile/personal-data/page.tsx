'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PageFrame from '@/components/PageFrame';
import { useInvestApp } from '@/lib/investapp-context';
import { writeProfileAvatarCache, writeProfileSummaryCache } from '@/lib/profile-summary-cache';
import {
  fetchCurrentUserRoleChangeEligibility,
  type CurrentUserRoleChangeEligibility,
} from '@/utils/client/current-user-role-change-eligibility';
import {
  fetchCurrentUserProfile,
  patchCurrentUserProfile,
} from '@/utils/client/current-user-profile';

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

type FieldProps = {
  label: string;
  children: ReactNode;
};

const REGION_NAMES = new Intl.DisplayNames(['es', 'en'], { type: 'region' });
const COUNTRY_OPTIONS: CountryOption[] = getCountries()
  .map((code) => ({
    code,
    name: REGION_NAMES.of(code) ?? code,
    dialCode: `+${getCountryCallingCode(code)}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));

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

function Field({ label, children }: FieldProps) {
  return (
    <div className="px-4 py-4">
      <p className="text-xs text-gray-500">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function PersonalDataPage() {
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
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

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
        setStatus('Could not load your profile from Supabase.');
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
      const countryByCode = COUNTRY_OPTIONS.find((option) => option.code === countryRaw.toUpperCase());
      const countryByName = COUNTRY_OPTIONS.find(
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

    loadProfile();
  }, [getAccessToken, user?.id, user?.email?.address]);

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
    return fromEmail || 'User';
  }, [form.name, form.surname, form.email, user?.email?.address]);

  const displayEmail = useMemo(() => {
    return form.email || user?.email?.address || 'No email';
  }, [form.email, user?.email?.address]);

  const roleBadge = useMemo(() => {
    if (form.role === 'investor') return 'Investor';
    if (form.role === 'entrepreneur') return 'Entrepreneur';
    return 'Profile';
  }, [form.role]);

  const currentDbRole = useMemo(
    () => mapFrontRoleToDb(rolSeleccionado),
    [rolSeleccionado]
  );

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
    const option = COUNTRY_OPTIONS.find((item) => item.code === countryCode);
    if (!option) return;
    setForm((prev) => {
      const value = prev.phone_number.trim();
      if (!value) return { ...prev, phone_number: `${option.dialCode} ` };
      const sanitized = value.replace(/^\+\d+\s*/, '');
      return { ...prev, phone_number: `${option.dialCode} ${sanitized}`.trimEnd() };
    });
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    setStatus('');

    const payload: Record<string, unknown> = {
      id: user.id,
      email: canEditEmail ? form.email || null : user.email?.address ?? null,
      wallet_address: smartWalletAddress ?? null,
    };
    const selectedCountry = COUNTRY_OPTIONS.find((item) => item.code === form.country);

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
      setStatus(`Could not save to Supabase: ${error}`);
      setSaving(false);
      return;
    }

    if (isRoleChangeRequested && requestedFrontRole) {
      if (roleEligibility && !roleEligibility.canChangeRole) {
        setForm((prev) => ({ ...prev, role: currentDbRole }));
        setStatus(`Profile updated, but ${roleEligibility.message ?? 'the role cannot be changed right now.'}`);
        setSaving(false);
        return;
      }

      try {
        await guardarRol(requestedFrontRole);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'the role could not be changed right now.';
        setForm((prev) => ({ ...prev, role: currentDbRole }));
        setStatus(`Profile updated, but ${message}`);
        setSaving(false);
        return;
      }
    }

    if (typeof window !== 'undefined') {
      const nextEmail = form.email || user.email?.address || '';
      const nextDisplayName = `${form.name} ${form.surname}`.trim() || (nextEmail ? nextEmail.split('@')[0] : 'User');
      if (user.id) {
        writeProfileSummaryCache(user.id, {
          avatarUrl: form.avatar_url,
          displayName: nextDisplayName,
          email: nextEmail,
        });
      }
      window.dispatchEvent(new Event('investapp-profile-updated'));
    }

    pushNotification({
      kind: 'profile_update',
      title: 'Profile updated',
      body: 'Your personal information and account preferences were updated successfully.',
      actionHref: '/profile/personal-data',
    });

    if (!hasAnyExtendedField) {
      setStatus(
        'Basic save completed. To store extended fields (name, surname, phone, country, gender, address, avatar), add the matching columns in users or profile_data/metadata.'
      );
    } else {
      setStatus('Profile updated successfully.');
    }

    const { data: refreshedEligibility } = await fetchCurrentUserRoleChangeEligibility(getAccessToken);
    if (refreshedEligibility) {
      setRoleEligibility(refreshedEligibility);
    }

    setSaving(false);
  };

  return (
    <PageFrame title="Personal Data" subtitle="Update your personal information">
      <div className="space-y-6">
        <div className="flex flex-col items-center">
          <label className="relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-semibold text-gray-600">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="absolute bottom-0 left-0 right-0 bg-black/50 py-1 text-center text-[10px] font-semibold text-white">
              Change
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => onAvatarFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <h2 className="mt-3 text-lg font-semibold text-gray-900">{displayName}</h2>
          <p className="text-sm text-gray-500">{displayEmail}</p>
          <span className="mt-2 inline-block rounded-full border border-white/25 bg-white/20 px-2 py-1 text-xs text-purple-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            {roleBadge}
          </span>
        </div>

        {loadingProfile ? <p className="text-sm text-slate-500">Loading profile...</p> : null}

        <div className="divide-y divide-white/20 overflow-hidden rounded-xl border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <Field label="ID">
            <Input value={form.id} readOnly placeholder="ID" />
          </Field>
          <Field label="First name">
            <Input value={form.name} onChange={(value) => updateForm('name', value)} placeholder="Name" />
          </Field>
          <Field label="Last name">
            <Input value={form.surname} onChange={(value) => updateForm('surname', value)} placeholder="Surname" />
          </Field>
          <Field label="Email">
            <Input
              value={form.email}
              onChange={(value) => updateForm('email', value)}
              readOnly={!canEditEmail}
              placeholder="Email"
            />
          </Field>
          <Field label="Gender">
            <select
              value={form.gender}
              onChange={(event) => updateForm('gender', event.target.value)}
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="prefer no say">Prefer not to say</option>
            </select>
          </Field>
          <Field label="Country">
            <select
              value={form.country}
              onChange={(event) => onCountryChange(event.target.value)}
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Country</option>
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name} ({option.dialCode})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Address">
            <Input value={form.address} onChange={(value) => updateForm('address', value)} placeholder="Address" />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone_number}
              onChange={(value) => updateForm('phone_number', value)}
              placeholder="Phone number"
            />
          </Field>
          <Field label="Role">
            <select
              value={form.role}
              onChange={(event) => updateForm('role', event.target.value)}
              disabled={loadingRoleEligibility || isRoleSelectionLocked}
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Role</option>
              <option value="investor">Investor profile</option>
              <option value="entrepreneur">Entrepreneur profile</option>
            </select>
            {roleEligibility?.canChangeRole === false ? (
              <p className="mt-2 text-xs text-amber-700">
                {roleEligibility.message ??
                  'You can only change roles when your account has no investments and no published projects.'}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                You can switch roles only when your account has no investments and no active publication.
              </p>
            )}
          </Field>
        </div>

        <Button
          onClick={saveProfile}
          disabled={saving || loadingProfile}
          className="rounded-xl py-4 text-base !bg-[#6B39F4] !text-white shadow-[0_18px_38px_rgba(107,57,244,0.24)] hover:!bg-[#5B31CF]"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </Button>

        {status ? <p className="text-xs text-slate-500">{status}</p> : null}
      </div>
    </PageFrame>
  );
}
