'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';

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
      <div className="rounded-xl bg-white shadow-sm">{children}</div>
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
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');

  const suggestions = [100, 200, 250, 300, 350, 400];
  const amountNumber = Number(monto);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  const helper =
    rolSeleccionado === 'emprendedor'
      ? 'Selecciona un inversionista para devolver capital.'
      : 'Selecciona un emprendedor para invertir.';

  const canSubmit = useMemo(() => Boolean(walletDestino && monto), [walletDestino, monto]);

  return (
    <PageFrame title="Detail" subtitle={helper}>
      <div className="space-y-6 pb-28">
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
          {loadingWallets ? <p className="px-4 py-4 text-sm text-gray-500">Cargando wallets...</p> : null}
          {!loadingWallets && walletTargets.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-500">
              No hay wallets disponibles en Supabase para este perfil.
            </p>
          ) : null}
          <div className="divide-y divide-gray-200">
            {walletTargets.map((target) => {
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
                    isActive ? 'bg-purple-50' : 'hover:bg-gray-50'
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
          <div className="px-4 pb-4">
            <input
              type="number"
              value={monto}
              onChange={(event) => setMonto(event.target.value)}
              className="w-full bg-transparent text-3xl font-bold outline-none"
              placeholder="0"
            />
          </div>
        </Section>

        <div>
          <h3 className="mb-2 mt-2 text-sm font-medium text-gray-500">Suggestion Amount</h3>
          <div className="grid grid-cols-3 gap-3">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setMonto(String(s))}
                className={`rounded-xl border py-3 text-center font-semibold ${
                  amountNumber === s
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                ${s}
              </button>
            ))}
          </div>
        </div>

        <Section title="Note (Optional)">
          <div className="px-4 pb-4">
            <textarea
              value={nota}
              onChange={(event) => setNota(event.target.value)}
              placeholder="Write a note..."
              className="w-full resize-none bg-transparent text-sm outline-none"
              rows={2}
            />
          </div>
        </Section>
      </div>

      <button
        type="button"
        onClick={async () => {
          await enviarUSDC(walletDestino, monto);
          setMonto('');
        }}
        disabled={!canSubmit || loadingTx}
        className={`fixed left-5 right-5 bottom-24 rounded-xl py-4 font-semibold text-white shadow-lg transition ${
          !canSubmit || loadingTx ? 'bg-purple-300' : 'bg-purple-600'
        }`}
      >
        {loadingTx ? 'Procesando...' : 'Send'}
      </button>
    </PageFrame>
  );
}

