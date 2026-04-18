'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PageFrame from '@/components/PageFrame';
import { useInvestApp } from '@/lib/investapp-context';
import {
  fetchCurrentUserProfile,
  patchCurrentUserProfile,
} from '@/utils/client/current-user-profile';

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

const selectClassName =
  'w-full rounded-[18px] border border-white/35 bg-white/70 px-4 py-3 text-sm font-medium tracking-[-0.02em] text-gray-900 outline-none shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur-md transition focus:ring-2 focus:ring-primary/20';

export default function BankAccountPage() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp } = useInvestApp();
  const [form, setForm] = useState<BankDetailsForm>(emptyForm);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

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

      const { data, error } = await fetchCurrentUserProfile<Record<string, unknown> | null>(
        getAccessToken
      );

      if (error) {
        setStatus(`Could not load your bank details: ${error}`);
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
  }, [getAccessToken, user?.id]);

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

    try {
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

      const { error } = await patchCurrentUserProfile(getAccessToken, {
        email: user.email?.address ?? null,
        Bank_details: bankDetailsPayload,
      });

      if (error) {
        setStatus(
          `Could not save Bank_details in Supabase. Make sure the column exists: ${error}`
        );
        return;
      }

      setStatus('Bank details saved successfully.');
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unknown error while saving bank details.';
      console.error('Unexpected error saving bank details:', caughtError);
      setStatus(`Bank details saved, but the screen could not finish refreshing: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageFrame
      title="Bank Account"
      subtitle="Store your payout destination for compliant withdrawal flows"
      showBackButton
      backHref="/profile"
    >
      <div className="space-y-5">
        <div className="rounded-[28px] border border-white/30 bg-[linear-gradient(145deg,rgba(107,57,244,0.16),rgba(255,255,255,0.86),rgba(76,110,245,0.12))] p-5 shadow-[0_16px_38px_rgba(15,23,42,0.10)] backdrop-blur-md">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B39F4]">
                Payout setup
              </p>
              <h2 className="mt-3 text-[1.45rem] font-semibold text-gray-900">
                Configure where withdrawals should land
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">
                Save your preferred payout destination once and reuse it in future withdrawal
                flows without typing everything again.
              </p>
            </div>

            <div className="grid gap-3 sm:min-w-[220px]">
              <div className="rounded-[22px] border border-white/40 bg-white/72 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Selected method
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {form.method === 'bank' ? 'Bank account' : 'Breve key'}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/40 bg-white/72 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Security
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  Used only for payout processing
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Saved destination
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              The selected payout details remain in your profile for faster future withdrawals.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Requirement
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Complete every required field for the method you choose before saving.
            </p>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
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
                      ? 'border-[#6B39F4] bg-[#6B39F4] text-white shadow-[0_18px_34px_rgba(107,57,244,0.24)]'
                      : 'border-white/25 bg-white/50 text-gray-800 hover:bg-white/70'
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
          <div className="space-y-3 rounded-[24px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-sm font-semibold text-gray-900">Bank details</p>

            <select
              value={form.bankName}
              onChange={(event) => updateForm('bankName', event.target.value)}
              className={selectClassName}
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
              className={selectClassName}
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
              className={selectClassName}
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
          <div className="space-y-3 rounded-[24px] border border-white/25 bg-white/20 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-sm font-semibold text-gray-900">Breve details</p>
            <p className="text-xs leading-relaxed text-gray-500">
              Use a single identifier when your payout flow is handled through Breve.
            </p>
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
