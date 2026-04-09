'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PageFrame from '@/components/PageFrame';
import { useInvestApp } from '@/lib/investapp-context';

type BankMethod = 'bank' | 'breve';
type AccountType = 'ahorros' | 'corriente' | '';
type IdentificationType = 'cc' | 'ti' | 'te' | 'pasaporte' | '';

type BankDetailsForm = {
  method: BankMethod;
  bankName: string;
  accountNumber: string;
  accountType: AccountType;
  identificationType: IdentificationType;
  identificationNumber: string;
  phoneNumber: string;
  breveKey: string;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';

const BANK_OPTIONS = [
  'Bancolombia',
  'Banco de Bogota',
  'Davivienda',
  'BBVA Colombia',
  'Banco de Occidente',
  'Banco Popular',
  'Banco AV Villas',
  'Scotiabank Colpatria',
  'Banco Caja Social',
  'Banco Agrario',
  'Banco Falabella',
  'Itaú Colombia',
  'Lulo Bank',
  'Nu Colombia',
  'RappiPay',
  'Movii',
  'Nequi',
  'Daviplata',
  'Uala',
];

const emptyForm: BankDetailsForm = {
  method: 'bank',
  bankName: '',
  accountNumber: '',
  accountType: '',
  identificationType: '',
  identificationNumber: '',
  phoneNumber: '',
  breveKey: '',
};

const readBankDetails = (value: unknown): Partial<BankDetailsForm> | null => {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Partial<BankDetailsForm>;
    } catch {
      return null;
    }
  }

  if (typeof value === 'object') {
    return value as Partial<BankDetailsForm>;
  }

  return null;
};

export default function BankAccountPage() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp } = useInvestApp();
  const [form, setForm] = useState<BankDetailsForm>(emptyForm);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const supabase = useMemo(() => {
    const authedFetch: typeof fetch = async (input, init = {}) => {
      const token = await getAccessToken();
      const baseHeaders = new Headers(init.headers ?? {});
      baseHeaders.set('apikey', SUPABASE_ANON_KEY);

      const run = (headers: Headers) => fetch(input, { ...init, headers });
      if (!token) return run(baseHeaders);

      const headersWithAuth = new Headers(baseHeaders);
      headersWithAuth.set('Authorization', `Bearer ${token}`);
      const response = await run(headersWithAuth);
      if (response.ok) return response;

      const raw = (await response.clone().text()).toLowerCase();
      const shouldFallback =
        response.status === 401 ||
        response.status === 403 ||
        raw.includes('no suitable key') ||
        raw.includes('wrong key type') ||
        raw.includes('invalid jwt');

      return shouldFallback ? run(baseHeaders) : response;
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
    const loadBankDetails = async () => {
      if (!user?.id) {
        setLoadingDetails(false);
        return;
      }

      setLoadingDetails(true);
      setStatus('');

      const { data, error } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();

      if (error) {
        setStatus(`Could not load your bank details: ${error.message}`);
        setLoadingDetails(false);
        return;
      }

      const storedDetails = readBankDetails(
        (data as Record<string, unknown> | null)?.Bank_details ??
          (data as Record<string, unknown> | null)?.bank_details ??
          null
      );

      if (storedDetails) {
        setForm({
          method: storedDetails.method === 'breve' ? 'breve' : 'bank',
          bankName: storedDetails.bankName ?? '',
          accountNumber: storedDetails.accountNumber ?? '',
          accountType:
            storedDetails.accountType === 'ahorros' || storedDetails.accountType === 'corriente'
              ? storedDetails.accountType
              : '',
          identificationType:
            storedDetails.identificationType === 'cc' ||
            storedDetails.identificationType === 'ti' ||
            storedDetails.identificationType === 'te' ||
            storedDetails.identificationType === 'pasaporte'
              ? storedDetails.identificationType
              : '',
          identificationNumber: storedDetails.identificationNumber ?? '',
          phoneNumber: storedDetails.phoneNumber ?? '',
          breveKey: storedDetails.breveKey ?? '',
        });
      }

      setLoadingDetails(false);
    };

    void loadBankDetails();
  }, [supabase, user?.id]);

  const isBankMethod = form.method === 'bank';
  const canSave = isBankMethod
    ? Boolean(
        form.bankName &&
          form.accountNumber.trim() &&
          form.accountType &&
          form.identificationType &&
          form.identificationNumber.trim() &&
          form.phoneNumber.trim()
      )
    : Boolean(form.breveKey.trim());

  const updateForm = <K extends keyof BankDetailsForm>(key: K, value: BankDetailsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveBankDetails = async () => {
    if (!user?.id) return;

    if (!canSave) {
      setStatus(
        isBankMethod
          ? 'Complete all bank account fields before saving.'
          : 'Enter the Breve key before saving.'
      );
      return;
    }

    setSaving(true);
    setStatus('');

    const bankDetailsPayload = {
      method: form.method,
      bankName: form.method === 'bank' ? form.bankName : null,
      accountNumber: form.method === 'bank' ? form.accountNumber.trim() : null,
      accountType: form.method === 'bank' ? form.accountType : null,
      identificationType: form.method === 'bank' ? form.identificationType : null,
      identificationNumber: form.method === 'bank' ? form.identificationNumber.trim() : null,
      phoneNumber: form.method === 'bank' ? form.phoneNumber.trim() : null,
      breveKey: form.method === 'breve' ? form.breveKey.trim() : null,
      saved_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('users').upsert(
      {
        id: user.id,
        email: user.email?.address ?? null,
        Bank_details: bankDetailsPayload,
      },
      { onConflict: 'id' }
    );

    if (error) {
      setStatus(
        `Could not save Bank_details in Supabase. Make sure the column exists: ${error.message}`
      );
      setSaving(false);
      return;
    }

    setStatus('Bank details saved successfully.');
    setSaving(false);
  };

  return (
    <PageFrame title="Bank Account" subtitle="Store your bank or Breve details for future payouts">
      <div className="space-y-5">
        <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 text-sm text-gray-600 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          These payout details are saved in your user profile so you do not need to type them again
          for future withdrawal flows.
        </div>

        <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <p className="text-sm font-semibold text-gray-900">Payout method</p>
          <p className="mt-1 text-xs text-gray-500">Choose between a bank account or Breve.</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {([
              { value: 'bank', title: 'Bank', description: 'Bank account details' },
              { value: 'breve', title: 'Breve', description: 'Use a single key' },
            ] as const).map((option) => {
              const active = form.method === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateForm('method', option.value)}
                  className={`rounded-[20px] border px-4 py-4 text-left transition ${
                    active
                      ? 'border-[#6B39F4] bg-[#6B39F4] text-white'
                      : 'border-white/25 bg-white/40 text-gray-800'
                  }`}
                >
                  <p className="text-sm font-semibold">{option.title}</p>
                  <p className={`mt-1 text-xs ${active ? 'text-white/80' : 'text-gray-500'}`}>
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {isBankMethod ? (
          <div className="space-y-3 rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-sm font-semibold text-gray-900">Bank details</p>

            <select
              value={form.bankName}
              onChange={(event) => updateForm('bankName', event.target.value)}
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a bank or wallet</option>
              {BANK_OPTIONS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>

            <Input
              value={form.accountNumber}
              onChange={(value) => updateForm('accountNumber', value.replace(/[^\d]/g, ''))}
              placeholder="Account number"
            />

            <select
              value={form.accountType}
              onChange={(event) => updateForm('accountType', event.target.value as AccountType)}
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Account type</option>
              <option value="ahorros">Ahorros</option>
              <option value="corriente">Corriente</option>
            </select>

            <select
              value={form.identificationType}
              onChange={(event) =>
                updateForm('identificationType', event.target.value as IdentificationType)
              }
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Identification type</option>
              <option value="cc">CC</option>
              <option value="ti">TI</option>
              <option value="te">TE</option>
              <option value="pasaporte">Pasaporte</option>
            </select>

            <Input
              value={form.identificationNumber}
              onChange={(value) =>
                updateForm('identificationNumber', value.replace(/[^\dA-Za-z]/g, ''))
              }
              placeholder="Identification number"
            />

            <Input
              value={form.phoneNumber}
              onChange={(value) => updateForm('phoneNumber', value.replace(/[^\d+\s-]/g, ''))}
              placeholder="Phone number"
            />
          </div>
        ) : (
          <div className="space-y-3 rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-sm font-semibold text-gray-900">Breve details</p>
            <Input
              value={form.breveKey}
              onChange={(value) => updateForm('breveKey', value)}
              placeholder="Llave"
            />
          </div>
        )}

        <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <Button
            onClick={saveBankDetails}
            disabled={!canSave || saving || loadingDetails}
            className="!rounded-full !bg-[#6B39F4] !py-4 !text-base !text-white shadow-[0_18px_38px_rgba(107,57,244,0.24)] hover:!bg-[#5B31CF]"
          >
            {saving ? 'Saving...' : 'Save bank details'}
          </Button>
        </div>

        {status ? <p className="text-sm text-gray-500">{status}</p> : null}
      </div>
    </PageFrame>
  );
}
