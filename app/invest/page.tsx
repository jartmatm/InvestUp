'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PageFrame from '@/components/PageFrame';
import { useInvestUp } from '@/lib/investup-context';

export default function InvestPage() {
  const router = useRouter();
  const {
    faseApp,
    rolSeleccionado,
    walletTargets,
    loadingWallets,
    loadingTx,
    historial,
    transferLabel,
    transferenciaTitulo,
    cargarWalletsObjetivo,
    enviarUSDC,
  } = useInvestUp();

  const [walletDestino, setWalletDestino] = useState('');
  const [monto, setMonto] = useState('');

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  const title = rolSeleccionado === 'emprendedor' ? 'Repayments' : 'Inversiones';
  const helper =
    rolSeleccionado === 'emprendedor'
      ? 'Selecciona un inversionista para devolver capital.'
      : 'Selecciona un emprendedor para invertir.';

  const canSubmit = useMemo(() => Boolean(walletDestino && monto), [walletDestino, monto]);

  return (
    <PageFrame title={title} subtitle={helper}>
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Wallets objetivo ({transferLabel})</h2>
          <button
            onClick={cargarWalletsObjetivo}
            className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary"
          >
            Refrescar
          </button>
        </div>

        {loadingWallets ? <p className="text-sm text-slate-500">Cargando wallets...</p> : null}
        {!loadingWallets && walletTargets.length === 0 ? (
          <p className="text-sm text-slate-500">No hay wallets disponibles en Supabase para este perfil.</p>
        ) : null}

        <div className="space-y-2">
          {walletTargets.map((target) => (
            <button
              key={target.id}
              onClick={() => setWalletDestino(target.wallet_address ?? '')}
              className={`w-full rounded-2xl border p-3 text-left transition ${walletDestino === target.wallet_address ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white hover:border-primary/40'}`}
            >
              <p className="text-sm font-semibold text-slate-800">{target.email ?? target.id}</p>
              <p className="break-all text-xs text-slate-500">{target.wallet_address}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">{transferenciaTitulo}</h2>
        <Input placeholder="Wallet destino 0x..." value={walletDestino} onChange={setWalletDestino} />
        <Input
          className="mt-3"
          type="number"
          placeholder="Monto USDC"
          value={monto}
          onChange={setMonto}
        />
        <div className="mt-4">
          <Button
            disabled={!canSubmit || loadingTx}
            onClick={async () => {
              await enviarUSDC(walletDestino, monto);
              setMonto('');
            }}
          >
            {loadingTx ? 'Procesando...' : title === 'Repayments' ? 'Confirmar repayment' : 'Confirmar inversion'}
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-900">Actividad reciente</h2>
        {historial.length === 0 ? (
          <p className="text-sm text-slate-500">No hay operaciones en esta sesion.</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-700">
            {historial.slice(0, 6).map((item, index) => (
              <li key={`${item}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageFrame>
  );
}

