'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useInvestUp } from '@/lib/investup-context';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';

function IconEye({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 4.6A10.4 10.4 0 0 1 12 4c5 0 9.3 3.1 11 8-0.7 2-1.9 3.7-3.5 4.9" />
      <path d="M6.1 6.1C4 7.5 2.5 9.5 1 12c1.7 4.9 6 8 11 8 1 0 2-0.1 3-0.4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12c1.7-4.9 6-8 11-8s9.3 3.1 11 8c-1.7 4.9-6 8-11 8s-9.3-3.1-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}

type ActionItem = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
};

type NavItem = {
  label: string;
  href: string;
  active?: boolean;
};

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    faseApp,
    rolSeleccionado,
    userAlias,
    balanceUSDC,
    historial,
    abrirCompra,
  } = useInvestUp();
  const { avatarUrl, displayName: profileName } = useUserProfileSummary();
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  const displayName = useMemo(() => profileName || userAlias || 'Usuario', [profileName, userAlias]);
  const sectionTitle = rolSeleccionado === 'emprendedor' ? 'Mis publicaciones' : 'Inversiones';
  const addLabel =
    rolSeleccionado === 'emprendedor'
      ? 'Agregar nueva publicación'
      : 'Invertir en nuevo emprendimiento';

  const actions: ActionItem[] = [
    { label: 'Comprar', icon: <IconPlus />, onClick: abrirCompra },
    { label: 'Enviar', icon: <IconSend />, onClick: () => router.push('/invest') },
    { label: 'Invertir', icon: <IconDownload />, onClick: () => router.push('/feed') },
    { label: 'Historial', icon: <IconClock />, onClick: () => router.push('/portfolio') },
  ];

  const navItems: NavItem[] = [
    { label: 'Home', href: '/home' },
    { label: 'Activity', href: '/portfolio' },
    { label: 'Enviar', href: '/invest' },
    { label: 'Invertir', href: '/feed' },
    { label: 'Wallet', href: '/buy' },
    { label: 'Profile', href: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 px-5 pb-28 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-200">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-600">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Hola! Bienvenido</p>
            <h1 className="text-xl font-semibold text-gray-900">{displayName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Buscar"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
          >
            <IconSearch />
          </button>
          <button
            type="button"
            aria-label="Notificaciones"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
          >
            <IconBell />
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl bg-purple-600 p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm opacity-80">Disponible</p>
            <h2 className="mt-1 text-3xl font-bold">
              {showBalance ? `$${balanceUSDC}` : 'XXXX.XX'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowBalance((prev) => !prev)}
            className="rounded-full bg-white/20 p-2 text-white"
            aria-label={showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
          >
            <IconEye hidden={!showBalance} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/80">
          <span>Recaudado: --</span>
          <span className="opacity-60">•</span>
          <span>Tasa Interés: --</span>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-4 gap-3 text-center">
        {actions.map((action) => (
          <button key={action.label} type="button" onClick={action.onClick} className="flex flex-col items-center">
            <div className="mb-2 rounded-full bg-white p-3 text-purple-600 shadow-md">
              {action.icon}
            </div>
            <p className="text-sm text-gray-700">{action.label}</p>
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{sectionTitle}</h2>
        <button
          type="button"
          onClick={() => router.push('/portfolio')}
          className="text-sm font-medium text-purple-600"
        >
          Ver todo
        </button>
      </div>

      <div className="space-y-4">
        {rolSeleccionado === 'inversor' ? (
          historial.length > 0 ? (
            historial.slice(0, 3).map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Inversión</p>
                <p className="mt-1 text-base font-semibold text-gray-900">{item}</p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-white p-5 text-sm text-gray-500 shadow-sm">
              Aun no tienes inversiones registradas.
            </div>
          )
        ) : (
          <div className="rounded-2xl bg-white p-5 text-sm text-gray-500 shadow-sm">
            Aqui veras tus publicaciones cuando esten activas.
          </div>
        )}

        <button
          type="button"
          onClick={() => router.push(rolSeleccionado === 'emprendedor' ? '/portfolio' : '/feed')}
          className="w-full rounded-xl border-2 border-dashed border-gray-400 py-4 text-gray-500"
        >
          + {addLabel}
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-xl items-center justify-around px-4 py-3">
          {navItems.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={`text-center text-xs font-semibold ${
                pathname?.startsWith(item.href) ? 'text-purple-600' : 'text-gray-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
