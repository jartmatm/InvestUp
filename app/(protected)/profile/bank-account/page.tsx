'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import {
  ProfileFieldShell,
  ProfileInfoTile,
  ProfileNotice,
  ProfilePageShell,
  ProfilePrimaryButton,
  ProfileSurface,
  profileControlClassName,
} from '@/components/profile/ProfilePageShell';
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

const getStatusTone = (message: string) => {
  if (/could not|error/i.test(message)) return 'danger' as const;
  if (/saved|success/i.test(message)) return 'success' as const;
  return 'neutral' as const;
};

function IconBank() {
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
      <path d="M4 9h16" />
      <path d="M5 9v8" />
      <path d="M9 9v8" />
      <path d="M15 9v8" />
      <path d="M19 9v8" />
      <path d="M3 17h18" />
      <path d="M12 4 3 8.5h18L12 4Z" />
    </svg>
  );
}

function IconKey() {
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
      <circle cx="8.5" cy="15.5" r="3.5" />
      <path d="m11 13 7.5-7.5" />
      <path d="M15.5 6.5 18 9" />
      <path d="M13.5 8.5 16 11" />
    </svg>
  );
}

function IconShield() {
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
      <path d="M12 3c2 1.4 4.1 2.4 6.7 3a1.2 1.2 0 0 1 .9 1.2c-.3 5.7-2.4 10.8-7.6 12.8-5.2-2-7.3-7.1-7.6-12.8A1.2 1.2 0 0 1 5.3 6C7.9 5.4 10 4.4 12 3Z" />
      <path d="m9.4 12.3 1.8 1.8 3.8-4" />
    </svg>
  );
}

function IconHash() {
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
      <path d="M5 9h14" />
      <path d="M4 15h14" />
      <path d="M10 4 8 20" />
      <path d="M16 4l-2 16" />
    </svg>
  );
}

function IconUserCard() {
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

function IconChevronDown() {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

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
    <ProfilePageShell
      title="Bank Account"
      subtitle="Store your payout destination for compliant withdrawal flows."
      footer={
        <>
          {status ? <ProfileNotice tone={getStatusTone(status)}>{status}</ProfileNotice> : null}
          <ProfileSurface className="p-3">
            <ProfilePrimaryButton onClick={saveBankDetails} disabled={!canSave || saving || loadingDetails}>
              {saving ? 'Saving...' : 'Save bank details'}
            </ProfilePrimaryButton>
          </ProfileSurface>
        </>
      }
    >
      <ProfileSurface className="bg-[linear-gradient(160deg,rgba(107,57,244,0.14)_0%,rgba(255,255,255,0.94)_46%,rgba(76,110,245,0.08)_100%)]">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
              Payout setup
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
              Configure where withdrawals should land
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7B879C]">
              Save your preferred payout destination once and reuse it in future withdrawal flows without typing everything again.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <ProfileInfoTile
              icon={<IconBank />}
              eyebrow="Selected method"
              title={form.method === 'bank' ? 'Bank account' : 'Breve key'}
              description="Choose the destination that matches your payout flow."
              tone="purple"
            />
            <ProfileInfoTile
              icon={<IconShield />}
              eyebrow="Security"
              title="Used only for payout processing"
              description="These details remain stored in your profile for future withdrawals."
              tone="green"
            />
          </div>
        </div>
      </ProfileSurface>

      {loadingDetails ? <ProfileNotice>Loading your payout destination...</ProfileNotice> : null}

      <ProfileSurface>
        <div className="flex flex-col gap-3">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
            Payout method
          </p>

          {([
            { value: 'bank', title: 'Bank', description: 'Bank account details', icon: <IconBank /> },
            { value: 'breve', title: 'Breve', description: 'Use a single key', icon: <IconKey /> },
          ] as const).map((option) => {
            const active = form.method === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateForm('method', option.value)}
                className={`rounded-[26px] border px-4 py-4 text-left shadow-[0_16px_32px_rgba(31,38,64,0.06)] transition ${
                  active
                    ? 'border-[#DDD3FF] bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white'
                    : 'border-[#EBEEF7] bg-white/82 text-[#1C2336]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      active ? 'bg-white/18 text-white' : 'bg-[#F5F1FF] text-[#6B39F4]'
                    }`}
                  >
                    {option.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{option.title}</p>
                    <p className={`mt-1 text-xs leading-5 ${active ? 'text-white/80' : 'text-[#7B879C]'}`}>
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ProfileSurface>

      <ProfileSurface>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
              {isBankMethod ? 'Bank details' : 'Breve details'}
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
              {isBankMethod ? 'Complete the payout account' : 'Add your Breve key'}
            </h3>
          </div>

          {isBankMethod ? (
            <div className="flex flex-col gap-3">
              <ProfileFieldShell label="Select bank" icon={<IconBank />}>
                <div className="relative">
                  <select
                    value={form.bankName}
                    onChange={(event) => updateForm('bankName', event.target.value)}
                    className={`${profileControlClassName} appearance-none pr-8`}
                  >
                    <option value="">Select a bank or wallet</option>
                    {BANK_OPTIONS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#96A0B5]">
                    <IconChevronDown />
                  </span>
                </div>
              </ProfileFieldShell>

              <ProfileFieldShell label="Account number" icon={<IconHash />}>
                <input
                  value={form.accountNumber}
                  onChange={(event) =>
                    updateForm('accountNumber', event.target.value.replace(/[^\d]/g, ''))
                  }
                  placeholder="Account number"
                  className={profileControlClassName}
                />
              </ProfileFieldShell>

              <ProfileFieldShell label="Account type" icon={<IconBank />}>
                <div className="relative">
                  <select
                    value={form.accountType}
                    onChange={(event) => updateForm('accountType', event.target.value as AccountType)}
                    className={`${profileControlClassName} appearance-none pr-8`}
                  >
                    <option value="">Account type</option>
                    <option value="ahorros">Ahorros</option>
                    <option value="corriente">Corriente</option>
                  </select>
                  <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#96A0B5]">
                    <IconChevronDown />
                  </span>
                </div>
              </ProfileFieldShell>

              <ProfileFieldShell label="Identification type" icon={<IconUserCard />}>
                <div className="relative">
                  <select
                    value={form.identificationType}
                    onChange={(event) =>
                      updateForm('identificationType', event.target.value as IdentificationType)
                    }
                    className={`${profileControlClassName} appearance-none pr-8`}
                  >
                    <option value="">Identification type</option>
                    <option value="cc">CC</option>
                    <option value="ti">TI</option>
                    <option value="te">TE</option>
                    <option value="pasaporte">Pasaporte</option>
                  </select>
                  <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#96A0B5]">
                    <IconChevronDown />
                  </span>
                </div>
              </ProfileFieldShell>

              <ProfileFieldShell label="Identification number" icon={<IconHash />}>
                <input
                  value={form.identificationNumber}
                  onChange={(event) =>
                    updateForm(
                      'identificationNumber',
                      event.target.value.replace(/[^\dA-Za-z]/g, '')
                    )
                  }
                  placeholder="Identification number"
                  className={profileControlClassName}
                />
              </ProfileFieldShell>

              <ProfileFieldShell label="Phone number" icon={<IconPhone />}>
                <input
                  value={form.phoneNumber}
                  onChange={(event) =>
                    updateForm('phoneNumber', event.target.value.replace(/[^\d+\s-]/g, ''))
                  }
                  placeholder="Phone number"
                  className={profileControlClassName}
                />
              </ProfileFieldShell>
            </div>
          ) : (
            <ProfileFieldShell
              label="Breve key"
              icon={<IconKey />}
              helper="Use a single identifier when your payout flow is handled through Breve."
            >
              <input
                value={form.breveKey}
                onChange={(event) => updateForm('breveKey', event.target.value)}
                placeholder="Llave"
                className={profileControlClassName}
              />
            </ProfileFieldShell>
          )}
        </div>
      </ProfileSurface>
    </ProfilePageShell>
  );
}
