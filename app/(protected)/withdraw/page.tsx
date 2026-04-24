'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import BottomNav from '@/components/BottomNav';
import { useInvestApp } from '@/lib/investapp-context';
import { fetchCurrentUserKycSummary } from '@/utils/client/current-user-kyc';
import {
  formatKycLevelLimit,
  getKycLevelBadgeLabel,
  type CurrentUserKycSummary,
} from '@/utils/kyc/shared';

type WithdrawalMethod = 'bank' | 'breve';
type AccountType = 'ahorros' | 'corriente' | '';
type IdentificationType = 'cc' | 'ti' | 'te' | 'pasaporte' | '';

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

function IconShieldCheck() {
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

function IconChevronDown() {
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
      <path d="m6 9 6 6 6-6" />
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
  const [kycSummary, setKycSummary] = useState<CurrentUserKycSummary | null>(null);
  const [loadingKyc, setLoadingKyc] = useState(true);

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
        setKycSummary(null);
        setLoadingKyc(false);
        return null;
      }

      setLoadingKyc(true);
      const { data, error } = await fetchCurrentUserKycSummary(getAccessToken, requestedAmountUsd);
      if (error) {
        setLoadingKyc(false);
        setStatus(`Could not verify your KYC status: ${error}`);
        return null;
      }

      setKycSummary(data);
      setLoadingKyc(false);
      return data;
    },
    [getAccessToken, user?.id]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshKycSummary();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshKycSummary]);

  const balanceNumber = Number(balanceUSDC);
  const displayBalance = Number.isFinite(balanceNumber) ? balanceNumber.toFixed(2) : '0.00';
  const formattedAmount = formatAmountForSubmit(form.amount);
  const amountNumber = Number(formattedAmount);
  const isBankMethod = form.method === 'bank';
  const canSubmit =
    !!user?.id &&
    !!smartWalletAddress &&
    !!formattedAmount &&
    amountNumber > 0 &&
    (isBankMethod
      ? Boolean(
          form.bankName &&
            form.accountNumber.trim() &&
            form.accountType &&
            form.identificationType &&
            form.identificationNumber.trim() &&
            form.phoneNumber.trim()
        )
      : Boolean(form.breveKey.trim()));
  const kycBadgeLabel = getKycLevelBadgeLabel(kycSummary?.approvedLevel ?? 0);
  const kycLimitLabel = formatKycLevelLimit(kycSummary?.currentLevelLimitUsd ?? 0);
  const withdrawDisabled =
    !canSubmit ||
    savingRequest ||
    loadingTx ||
    loadingKyc ||
    Boolean(kycSummary && !kycSummary.canAccessWithdraw);

  const updateForm = <K extends keyof WithdrawForm>(key: K, value: WithdrawForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      setStatus('You need to be signed in to request a withdrawal.');
      return;
    }

    if (!smartWalletAddress) {
      setStatus('Wait until your smart wallet is ready.');
      return;
    }

    if (!formattedAmount || amountNumber <= 0) {
      setStatus('Enter a valid amount to withdraw.');
      return;
    }

    if (Number.isFinite(balanceNumber) && balanceNumber > 0 && amountNumber > balanceNumber) {
      setStatus('The withdrawal amount exceeds your available USDC balance.');
      return;
    }

    if (isBankMethod) {
      if (
        !form.bankName ||
        !form.accountNumber.trim() ||
        !form.accountType ||
        !form.identificationType ||
        !form.identificationNumber.trim() ||
        !form.phoneNumber.trim()
      ) {
        setStatus('Complete all bank withdrawal fields before confirming.');
        return;
      }
    } else if (!form.breveKey.trim()) {
      setStatus('Enter the Breve key before confirming.');
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
          `This withdrawal requires ${getKycLevelBadgeLabel(
            nextKycSummary.requiredLevelForRequestedAmount
          )}.`
      );
      setSavingRequest(false);
      return;
    }

    const createResponse = await fetchWithAccessToken('/api/withdrawals', {
      method: 'POST',
      body: JSON.stringify({
        payoutMethod: form.method,
        sourceWallet: smartWalletAddress,
        amountUsdc: formattedAmount,
        role: mapRoleToDb(rolSeleccionado),
        bankName: form.method === 'bank' ? form.bankName : null,
        accountNumber: form.method === 'bank' ? form.accountNumber.trim() : null,
        accountType: form.method === 'bank' ? form.accountType : null,
        identificationType: form.method === 'bank' ? form.identificationType : null,
        identificationNumber: form.method === 'bank' ? form.identificationNumber.trim() : null,
        phoneNumber: form.method === 'bank' ? form.phoneNumber.trim() : null,
        breveKey: form.method === 'breve' ? form.breveKey.trim() : null,
      }),
    });

    const createJson = (await createResponse.json().catch(() => null)) as
      | { id?: string; error?: string; details?: string | null }
      | null;

    if (!createResponse.ok || !createJson?.id) {
      const baseMessage = createJson?.error ?? 'We could not create the withdrawal request.';
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

      setStatus('The on-chain withdrawal transfer could not be completed. Please try again.');
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
        updateJson?.error ?? 'USDC was sent, but we could not finalize the withdrawal request.';
      setStatus(updateJson?.details ? `${baseMessage}: ${updateJson.details}` : baseMessage);
      setSavingRequest(false);
      return;
    }

    setSubmittedTxHash(result.txHash);
    setSuccessMessage('Your withdrawal will be processed in 1 to 2 business days.');
    setForm((prev) => ({ ...emptyForm, method: prev.method }));
    void refreshKycSummary();
    setSavingRequest(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_-8%,rgba(124,92,255,0.12),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_52%,#F8F9FD_100%)] pb-44 text-[#101828]">
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
              Withdraw funds
            </h1>
            <p className="mt-1 text-[1.12rem] font-medium tracking-[-0.03em] text-[#7A8497]">
              Temporary manual payout from USDC
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
                Fiat withdrawals will be processed. After confirmation, the app will send your
                USD to your bank account.
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
                    Available balance
                  </p>
                  <p className="mt-1 text-[0.9rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                    USD ready to withdraw from your wallet.
                  </p>
                </div>
              </div>

              <span className="shrink-0 rounded-full border border-[#D7C8FF] bg-[#FBF9FF] px-4 py-2.5 text-[1.05rem] font-semibold tracking-[-0.03em] text-[#6B39F4] shadow-[0_12px_24px_rgba(107,57,244,0.08)]">
                {displayBalance} USD
              </span>
            </div>
          </Surface>

          <Surface>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <span className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#EAF8F0] text-[#22A763]">
                  <IconShieldCheck />
                </span>
                <div className="min-w-0">
                  <p className="text-[1.1rem] font-semibold tracking-[-0.04em] text-[#121A31]">
                    KYC compliance
                  </p>
                  <p className="mt-1 text-[0.96rem] font-medium tracking-[-0.02em] text-[#7A8497]">
                    {loadingKyc
                      ? 'Checking your compliance limits...'
                      : kycSummary?.exempt
                        ? 'This account is exempt from KYC withdrawal limits.'
                        : `Movement: ${kycSummary?.movementUsd?.toFixed(2) ?? '0.00'} USD · ${kycLimitLabel}.`}
                  </p>
                  {kycSummary?.nextLevel ? (
                    <p className="mt-1 text-[0.9rem] font-medium tracking-[-0.02em] text-[#7A8497]">
                      Next level: Lvl {kycSummary.nextLevel}{' '}
                      {kycSummary.nextLevelLimitUsd == null
                        ? '(no limit)'
                        : `(up to ${kycSummary.nextLevelLimitUsd.toFixed(0)} USD)`}
                    </p>
                  ) : null}
                </div>
              </div>

              <span className="shrink-0 rounded-full border border-[#A8E1BD] bg-[#F1FCF5] px-4 py-2.5 text-[1rem] font-semibold tracking-[-0.03em] text-[#22A763]">
                {kycBadgeLabel}
              </span>
            </div>

            {!loadingKyc && kycSummary?.missingForCurrentLevel?.length ? (
              <div className="mt-4 rounded-[22px] border border-[#F5D7A6] bg-[#FFF8EC] px-4 py-3.5 text-[0.95rem] font-medium tracking-[-0.02em] text-[#9D6520]">
                Missing to unlock withdrawals: {kycSummary.missingForCurrentLevel.join(', ')}.
              </div>
            ) : null}
          </Surface>

          <Surface>
            <p className="text-[1.1rem] font-semibold tracking-[-0.04em] text-[#121A31]">
              Withdrawal method
            </p>
            <p className="mt-1 text-[0.95rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
              Choose how you want us to send the fiat payout.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {([
                {
                  value: 'bank',
                  title: 'Bank',
                  description: 'Manual bank payout',
                  icon: <IconBank />,
                },
                {
                  value: 'breve',
                  title: 'Breve',
                  description: 'Withdraw using a single key',
                  icon: <IconKey />,
                },
              ] as const).map((option) => {
                const active = form.method === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateForm('method', option.value)}
                    className={`group relative overflow-hidden rounded-[24px] border px-4 py-4 text-left transition duration-200 active:scale-[0.99] ${
                      active
                        ? 'border-transparent bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white shadow-[0_22px_44px_rgba(107,57,244,0.26)]'
                        : 'border-[#EAEAF4] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] text-[#17203A] shadow-[0_12px_24px_rgba(31,38,64,0.04)] hover:border-[#D7C8FF] hover:shadow-[0_16px_30px_rgba(107,57,244,0.10)]'
                    }`}
                  >
                    {active ? (
                      <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/16 blur-2xl" />
                    ) : null}

                    <div className="relative flex items-start justify-between gap-3">
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${
                          active ? 'bg-white/12 text-white' : 'bg-[#F4F0FF] text-[#6B39F4]'
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
                        active ? 'text-white/80' : 'text-[#8A93A6]'
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
                Bank details
              </p>

              <div className="mt-4 space-y-2.5">
                <FieldShell icon={<IconBank />}>
                  <div className="relative">
                    <select
                      value={form.bankName}
                      onChange={(event) => updateForm('bankName', event.target.value)}
                      className={`${formInputClassName} appearance-none pr-10`}
                    >
                      <option value="">Select a bank or wallet</option>
                      {BANK_OPTIONS.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[#7F899D]">
                      <IconChevronDown />
                    </span>
                  </div>
                </FieldShell>

                <FieldShell icon={<IconUser />}>
                  <input
                    type="text"
                    value={form.accountNumber}
                    onChange={(event) =>
                      updateForm('accountNumber', event.target.value.replace(/[^\d]/g, ''))
                    }
                    placeholder="Account number"
                    className={formInputClassName}
                  />
                </FieldShell>

                <FieldShell icon={<IconAccountType />}>
                  <div className="relative">
                    <select
                      value={form.accountType}
                      onChange={(event) => updateForm('accountType', event.target.value as AccountType)}
                      className={`${formInputClassName} appearance-none pr-10`}
                    >
                      <option value="">Account type</option>
                      <option value="ahorros">Ahorros</option>
                      <option value="corriente">Corriente</option>
                    </select>
                    <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[#7F899D]">
                      <IconChevronDown />
                    </span>
                  </div>
                </FieldShell>

                <FieldShell icon={<IconIdentification />}>
                  <div className="relative">
                    <select
                      value={form.identificationType}
                      onChange={(event) =>
                        updateForm('identificationType', event.target.value as IdentificationType)
                      }
                      className={`${formInputClassName} appearance-none pr-10`}
                    >
                      <option value="">Identification type</option>
                      <option value="cc">CC</option>
                      <option value="ti">TI</option>
                      <option value="te">TE</option>
                      <option value="pasaporte">Pasaporte</option>
                    </select>
                    <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[#7F899D]">
                      <IconChevronDown />
                    </span>
                  </div>
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
                    placeholder="Identification number"
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
                    placeholder="Phone number"
                    className={formInputClassName}
                  />
                </FieldShell>
              </div>
            </Surface>
          ) : (
            <Surface>
              <p className="text-[1.1rem] font-semibold tracking-[-0.04em] text-[#121A31]">
                Breve details
              </p>

              <div className="mt-4">
                <FieldShell icon={<IconKey />}>
                  <input
                    type="text"
                    value={form.breveKey}
                    onChange={(event) => updateForm('breveKey', event.target.value)}
                    placeholder="Breve key"
                    className={formInputClassName}
                  />
                </FieldShell>
              </div>
            </Surface>
          )}

          <Surface>
            <p className="text-[1.1rem] font-semibold tracking-[-0.04em] text-[#121A31]">Amount</p>

            <div className="mt-4">
              <FieldShell icon={<IconAmount />}>
                <input
                  type="text"
                  value={form.amount}
                  onChange={(event) =>
                    updateForm('amount', event.target.value.replace(/[^0-9.]/g, ''))
                  }
                  placeholder="Amount in USDC"
                  className={formInputClassName}
                />
              </FieldShell>
            </div>

            <p className="mt-3 text-[0.88rem] font-medium tracking-[-0.02em] text-[#7A8497]">
              The hidden transfer is sent in USDC on Polygon.
            </p>
          </Surface>

          <div className="sticky bottom-[6.25rem] z-20">
            <Surface className="shadow-[0_26px_70px_rgba(31,38,64,0.12)]">
              {successMessage ? (
                <div className="mb-3 rounded-[22px] border border-[#A8E1BD] bg-[#F1FCF5] px-4 py-3.5 text-[0.95rem] font-medium tracking-[-0.02em] text-[#14845A]">
                  <p className="font-semibold">{successMessage}</p>
                  {submittedTxHash ? (
                    <p className="mt-2 break-all text-[0.78rem] text-[#14845A]/80">
                      Tx hash: {submittedTxHash}
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
                {savingRequest || loadingTx ? 'Processing withdrawal...' : 'Confirm withdrawal'}
              </button>

              <p className="mt-4 text-center text-[0.84rem] font-medium tracking-[-0.02em] text-[#8A93A6]">
                Your withdrawal will be processed in 1 to 2 business days.
              </p>
            </Surface>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
