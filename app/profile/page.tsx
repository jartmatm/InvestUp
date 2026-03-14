'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';

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

type Tab = 'details' | 'help';
type CountryOption = { code: string; name: string; dialCode: string };

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

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

export default function ProfilePage() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, smartWalletAddress, logoutApp, guardarRol } = useInvestUp();
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [availableColumns, setAvailableColumns] = useState<Set<string>>(new Set());
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const supabase = useMemo(() => {
    const authedFetch: typeof fetch = async (input, init = {}) => {
      const token = await getAccessToken();
      const baseHeaders = new Headers(init.headers ?? {});
      baseHeaders.set('apikey', SUPABASE_ANON_KEY);

      const run = (headers: Headers) => fetch(input, { ...init, headers });

      if (!token) {
        return run(baseHeaders);
      }

      const headersWithAuth = new Headers(baseHeaders);
      headersWithAuth.set('Authorization', `Bearer ${token}`);
      const response = await run(headersWithAuth);

      if (response.ok) return response;

      const raw = await response.clone().text();
      const lower = raw.toLowerCase();
      const shouldFallback =
        response.status === 401 ||
        response.status === 403 ||
        lower.includes('no suitable key') ||
        lower.includes('wrong key type') ||
        lower.includes('invalid jwt');

      if (!shouldFallback) return response;

      return run(baseHeaders);
    };

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: authedFetch },
    });
  }, [getAccessToken]);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      setLoadingProfile(true);
      setStatus('');

      const { data, error } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();

      if (error) {
        setStatus('No se pudo cargar tu perfil desde Supabase.');
      }

      const cols = new Set<string>(Object.keys(data ?? {}));
      setAvailableColumns(cols);

      const role = (data?.role as 'investor' | 'entrepreneur' | null) ?? '';
      const profileData = (data?.profile_data ?? data?.metadata ?? null) as
        | Partial<ProfileForm>
        | null;
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
  }, [user?.id, user?.email?.address]);

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

  const updateForm = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onAvatarFile = async (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      updateForm('avatar_url', result);
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

    if (form.role) payload.role = form.role;
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

    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
    if (error) {
      setStatus(`No se pudo guardar en Supabase: ${error.message}`);
      setSaving(false);
      return;
    }

    const mappedRole = mapDbRoleToFront(form.role);
    if (mappedRole) {
      await guardarRol(mappedRole);
    }

    if (!hasAnyExtendedField) {
      setStatus(
        'Guardado basico completado. Para guardar campos extendidos (name/surname/phone/country/gender/address/avatar), agrega columnas en la tabla users o profile_data/metadata.'
      );
    } else {
      setStatus('Perfil actualizado correctamente.');
    }

    setSaving(false);
  };

  return (
    <PageFrame title="Perfil" subtitle="Configuracion de cuenta">
      <section className="rounded-xl border border-gray-200 bg-white p-5 text-gray-800 shadow-sm">
        <div className="mb-5 flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-primary/30 bg-slate-100">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
                Sin foto
              </div>
            )}
          </div>
          <label className="cursor-pointer rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
            Subir foto
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onAvatarFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('details')}
            className={`rounded-full px-3 py-2 text-sm font-semibold ${activeTab === 'details' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            My details
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`rounded-full px-3 py-2 text-sm font-semibold ${activeTab === 'help' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Help
          </button>
        </div>

        {activeTab === 'details' ? (
          <div className="space-y-3">
            {loadingProfile ? <p className="text-sm text-slate-500">Cargando perfil...</p> : null}
            <Input value={form.id} readOnly placeholder="ID" />
            <Input
              value={form.email}
              onChange={(value) => updateForm('email', value)}
              readOnly={!canEditEmail}
              placeholder="Email"
            />
            <Input value={form.name} onChange={(value) => updateForm('name', value)} placeholder="Name" />
            <Input
              value={form.surname}
              onChange={(value) => updateForm('surname', value)}
              placeholder="Surname"
            />
            <select
              value={form.country}
              onChange={(event) => onCountryChange(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Country</option>
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name} ({option.dialCode})
                </option>
              ))}
            </select>
            <Input
              value={form.phone_number}
              onChange={(value) => updateForm('phone_number', value)}
              placeholder="Phone number"
            />
            <select
              value={form.gender}
              onChange={(event) => updateForm('gender', event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="prefer no say">Prefer no say</option>
            </select>
            <Input value={form.address} onChange={(value) => updateForm('address', value)} placeholder="Address" />

            <select
              value={form.role}
              onChange={(event) => updateForm('role', event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Perfil</option>
              <option value="investor">Perfil de inversionista</option>
              <option value="entrepreneur">Perfil de emprendedor</option>
            </select>

            <div className="pt-1">
              <Button onClick={saveProfile} disabled={saving || loadingProfile}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Centro de ayuda</p>
            <p className="mt-2">
              Si necesitas soporte, escribenos a soporte@investup.app con tu ID de usuario y una descripcion
              del problema.
            </p>
          </div>
        )}

        {status ? <p className="mt-4 text-xs text-slate-500">{status}</p> : null}
      </section>

      <button
        onClick={logoutApp}
        className="mt-4 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
      >
        Cerrar sesion
      </button>
    </PageFrame>
  );
}


