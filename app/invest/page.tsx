'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';
import {
  clearPendingInvestment,
  getPendingInvestment,
  type PendingInvestment,
} from '@/lib/pending-investment';

type SectionProps = {
  title: string;
  rightSlot?: ReactNode;
  children: ReactNode;
};

type UserRowProps = {
  name: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function Section({ title, rightSlot, children }: SectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {rightSlot}
      </div>
      <div className="rounded-xl border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
        {children}
      </div>
    </div>
  );
}

function UserRow({ name, subtitle, actionLabel, onAction }: UserRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div>
        <p className="text-sm font-medium text-gray-800">{name}</p>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
      {actionLabel ? (
        <button type="button" onClick={onAction} className="text-sm font-semibold text-purple-600">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function InvestPage() {
  const router = useRouter();
  const {
    faseApp,
    rolSeleccionado,
    userAlias,
    smartWalletAddress,
    walletTargets,
    loadingWallets,
    loadingTx,
    transferLabel,
    cargarWalletsObjetivo,
    enviarUSDC,
  } = useInvestUp();

  const [walletDestino, setWalletDestino] = useState('');
  const [monto, setMonto] = useState('200.00');
  const [pendingInvestment, setPendingInvestment] = useState<PendingInvestment | null>(null);

  const suggestions = [100, 200, 250, 300, 350, 400];
  const amountNumber = Number(monto);

  const formatAmount = (value: string) => {
    if (!value) return '';
    const sanitized = value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
    const numberValue = Number(normalized);
    if (Number.isNaN(numberValue)) return '';
    return numberValue.toFixed(2);
  };

  const handleAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
    setMonto(normalized);
  };

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const pending = getPendingInvestment();
    if (!pending) return;
    setPendingInvestment(pending);
    setWalletDestino(pending.entrepreneurWallet);
    setMonto(pending.amountUsdc);
  }, []);

  const helper = pendingInvestment
    ? 'Revisa la simulacion y confirma la transferencia al emprendedor.'
    : rolSeleccionado === 'emprendedor'
      ? 'Selecciona un inversionista para devolver capital.'
      : 'Selecciona un emprendedor para invertir.';

  const canSubmit = useMemo(
    () => Boolean(walletDestino && Number(monto) > 0),
    [walletDestino, monto]
  );

  const submitLabel = pendingInvestment ? 'Confirmar transferencia' : 'Send';
  const normalizedAmount = useMemo(() => formatAmount(monto) || monto, [monto]);

  return (
    <PageFrame
      title={pendingInvestment ? 'Transferencia de inversion' : 'Enviar'}
      subtitle={helper}
    >
      <div className="space-y-6 pb-40">
        {pendingInvestment ? (
          <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Inversion lista</p>
                <h2 className="mt-1 text-lg font-semibold text-gray-900">
                  {pendingInvestment.projectTitle}
                </h2>
                <p className="mt-1 text-sm text-gray-600">{pendingInvestment.entrepreneurName}</p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/feed/${pendingInvestment.projectId}/invest`)}
                className="rounded-full border border-primary/20 bg-white/50 px-3 py-1 text-xs font-semibold text-primary"
              >
                Editar
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/25 bg-white/30 p-3">
                <p className="text-xs text-gray-500">Monto</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {pendingInvestment.amountUsdc} USDC
                </p>
              </div>
              <div className="rounded-2xl border border-white/25 bg-white/30 p-3">
                <p className="text-xs text-gray-500">Tasa EA</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {pendingInvestment.interestRateEa}%
                </p>
              </div>
              <div className="rounded-2xl border border-white/25 bg-white/30 p-3">
                <p className="text-xs text-gray-500">Ganancia estimada</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  {pendingInvestment.projectedReturnUsdc} USDC
                </p>
              </div>
              <div className="rounded-2xl border border-white/25 bg-white/30 p-3">
                <p className="text-xs text-gray-500">Total proyectado</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  {pendingInvestment.projectedTotalUsdc} USDC
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                clearPendingInvestment();
                setPendingInvestment(null);
                setWalletDestino('');
                setMonto('');
              }}
              className="mt-4 rounded-full border border-transparent px-1 text-sm font-semibold text-gray-600"
            >
              Quitar simulacion
            </button>
          </div>
        ) : null}

        <Section
          title="Send To"
          rightSlot={
            <button
              type="button"
              onClick={cargarWalletsObjetivo}
              className="rounded-full border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-600"
            >
              Refrescar
            </button>
          }
        >
          {pendingInvestment ? (
            <div className="px-4 pb-0 pt-4">
              <div className="rounded-2xl border border-white/25 bg-white/15 p-4">
                <p className="text-xs text-gray-500">Usuario emprendedor</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {pendingInvestment.entrepreneurName}
                </p>
                <p className="mt-1 break-all text-xs text-gray-500">
                  {pendingInvestment.entrepreneurWallet}
                </p>
              </div>
            </div>
          ) : null}

          {loadingWallets ? <p className="px-4 py-4 text-sm text-gray-500">Cargando wallets...</p> : null}
          {!loadingWallets && walletTargets.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-500">
              No hay wallets disponibles en Supabase para este perfil.
            </p>
          ) : null}
          <div className="px-4 pb-4 pt-4">
            <input
              type="text"
              value={walletDestino}
              onChange={(event) => setWalletDestino(event.target.value)}
              placeholder="Nueva direccion 0x..."
              className="w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2 text-sm text-gray-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:ring-2 focus:ring-purple-200/40"
            />
          </div>
          <div className="divide-y divide-white/15">
            {walletTargets.slice(0, 5).map((target) => {
              const isActive = walletDestino === target.wallet_address;
              const name = target.email ?? target.id;
              const subtitle = target.wallet_address
                ? `${transferLabel} - ${target.wallet_address.slice(0, 8)}...`
                : transferLabel;

              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => setWalletDestino(target.wallet_address ?? '')}
                  className={`flex w-full items-center justify-between px-4 py-4 text-left transition ${
                    isActive ? 'bg-white/20 ring-1 ring-purple-300' : 'hover:bg-white/10'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{name}</p>
                    <p className="text-xs text-gray-500">{subtitle}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isActive ? 'text-purple-600' : 'text-gray-400'
                    }`}
                  >
                    {isActive ? 'Selected' : 'Select'}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="From">
          <UserRow
            name={userAlias || 'Usuario'}
            subtitle={smartWalletAddress ? `Wallet - ${smartWalletAddress.slice(0, 8)}...` : 'Wallet no disponible'}
          />
        </Section>

        <Section title="Amount">
          <div className="flex items-center gap-2 px-4 pb-4">
            <span className="text-sm font-semibold text-gray-500">USD</span>
            <input
              type="text"
              inputMode="decimal"
              value={monto}
              onChange={(event) => handleAmountChange(event.target.value)}
              onBlur={() => setMonto(formatAmount(monto))}
              className="w-full bg-transparent text-3xl font-bold outline-none"
              placeholder="0.00"
            />
          </div>
        </Section>

        <div>
          <h3 className="mb-2 mt-2 text-sm font-medium text-gray-500">Suggestion Amount</h3>
          <div className="grid grid-cols-3 gap-3">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setMonto(suggestion.toFixed(2))}
                className={`rounded-xl border py-3 text-center font-semibold ${
                  amountNumber === suggestion
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-white/25 bg-white/20 text-gray-700 backdrop-blur-md'
                }`}
              >
                ${suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={async () => {
          const success = await enviarUSDC(walletDestino, normalizedAmount);
          if (!success) return;
          if (pendingInvestment) {
            clearPendingInvestment();
            setPendingInvestment(null);
          }
          setMonto('');
          setWalletDestino('');
        }}
        disabled={!canSubmit || loadingTx}
        className={`fixed bottom-[5.5rem] left-5 right-5 z-10 rounded-xl py-4 font-semibold text-white shadow-lg transition ${
          !canSubmit || loadingTx ? 'bg-purple-300' : 'bg-purple-600'
        }`}
      >
        {loadingTx ? 'Procesando...' : submitLabel}
      </button>
    </PageFrame>
  );
}
