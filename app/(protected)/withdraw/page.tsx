'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { createClient } from '@supabase/supabase-js';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PageFrame from '@/components/PageFrame';
import { useInvestApp } from '@/lib/investapp-context';

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

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://pplzpsokyytvkibhfzaa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbHpwc29reXl0dmtpYmhmemFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzUyNDYsImV4cCI6MjA4NzMxMTI0Nn0.eAh-EVMAaBAEPyacvDjRuHeojCGKodBEjWZqxjq2NDI';
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

  const balanceNumber = Number(balanceUSDC);
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

    const metadata = {
      app: 'investapp-web',
      requested_from: 'manual-withdrawal-form',
      network: 'polygon',
      asset: 'USDC',
      processing_message: 'Your withdrawal will be processed in 1 to 2 business days.',
      payout_details:
        form.method === 'bank'
          ? {
              bank_name: form.bankName,
              bank_account_number: form.accountNumber.trim(),
              bank_account_type: form.accountType,
              identification_type: form.identificationType,
              identification_number: form.identificationNumber.trim(),
              phone_number: form.phoneNumber.trim(),
            }
          : {
              breve_key: form.breveKey.trim(),
            },
    };

    const insertPayload = {
      user_id: user.id,
      role: mapRoleToDb(rolSeleccionado),
      source_wallet: smartWalletAddress,
      destination_wallet: MANUAL_WITHDRAWAL_WALLET,
      payout_method: form.method,
      bank_name: form.method === 'bank' ? form.bankName : null,
      bank_account_number: form.method === 'bank' ? form.accountNumber.trim() : null,
      bank_account_type: form.method === 'bank' ? form.accountType : null,
      identification_type: form.method === 'bank' ? form.identificationType : null,
      identification_number: form.method === 'bank' ? form.identificationNumber.trim() : null,
      phone_number: form.method === 'bank' ? form.phoneNumber.trim() : null,
      breve_key: form.method === 'breve' ? form.breveKey.trim() : null,
      amount_usdc: Number(formattedAmount),
      onchain_tx_hash: null,
      request_status: 'awaiting_transfer',
      metadata,
    };

    const { data: insertedRequest, error: insertError } = await supabase
      .from('withdraw_TEMP')
      .insert(insertPayload)
      .select('id')
      .maybeSingle();

    if (insertError || !insertedRequest?.id) {
      setStatus(
        `We could not save the withdrawal request details. Please verify that the withdraw_TEMP table exists: ${insertError?.message ?? 'unknown error'}`
      );
      setSavingRequest(false);
      return;
    }

    const result = await enviarUSDC(MANUAL_WITHDRAWAL_WALLET, formattedAmount, {
      movementType: 'withdrawal',
    });

    if (!result.success || !result.txHash) {
      await supabase
        .from('withdraw_TEMP')
        .update({
          request_status: 'failed',
          metadata: {
            ...metadata,
            transfer_failed: true,
          },
        })
        .eq('id', insertedRequest.id);

      setStatus('The on-chain withdrawal transfer could not be completed. Please try again.');
      setSavingRequest(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('withdraw_TEMP')
      .update({
        onchain_tx_hash: result.txHash,
        request_status: 'submitted',
        metadata: {
          ...metadata,
          transfer_completed: true,
        },
      })
      .eq('id', insertedRequest.id);

    if (updateError) {
      setStatus(
        `USDC was sent, but we could not finalize the withdrawal request record: ${updateError.message}`
      );
      setSavingRequest(false);
      return;
    }

    setSubmittedTxHash(result.txHash);
    setSuccessMessage('Your withdrawal will be processed in 1 to 2 business days.');
    setForm((prev) => ({ ...emptyForm, method: prev.method }));
    setSavingRequest(false);
  };

  return (
    <PageFrame title="Withdraw funds" subtitle="Temporary manual payout from USDC">
      <div className="space-y-5">
        <div className="rounded-[24px] border border-amber-200/60 bg-amber-50/90 p-4 text-sm text-amber-900 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
          Fiat withdrawals are temporarily processed manually. After confirmation, the app will send
          your USDC on Polygon to our operations wallet and your payout request will be handled
          off-platform.
        </div>

        <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Available balance</p>
              <p className="mt-1 text-xs text-gray-500">USDC ready to withdraw from your smart wallet.</p>
            </div>
            <div className="rounded-full border border-[#D3C4FC] bg-white/70 px-4 py-2 text-sm font-semibold text-[#6B39F4]">
              {balanceUSDC} USDC
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <p className="text-sm font-semibold text-gray-900">Withdrawal method</p>
          <p className="mt-1 text-xs text-gray-500">Choose how you want us to send the fiat payout.</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {([
              { value: 'bank', title: 'Bank', description: 'Manual bank payout' },
              { value: 'breve', title: 'Breve', description: 'Withdraw using a single key' },
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
              onChange={(value) => updateForm('identificationNumber', value.replace(/[^\dA-Za-z]/g, ''))}
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

        <div className="space-y-3 rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <p className="text-sm font-semibold text-gray-900">Amount</p>
          <Input
            value={form.amount}
            onChange={(value) => updateForm('amount', value.replace(/[^0-9.]/g, ''))}
            placeholder="Amount in USDC"
            type="text"
          />
          <p className="text-xs text-gray-500">The hidden transfer is sent in USDC on Polygon.</p>
        </div>

        {successMessage ? (
          <div className="rounded-[24px] border border-[#40C4AA]/35 bg-[#EFFEFA] p-4 text-sm text-[#1A8E78] shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
            <p className="font-semibold">{successMessage}</p>
            {submittedTxHash ? (
              <p className="mt-2 break-all text-xs text-[#1A8E78]/80">Tx hash: {submittedTxHash}</p>
            ) : null}
          </div>
        ) : null}

        {status ? (
          <div className="rounded-[24px] border border-[#DF1C41]/20 bg-[#FFF1F3] p-4 text-sm text-[#C42847]">
            {status}
          </div>
        ) : null}

        <div className="rounded-[24px] border border-white/25 bg-white/20 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || savingRequest || loadingTx}
            className="!rounded-full !bg-[#6B39F4] !py-4 !text-base !text-white shadow-[0_18px_38px_rgba(107,57,244,0.24)] hover:!bg-[#5B31CF]"
          >
            {savingRequest || loadingTx ? 'Processing withdrawal...' : 'Confirm withdrawal'}
          </Button>
          <p className="mt-3 text-center text-xs text-gray-500">
            Your withdrawal will be processed in 1 to 2 business days.
          </p>
        </div>
      </div>
    </PageFrame>
  );
}
