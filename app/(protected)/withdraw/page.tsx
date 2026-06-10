'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
import BottomNav from '@/components/BottomNav';
import {
  DesktopAppShell,
  DesktopMetricCard,
  DesktopSectionCard,
} from '@/components/DesktopAppShell';
import { AppCombobox } from '@/components/tailgrids/core/app-combobox';
import { getWithdrawCountryConfig } from '@/lib/withdraw-country-config';
import { useInvestApp } from '@/lib/investapp-context';
import { fetchCurrentUserInternalLedger } from '@/utils/client/current-user-internal-ledger';
import { fetchCurrentUserProfile } from '@/utils/client/current-user-profile';
import { fetchCurrentUserKycSummary } from '@/utils/client/current-user-kyc';
import type { InternalAccountBalance } from '@/utils/internal-ledger/types';
import { getKycLevelBadgeLabel } from '@/utils/kyc/shared';

type WithdrawalMethod = 'bank' | 'breve';
type AccountType = string;
type IdentificationType = string;
type UserProfileRecord = Record<string, unknown> | null;

type WithdrawForm = {
  method: WithdrawalMethod;
  bankName: string;
  accountNumber: string;
  accountType: AccountType;
  identificationType: IdentificationType;
  identificationNumber: string;
  phoneNumber: string;
  breveKey: string;
  amount: string;
};

type SurfaceProps = {
  children: ReactNode;
  className?: string;
};

type FieldShellProps = {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

const MANUAL_WITHDRAWAL_WALLET = '0xac5c740d2163a452d7d288d57e9df5496752246e';
const MIN_WITHDRAWAL_USDC = 10;
const MIN_GAS_RESERVE_USDC = 0.1;

const emptyForm: WithdrawForm = {
  method: 'bank',
  bankName: '',
  accountNumber: '',
  accountType: '',
  identificationType: '',
  identificationNumber: '',
  phoneNumber: '',
  breveKey: '',
  amount: '',
};

const formInputClassName =
  'w-full bg-transparent text-[1rem] font-medium tracking-[-0.025em] text-[#17203A] outline-none placeholder:text-[#99A3B6]';

const formatAmountForSubmit = (value: string) => {
  const sanitized = value.replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
  const numberValue = Number(normalized);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return '';
  return numberValue.toFixed(2);
};

const parseProfileBlob = (value: unknown) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  }

  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
};

const getProfileCountry = (profile: UserProfileRecord) => {
  const profileData = parseProfileBlob(profile?.profile_data);
  const metadata = parseProfileBlob(profile?.metadata);

  const candidates = [profile?.country, profileData?.country, metadata?.country];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return '';
};

const mapRoleToDb = (role: 'inversor' | 'emprendedor' | null) => {
  if (role === 'inversor') return 'investor';
  if (role === 'emprendedor') return 'entrepreneur';
  return null;
};

function Surface({ children, className = '' }: SurfaceProps) {
  return (
    <section
      className={`rounded-[30px] border border-white/85 bg-white/88 p-4 shadow-[0_22px_58px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75 backdrop-blur-2xl ${className}`}
    >
      {children}
    </section>
  );
}

function FieldShell({ icon, children, className = '' }: FieldShellProps) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-[22px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-3 py-2.5 shadow-[0_12px_24px_rgba(31,38,64,0.04)] transition focus-within:border-[#D7C8FF] focus-within:ring-4 focus-within:ring-[#6B39F4]/10 ${className}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F4F0FF] text-[#6B39F4]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function IconInfo() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.5v5" />
      <path d="M12 7.8h.01" />
    </svg>
  );
}

function IconWalletBalance() {
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

function IconAccountType() {
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
      <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" />
      <path d="M3.5 10.5h17" />
      <path d="M7.5 14.5h3" />
    </svg>
  );
}

function IconIdentification() {
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
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <circle cx="8.5" cy="12" r="1.8" />
      <path d="M13 10h4.5" />
      <path d="M13 13h4.5" />
      <path d="M6.8 15.2c.5-.9 1.3-1.4 2.2-1.4.9 0 1.7.5 2.2 1.4" />
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
      <path d="m10 4-2 16" />
      <path d="m16 4-2 16" />
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
      <path d="M6.6 4.8h2.1c.4 0 .8.3.9.7l.8 3.2a1 1 0 0 1-.3 1l-1.4 1.1a15 15 0 0 0 4.8 4.8l1.1-1.4a1 1 0 0 1 1-.3l3.2.8c.4.1.7.5.7.9v2.1a1 1 0 0 1-1 1A15.8 15.8 0 0 1 5.6 5.8a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function IconAmount() {
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
      <path d="M14 9.5c0-.9-.9-1.5-2-1.5s-2 .6-2 1.5c0 2 4 1.1 4 3.1 0 .9-.9 1.6-2 1.6s-2-.6-2-1.6" />
      <path d="M12 7.2v9.6" />
    </svg>
  );
}

function IconPaperPlane() {
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
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </svg>
  );
}

function IconCheckCircle() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.3 2.3 4.7-5.1" />
    </svg>
  );
}

export default function WithdrawPage() {
  const t = useTranslations('Withdraw');
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const {
    faseApp,
    rolSeleccionado,
    balanceUSDC,
    smartWalletAddress,
    loadingTx,
    enviarUSDC,
  } = useInvestApp();
  const [form, setForm] = useState<WithdrawForm>(emptyForm);
  const [savingRequest, setSavingRequest] = useState(false);
  const [status, setStatus] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submittedTxHash, setSubmittedTxHash] = useState('');
  const [userCountry, setUserCountry] = useState('');
  const [internalBalance, setInternalBalance] = useState<InternalAccountBalance | null>(null);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  const fetchWithAccessToken = async (input: RequestInfo | URL, init?: RequestInit) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Missing Privy access token.');
    }

    const headers = new Headers(init?.headers ?? {});
    headers.set('Authorization', `Bearer ${accessToken}`);
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(input, {
      ...init,
      headers,
      cache: 'no-store',
    });
  };

  const refreshKycSummary = useCallback(
    async (requestedAmountUsd?: number) => {
      if (!user?.id) {
        return null;
      }

      const { data, error } = await fetchCurrentUserKycSummary(getAccessToken, requestedAmountUsd);
      if (error) {
        if (requestedAmountUsd != null) {
          setStatus(t('kycError', { error }));
        }
        return null;
      }

      return data;
    },
    [getAccessToken, t, user?.id]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshKycSummary();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshKycSummary]);

  useEffect(() => {
    const loadProfileCountry = async () => {
      if (!user?.id) {
        setUserCountry('');
        return;
      }

      const { data } = await fetchCurrentUserProfile<UserProfileRecord>(getAccessToken);
      setUserCountry(getProfileCountry(data));
    };

    void loadProfileCountry();
  }, [getAccessToken, user?.id]);

  useEffect(() => {
    const loadInternalBalance = async () => {
      if (!user?.id) {
        setInternalBalance(null);
        return;
      }

      const { data, error } = await fetchCurrentUserInternalLedger(getAccessToken, { limit: 8 });
      if (error) {
        console.error('Error loading withdraw internal balance:', error);
        setInternalBalance(null);
        return;
      }

      setInternalBalance(data?.balance ?? null);
    };

    void loadInternalBalance();
  }, [getAccessToken, user?.id]);

  const balanceNumber = Number(balanceUSDC ?? 0);
  const displayBalance = Number.isFinite(balanceNumber) ? balanceNumber.toFixed(2) : '0.00';
  const withdrawCountryConfig = getWithdrawCountryConfig(userCountry);
  const effectiveMethod =
    form.method === 'breve' && !withdrawCountryConfig.breveEnabled ? 'bank' : form.method;
  const withdrawableBalance = Number.isFinite(balanceNumber)
    ? Math.max(
        Number(internalBalance?.withdrawable_balance ?? balanceNumber - MIN_GAS_RESERVE_USDC),
        0
      )
    : 0;
  const formattedAmount = formatAmountForSubmit(form.amount);
  const amountNumber = Number(formattedAmount);
  const isBankMethod = effectiveMethod === 'bank';
  const bankNameValid =
    withdrawCountryConfig.bankOptions.length === 0 ||
    withdrawCountryConfig.bankOptions.includes(form.bankName);
  const accountTypeValid = withdrawCountryConfig.accountTypes.some(
    (option) => option.value === form.accountType
  );
  const identificationTypeValid = withdrawCountryConfig.identificationTypes.some(
    (option) => option.value === form.identificationType
  );
  const amountBelowMinimum =
    !!formattedAmount && Number.isFinite(amountNumber) && amountNumber < MIN_WITHDRAWAL_USDC;
  const amountExceedsSafeBalance =
    !!formattedAmount && Number.isFinite(amountNumber) && amountNumber > withdrawableBalance;
  const canSubmit =
    !!user?.id &&
    !!smartWalletAddress &&
    !!formattedAmount &&
    amountNumber > 0 &&
    !amountBelowMinimum &&
    !amountExceedsSafeBalance &&
    (isBankMethod
      ? Boolean(
          form.bankName.trim() &&
            bankNameValid &&
            form.accountNumber.trim() &&
            accountTypeValid &&
            identificationTypeValid &&
            form.identificationNumber.trim() &&
            form.phoneNumber.trim()
        )
      : Boolean(form.breveKey.trim()));
  const withdrawDisabled = !canSubmit || savingRequest || loadingTx;

  const updateForm = <K extends keyof WithdrawForm>(key: K, value: WithdrawForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      setStatus(t('signInRequired'));
      return;
    }

    if (!smartWalletAddress) {
      setStatus(t('walletNotReady'));
      return;
    }

    if (!formattedAmount || amountNumber <= 0) {
      setStatus(t('invalidAmount'));
      return;
    }

    if (amountNumber < MIN_WITHDRAWAL_USDC) {
      setStatus(t('minimumWithdrawal', { amount: MIN_WITHDRAWAL_USDC.toFixed(2) }));
      return;
    }

    if (amountNumber > withdrawableBalance) {
      setStatus(
        t('safeBalanceLimit', {
          amount: withdrawableBalance.toFixed(2),
          reserve: MIN_GAS_RESERVE_USDC.toFixed(2),
        })
      );
      return;
    }

    if (isBankMethod) {
      if (
        !form.bankName.trim() ||
        !bankNameValid ||
        !form.accountNumber.trim() ||
        !accountTypeValid ||
        !identificationTypeValid ||
        !form.identificationNumber.trim() ||
        !form.phoneNumber.trim()
      ) {
        setStatus(t('completeBankFields'));
        return;
      }
    } else if (!form.breveKey.trim()) {
      setStatus(t('enterBreveKey'));
      return;
    }

    setSavingRequest(true);
    setStatus('');
    setSuccessMessage('');
    setSubmittedTxHash('');

    const nextKycSummary = await refreshKycSummary(amountNumber);
    if (!nextKycSummary) {
      setSavingRequest(false);
      return;
    }

    if (!nextKycSummary.canWithdrawRequestedAmount) {
      setStatus(
        nextKycSummary.blockingReason ??
          t('kycLevelRequired', {
            level: getKycLevelBadgeLabel(nextKycSummary.requiredLevelForRequestedAmount),
          })
      );
      setSavingRequest(false);
      return;
    }

    const createResponse = await fetchWithAccessToken('/api/withdrawals', {
      method: 'POST',
      body: JSON.stringify({
        payoutMethod: effectiveMethod,
        sourceWallet: smartWalletAddress,
        amountUsdc: formattedAmount,
        role: mapRoleToDb(rolSeleccionado),
        bankName: isBankMethod ? form.bankName : null,
        accountNumber: isBankMethod ? form.accountNumber.trim() : null,
        accountType: isBankMethod ? form.accountType : null,
        identificationType: isBankMethod ? form.identificationType : null,
        identificationNumber: isBankMethod ? form.identificationNumber.trim() : null,
        phoneNumber: isBankMethod ? form.phoneNumber.trim() : null,
        breveKey: isBankMethod ? null : form.breveKey.trim(),
      }),
    });

    const createJson = (await createResponse.json().catch(() => null)) as
      | { id?: string; error?: string; details?: string | null }
      | null;

    if (!createResponse.ok || !createJson?.id) {
      const baseMessage = createJson?.error ?? t('createRequestError');
      setStatus(createJson?.details ? `${baseMessage}: ${createJson.details}` : baseMessage);
      setSavingRequest(false);
      return;
    }

    const withdrawalId = createJson.id;
    const result = await enviarUSDC(MANUAL_WITHDRAWAL_WALLET, formattedAmount, {
      movementType: 'withdrawal',
    });

    if (!result.success || !result.txHash) {
      await fetchWithAccessToken(`/api/withdrawals/${withdrawalId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'failed',
        }),
      }).catch(() => null);

      setStatus(t('onchainError'));
      setSavingRequest(false);
      return;
    }

    const updateResponse = await fetchWithAccessToken(`/api/withdrawals/${withdrawalId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'submitted',
        txHash: result.txHash,
      }),
    });

    const updateJson = (await updateResponse.json().catch(() => null)) as
      | { error?: string; details?: string | null }
      | null;

    if (!updateResponse.ok) {
      const baseMessage =
        updateJson?.error ?? t('finalizeRequestError');
      setStatus(updateJson?.details ? `${baseMessage}: ${updateJson.details}` : baseMessage);
      setSavingRequest(false);
      return;
    }

    setSubmittedTxHash(result.txHash);
    setSuccessMessage(t('successProcessing'));
    setForm({ ...emptyForm, method: effectiveMethod });
    void refreshKycSummary();
    setSavingRequest(false);
  };

  return (
    <>
    <DesktopAppShell
      title={t('title')}
      subtitle={t('subtitle')}
      eyebrow={t('eyebrow')}
      searchPlaceholder={t('searchPlaceholder')}
      hideHeader
      maxWidthClassName="max-w-none"
    >
      <section className="grid grid-cols-2 gap-5">
        <DesktopMetricCard
          icon={<IconWalletBalance />}
          label={t('available')}
          value={`${displayBalance} USD`}
          detail={t('walletBalance')}
          tone="purple"
        />
        <DesktopMetricCard
          icon={isBankMethod ? <IconBank /> : <IconKey />}
          label={t('method')}
          value={isBankMethod ? t('bankPayout') : t('breveKey')}
          detail={withdrawCountryConfig.name}
          tone={isBankMethod ? 'blue' : 'amber'}
        />
      </section>

      <section>
        <DesktopSectionCard
          title={t('withdrawalRequest')}
          subtitle={t('withdrawalRequestSubtitle')}
          className="min-h-[calc(100vh-270px)] p-8"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {([
                {
                  value: 'bank' as const,
                  title: t('bank'),
                  description: t('manualBankPayout'),
                  icon: <IconBank />,
                  disabled: false,
                },
                {
                  value: 'breve' as const,
                  title: t('breve'),
                  description: withdrawCountryConfig.breveDescription,
                  icon: <IconKey />,
                  disabled: !withdrawCountryConfig.breveEnabled,
                },
              ]).map((option) => {
                const selected = effectiveMethod === option.value;
                return (
                  <button
                    key={`desktop-method-${option.value}`}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => updateForm('method', option.value)}
                    className={`rounded-[22px] border p-5 text-left transition duration-200 ${
                      selected
                        ? 'border-[#D9CCFF] bg-[#F8F5FF] shadow-[0_18px_34px_rgba(107,57,244,0.10)]'
                        : 'border-[#E8ECF4] bg-white hover:bg-[#F8F9FB]'
                    } ${option.disabled ? 'cursor-not-allowed opacity-55' : ''}`}
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F1ECFF] text-[#6B39F4]">
                      {option.icon}
                    </span>
                    <span className="mt-4 block text-sm font-bold text-[#111827]">{option.title}</span>
                    <span className="mt-1 block text-xs font-medium leading-5 text-[#73809A]">{option.description}</span>
                  </button>
                );
              })}
            </div>

            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#8A95A8]">
                {t('amount')}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => updateForm('amount', event.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                className="h-14 w-full rounded-2xl border border-[#E2E6F0] bg-white px-4 text-[1.8rem] font-bold tracking-[-0.06em] text-[#111827] outline-none shadow-[0_12px_28px_rgba(21,28,44,0.04)] focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10"
              />
            </label>

            {isBankMethod ? (
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                {withdrawCountryConfig.bankOptions.length > 0 ? (
                  <AppCombobox
                    value={form.bankName}
                    onChange={(next) => updateForm('bankName', next)}
                    options={[
                      { value: '', label: withdrawCountryConfig.bankPlaceholder },
                      ...withdrawCountryConfig.bankOptions.map((bank) => ({ value: bank, label: bank })),
                    ]}
                  />
                ) : (
                  <input
                    value={form.bankName}
                    onChange={(event) => updateForm('bankName', event.target.value)}
                    placeholder={withdrawCountryConfig.bankPlaceholder}
                    className="h-14 rounded-2xl border border-[#E2E6F0] bg-white px-4 text-sm font-semibold text-[#17203A] outline-none focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10"
                  />
                )}
                <input
                  value={form.accountNumber}
                  onChange={(event) => updateForm('accountNumber', event.target.value)}
                  placeholder={withdrawCountryConfig.accountNumberPlaceholder}
                  className="h-14 rounded-2xl border border-[#E2E6F0] bg-white px-4 text-sm font-semibold text-[#17203A] outline-none focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10"
                />
                <AppCombobox
                  value={form.accountType}
                  onChange={(next) => updateForm('accountType', next)}
                  options={[
                    { value: '', label: withdrawCountryConfig.accountTypePlaceholder },
                    ...withdrawCountryConfig.accountTypes.map((option) => ({
                      value: option.value,
                      label: option.label,
                    })),
                  ]}
                />
                <AppCombobox
                  value={form.identificationType}
                  onChange={(next) => updateForm('identificationType', next)}
                  options={[
                    { value: '', label: withdrawCountryConfig.identificationTypePlaceholder },
                    ...withdrawCountryConfig.identificationTypes.map((option) => ({
                      value: option.value,
                      label: option.label,
                    })),
                  ]}
                />
                <input
                  value={form.identificationNumber}
                  onChange={(event) => updateForm('identificationNumber', event.target.value)}
                  placeholder={withdrawCountryConfig.identificationNumberPlaceholder}
                  className="h-14 rounded-2xl border border-[#E2E6F0] bg-white px-4 text-sm font-semibold text-[#17203A] outline-none focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10"
                />
                <input
                  value={form.phoneNumber}
                  onChange={(event) => updateForm('phoneNumber', event.target.value)}
                  placeholder={withdrawCountryConfig.phonePlaceholder}
                  className="h-14 rounded-2xl border border-[#E2E6F0] bg-white px-4 text-sm font-semibold text-[#17203A] outline-none focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10"
                />
              </div>
            ) : (
              <input
                value={form.breveKey}
                onChange={(event) => updateForm('breveKey', event.target.value)}
                placeholder={withdrawCountryConfig.breveKeyPlaceholder}
                className="h-14 w-full rounded-2xl border border-[#E2E6F0] bg-white px-4 text-sm font-semibold text-[#17203A] outline-none focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10"
              />
            )}

            {status ? (
              <div className="rounded-2xl border border-[#F5C8D1] bg-[#FFF3F6] px-4 py-3 text-sm font-semibold text-[#C42847]">
                {status}
              </div>
            ) : null}
            {successMessage ? (
              <div className="rounded-2xl border border-[#BEE8D2] bg-[#EEF9F2] px-4 py-3 text-sm font-semibold text-[#177B58]">
                {successMessage}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={withdrawDisabled}
              className={`inline-flex h-14 w-full items-center justify-center rounded-2xl text-sm font-bold text-white shadow-[0_20px_42px_rgba(107,57,244,0.28)] transition ${
                withdrawDisabled
                  ? 'bg-[#C8CBE0]'
                  : 'bg-[linear-gradient(135deg,#7C5CFF_0%,#5B2FF4_100%)] hover:-translate-y-0.5'
              }`}
            >
              {savingRequest || loadingTx ? t('processingWithdrawal') : t('confirmWithdrawal')}
            </button>
          </div>
        </DesktopSectionCard>
      </section>
    </DesktopAppShell>

    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.12),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-44 text-[#101828] lg:hidden">
      <div className="pointer-events-none absolute left-1/2 top-[-9rem] h-72 w-72 -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-56 h-64 w-64 rounded-full bg-[#B9A8FF]/16 blur-3xl" />

      <div className="relative mx-auto w-full max-w-xl px-4 pb-10 pt-10 sm:px-5">
        <header className="mb-7 flex items-start gap-4 px-1">
          <div className="min-w-0">
            <div className="flex items-center gap-0.5 text-[2rem] font-semibold tracking-[-0.07em] text-[#1C2336]">
              <span>Invest</span>
              <span className="text-[#6B39F4]">App</span>
              <span className="ml-0.5 mt-0.5 h-3 w-3 rounded-full bg-[#6B39F4]" />
            </div>
            <p className="mt-7 text-[0.74rem] font-semibold uppercase tracking-[0.28em] text-[#9AA3B6]">
              INVESTAPP
            </p>
            <h1 className="mt-2 text-[2.65rem] font-semibold tracking-[-0.075em] text-[#121A31]">
              {t('title')}
            </h1>
            <p className="mt-1 text-[1.12rem] font-medium tracking-[-0.03em] text-[#7A8497]">
              {t('mobileSubtitle')}
            </p>
          </div>

        </header>

        <div className="space-y-4">
          <section className="rounded-[30px] border border-[#F3D8A6] bg-[linear-gradient(180deg,#FFF9EE_0%,#FFF6E8_100%)] px-5 py-4 shadow-[0_16px_36px_rgba(244,186,85,0.08)]">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#F3C26D] bg-white/70 text-[#F59E0B]">
                <IconInfo />
              </span>
              <p className="max-w-[29rem] text-[0.98rem] leading-8 tracking-[-0.02em] text-[#8A5B1C]">
                {t('fiatProcessingNotice')}
              </p>
            </div>
          </section>

          <Surface>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#F4F0FF] text-[#6B39F4]">
                  <IconWalletBalance />
                </span>
                <div className="min-w-0">
                  <p className="text-[1.1rem] font-semibold tracking-[-0.04em] text-[#121A31]">
                    {t('availableBalance')}
                  </p>
                  <p className="mt-1 text-[0.9rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                    {t('availableBalanceDescription')}
                  </p>
                </div>
              </div>

              <span className="shrink-0 rounded-full border border-[#D7C8FF] bg-[#FBF9FF] px-4 py-2.5 text-[1.05rem] font-semibold tracking-[-0.03em] text-[#6B39F4] shadow-[0_12px_24px_rgba(107,57,244,0.08)]">
                {displayBalance} USD
              </span>
            </div>
          </Surface>

          <Surface>
            <p className="text-[1.1rem] font-semibold tracking-[-0.04em] text-[#121A31]">
              {t('withdrawalMethod')}
            </p>
            <p className="mt-1 text-[0.95rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
              {t('withdrawalMethodDescription')}
            </p>
            <p className="mt-1 text-[0.88rem] font-medium tracking-[-0.02em] text-[#9AA3B6]">
              {t('optionsForCountry', { country: withdrawCountryConfig.name })}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {([
                {
                  value: 'bank',
                  title: t('bank'),
                  description: t('manualBankPayout'),
                  icon: <IconBank />,
                },
                {
                  value: 'breve',
                  title: t('breve'),
                  description: withdrawCountryConfig.breveDescription,
                  icon: <IconKey />,
                },
              ] as const).map((option) => {
                const active = effectiveMethod === option.value;
                const disabled = option.value === 'breve' && !withdrawCountryConfig.breveEnabled;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (disabled) return;
                      updateForm('method', option.value);
                    }}
                    disabled={disabled}
                    className={`group relative overflow-hidden rounded-[24px] border px-4 py-4 text-left transition duration-200 active:scale-[0.99] ${
                      active
                        ? 'border-transparent bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white shadow-[0_22px_44px_rgba(107,57,244,0.26)]'
                        : disabled
                          ? 'cursor-not-allowed border-[#ECECF5] bg-[linear-gradient(180deg,#FBFBFD_0%,#F7F8FC_100%)] text-[#A3ABBC] shadow-[0_8px_18px_rgba(31,38,64,0.03)] opacity-75'
                          : 'border-[#EAEAF4] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] text-[#17203A] shadow-[0_12px_24px_rgba(31,38,64,0.04)] hover:border-[#D7C8FF] hover:shadow-[0_16px_30px_rgba(107,57,244,0.10)]'
                    }`}
                  >
                    {active ? (
                      <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/16 blur-2xl" />
                    ) : null}

                    <div className="relative flex items-start justify-between gap-3">
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${
                          active
                            ? 'bg-white/12 text-white'
                            : disabled
                              ? 'bg-[#F2F4F8] text-[#B0B7C7]'
                              : 'bg-[#F4F0FF] text-[#6B39F4]'
                        }`}
                      >
                        {option.icon}
                      </span>

                      {active ? (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#6B39F4] shadow-[0_10px_20px_rgba(31,38,64,0.16)]">
                          <IconCheckCircle />
                        </span>
                      ) : null}
                    </div>

                    <p className="relative mt-4 text-[1.1rem] font-semibold tracking-[-0.04em]">
                      {option.title}
                    </p>
                    <p
                      className={`relative mt-1 text-[0.9rem] font-medium tracking-[-0.02em] ${
                        active ? 'text-white/80' : disabled ? 'text-[#A3ABBC]' : 'text-[#8A93A6]'
                      }`}
                    >
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </Surface>

          {isBankMethod ? (
            <Surface>
              <p className="text-[1.1rem] font-semibold tracking-[-0.04em] text-[#121A31]">
                {t('bankDetails')}
              </p>
              <p className="mt-1 text-[0.9rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                Fields update automatically based on your country.
              </p>

              <div className="mt-4 space-y-2.5">
                <FieldShell icon={<IconBank />}>
                  {withdrawCountryConfig.bankOptions.length > 0 ? (
                    <AppCombobox
                      value={bankNameValid ? form.bankName : ''}
                      onChange={(next) => updateForm('bankName', next)}
                      options={[
                        { value: '', label: withdrawCountryConfig.bankPlaceholder },
                        ...withdrawCountryConfig.bankOptions.map((bank) => ({ value: bank, label: bank })),
                      ]}
                    />
                  ) : (
                    <input
                      type="text"
                      value={form.bankName}
                      onChange={(event) => updateForm('bankName', event.target.value)}
                      placeholder={withdrawCountryConfig.bankPlaceholder}
                      className={formInputClassName}
                    />
                  )}
                </FieldShell>

                <FieldShell icon={<IconUser />}>
                  <input
                    type="text"
                    value={form.accountNumber}
                    onChange={(event) =>
                      updateForm('accountNumber', event.target.value.replace(/[^\d]/g, ''))
                    }
                    placeholder={withdrawCountryConfig.accountNumberPlaceholder}
                    className={formInputClassName}
                  />
                </FieldShell>

                <FieldShell icon={<IconAccountType />}>
                  <AppCombobox
                    value={accountTypeValid ? form.accountType : ''}
                    onChange={(next) => updateForm('accountType', next)}
                    options={[
                      { value: '', label: withdrawCountryConfig.accountTypePlaceholder },
                      ...withdrawCountryConfig.accountTypes.map((option) => ({
                        value: option.value,
                        label: option.label,
                      })),
                    ]}
                  />
                </FieldShell>

                <FieldShell icon={<IconIdentification />}>
                  <AppCombobox
                    value={identificationTypeValid ? form.identificationType : ''}
                    onChange={(next) => updateForm('identificationType', next)}
                    options={[
                      { value: '', label: withdrawCountryConfig.identificationTypePlaceholder },
                      ...withdrawCountryConfig.identificationTypes.map((option) => ({
                        value: option.value,
                        label: option.label,
                      })),
                    ]}
                  />
                </FieldShell>

                <FieldShell icon={<IconHash />}>
                  <input
                    type="text"
                    value={form.identificationNumber}
                    onChange={(event) =>
                      updateForm(
                        'identificationNumber',
                        event.target.value.replace(/[^\dA-Za-z]/g, '')
                      )
                    }
                    placeholder={withdrawCountryConfig.identificationNumberPlaceholder}
                    className={formInputClassName}
                  />
                </FieldShell>

                <FieldShell icon={<IconPhone />}>
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(event) =>
                      updateForm('phoneNumber', event.target.value.replace(/[^\d+\s-]/g, ''))
                    }
                    placeholder={withdrawCountryConfig.phonePlaceholder}
                    className={formInputClassName}
                  />
                </FieldShell>
              </div>
            </Surface>
          ) : (
            <Surface>
              <p className="text-[1.1rem] font-semibold tracking-[-0.04em] text-[#121A31]">
                {t('breveDetails')}
              </p>

              <div className="mt-4">
                <FieldShell icon={<IconKey />}>
                  <input
                    type="text"
                    value={form.breveKey}
                    onChange={(event) => updateForm('breveKey', event.target.value)}
                    placeholder={withdrawCountryConfig.breveKeyPlaceholder}
                    className={formInputClassName}
                  />
                </FieldShell>
              </div>
            </Surface>
          )}

          <Surface>
            <p className="text-[1.1rem] font-semibold tracking-[-0.04em] text-[#121A31]">{t('amount')}</p>

            <div className="mt-4">
              <FieldShell icon={<IconAmount />}>
                <input
                  type="text"
                  value={form.amount}
                  onChange={(event) =>
                    updateForm('amount', event.target.value.replace(/[^0-9.]/g, ''))
                  }
                  placeholder={t('amountInUsd')}
                  className={formInputClassName}
                />
              </FieldShell>
            </div>

            <p className="mt-3 text-[0.88rem] font-medium tracking-[-0.02em] text-[#7A8497]">
              {t('hiddenTransfer')}
            </p>
            <p
              className={`mt-1 text-[0.88rem] font-medium tracking-[-0.02em] ${
                amountBelowMinimum || amountExceedsSafeBalance ? 'text-[#C42847]' : 'text-[#7A8497]'
              }`}
            >
              {withdrawableBalance < MIN_WITHDRAWAL_USDC
                ? t('mustLeaveReserve', { reserve: MIN_GAS_RESERVE_USDC.toFixed(2) })
                : amountBelowMinimum
                  ? t('minimumWithdrawal', { amount: MIN_WITHDRAWAL_USDC.toFixed(2) })
                : amountExceedsSafeBalance
                ? t('safeBalanceLimit', {
                    amount: withdrawableBalance.toFixed(2),
                    reserve: MIN_GAS_RESERVE_USDC.toFixed(2),
                  })
                : t('withdrawalRange', {
                    min: MIN_WITHDRAWAL_USDC.toFixed(2),
                    max: withdrawableBalance.toFixed(2),
                    reserve: MIN_GAS_RESERVE_USDC.toFixed(2),
                  })}
            </p>
          </Surface>

          <div className="sticky bottom-[6.25rem] z-20">
            <Surface className="shadow-[0_26px_70px_rgba(31,38,64,0.12)]">
              {successMessage ? (
                <div className="mb-3 rounded-[22px] border border-[#A8E1BD] bg-[#F1FCF5] px-4 py-3.5 text-[0.95rem] font-medium tracking-[-0.02em] text-[#14845A]">
                  <p className="font-semibold">{successMessage}</p>
                  {submittedTxHash ? (
                    <p className="mt-2 break-all text-[0.78rem] text-[#14845A]/80">
                      {t('txHash', { hash: submittedTxHash })}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {status ? (
                <div className="mb-3 rounded-[22px] border border-[#F5C8D1] bg-[#FFF3F6] px-4 py-3.5 text-[0.95rem] font-medium tracking-[-0.02em] text-[#C42847]">
                  {status}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={withdrawDisabled}
                className={`flex w-full items-center justify-center gap-3 rounded-full px-5 py-4 text-[1.1rem] font-semibold tracking-[-0.04em] text-white shadow-[0_24px_50px_rgba(107,57,244,0.32)] transition ${
                  withdrawDisabled
                    ? 'bg-[linear-gradient(135deg,rgba(124,92,255,0.48)_0%,rgba(91,72,255,0.48)_100%)]'
                    : 'bg-[linear-gradient(135deg,#8D6AF9_0%,#6B39F4_55%,#5B48FF_100%)] hover:-translate-y-0.5'
                }`}
              >
                <IconPaperPlane />
                {savingRequest || loadingTx ? t('processingWithdrawal') : t('confirmWithdrawal')}
              </button>

              <p className="mt-4 text-center text-[0.84rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                {t('successProcessing')}
              </p>
            </Surface>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
    </>
  );
}
