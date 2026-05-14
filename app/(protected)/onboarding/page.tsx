'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useInvestApp } from '@/lib/investapp-context';

type OnboardingStage = 'slides' | 'profile';
type FrontRole = 'inversor' | 'emprendedor';

type SlideDefinition = {
  id: string;
  imageSrc: string;
  titleKey: string;
  descriptionKey: string;
};

const ONBOARDING_SLIDES: SlideDefinition[] = [
  {
    id: 'opportunities',
    imageSrc: '/onboarding/onboarding-opportunities.png',
    titleKey: 'slides.opportunities.title',
    descriptionKey: 'slides.opportunities.description',
  },
  {
    id: 'portfolio',
    imageSrc: '/onboarding/onboarding-portfolio.png',
    titleKey: 'slides.portfolio.title',
    descriptionKey: 'slides.portfolio.description',
  },
  {
    id: 'send',
    imageSrc: '/onboarding/onboarding-send.png',
    titleKey: 'slides.send.title',
    descriptionKey: 'slides.send.description',
  },
];

const SWIPE_THRESHOLD = 46;

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function InvestAppWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'inline-flex items-center font-semibold text-[#111827]',
        compact ? 'text-xl' : 'text-3xl'
      )}
    >
      <span>Invest</span>
      <span className="text-[#6B39F4]">App</span>
      <span className={cn('ml-1 rounded-full bg-[#6B39F4]', compact ? 'h-2 w-2' : 'h-3 w-3')} />
    </div>
  );
}

function ChevronRightIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function RoleButton({
  active,
  title,
  description,
  tone,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  tone: 'purple' | 'green';
  onClick: () => void;
}) {
  const activeClass =
    tone === 'purple'
      ? 'border-[#6B39F4]/35 bg-[#6B39F4]/10 text-[#6B39F4] shadow-[0_14px_28px_rgba(107,57,244,0.12)]'
      : 'border-[#40C4AA]/35 bg-[#40C4AA]/12 text-[#1C9A82] shadow-[0_14px_28px_rgba(64,196,170,0.12)]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-[24px] border px-5 py-5 text-left transition',
        active ? activeClass : 'border-slate-200/80 bg-white/80 text-slate-700 hover:bg-white'
      )}
    >
      <p className="text-base font-semibold">{title}</p>
      <p
        className={cn(
          'mt-1 text-sm leading-5',
          active ? (tone === 'purple' ? 'text-[#6B39F4]/80' : 'text-[#1C9A82]/80') : 'text-slate-500'
        )}
      >
        {description}
      </p>
    </button>
  );
}

function SlideDots({ activeIndex, label }: { activeIndex: number; label: string }) {
  return (
    <div className="flex items-center justify-center gap-3" aria-label={label}>
      {ONBOARDING_SLIDES.map((slide, index) => (
        <span
          key={slide.id}
          className={cn(
            'h-2.5 w-2.5 rounded-full transition-all duration-300',
            index === activeIndex ? 'bg-[#6B39F4]' : 'bg-[#9CA3AF]/80'
          )}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const t = useTranslations('Onboarding');
  const tx = (key: string) => t(key as never);
  const router = useRouter();
  const { faseApp, guardarRol, rolSeleccionado } = useInvestApp();
  const [rol, setRol] = useState<FrontRole | null>(rolSeleccionado);
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [status, setStatus] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [stage, setStage] = useState<OnboardingStage>('slides');
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);
  const showOnboarding = faseApp === 'onboarding';
  const activeSlide = ONBOARDING_SLIDES[currentSlide];

  useEffect(() => {
    if (faseApp === 'dashboard') router.replace('/home');
    if (faseApp === 'login') router.replace('/login');
  }, [faseApp, router]);

  useEffect(() => {
    if (faseApp === 'onboarding') {
      setStage(rolSeleccionado ? 'slides' : 'profile');
    }
  }, [faseApp, rolSeleccionado]);

  useEffect(() => {
    setRol(rolSeleccionado);
  }, [rolSeleccionado]);

  if (!showOnboarding) {
    return <main className="min-h-screen bg-transparent" />;
  }

  const completeSlides = async () => {
    if (!rol) {
      setStage('profile');
      return;
    }

    setSavingRole(true);
    setStatus('');
    try {
      await guardarRol(rol, { completeOnboarding: true });
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : t('roleUpdateError')
      );
    } finally {
      setSavingRole(false);
    }
  };

  const goToSlide = (targetIndex: number) => {
    if (savingRole) return;
    const clampedIndex = Math.max(0, Math.min(ONBOARDING_SLIDES.length - 1, targetIndex));
    if (clampedIndex === currentSlide) return;
    setDirection(clampedIndex > currentSlide ? 1 : -1);
    setCurrentSlide(clampedIndex);
  };

  const goToNext = () => {
    if (currentSlide >= ONBOARDING_SLIDES.length - 1) {
      void completeSlides();
      return;
    }
    goToSlide(currentSlide + 1);
  };

  const goToPrevious = () => {
    goToSlide(currentSlide - 1);
  };

  const handleTouchStart = (clientX: number) => {
    touchStartX.current = clientX;
    touchCurrentX.current = clientX;
  };

  const handleTouchMove = (clientX: number) => {
    touchCurrentX.current = clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchCurrentX.current === null) {
      touchStartX.current = null;
      touchCurrentX.current = null;
      return;
    }

    const deltaX = touchCurrentX.current - touchStartX.current;

    if (deltaX <= -SWIPE_THRESHOLD) {
      goToNext();
    } else if (deltaX >= SWIPE_THRESHOLD) {
      goToPrevious();
    }

    touchStartX.current = null;
    touchCurrentX.current = null;
  };

  if (stage === 'profile') {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent px-5 py-8 text-gray-900">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/fondo_home.jpg')" }}
        />
        <div className="absolute inset-0 bg-white/35 backdrop-blur-[3px]" />

        <section className="relative mx-auto w-full max-w-xl rounded-[30px] border border-white/35 bg-white/75 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mb-6 flex items-center justify-center"
          >
            <InvestAppWordmark />
          </motion.div>

          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6B39F4]/70">
              {t('welcome')}
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">{t('chooseProfile')}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              {t('chooseProfileDescription')}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RoleButton
              active={rol === 'inversor'}
              title={t('investor')}
              description={t('investorDescription')}
              tone="purple"
              onClick={() => setRol('inversor')}
            />
            <RoleButton
              active={rol === 'emprendedor'}
              title={t('entrepreneur')}
              description={t('entrepreneurDescription')}
              tone="green"
              onClick={() => setRol('emprendedor')}
            />
          </div>

          <label className="mt-6 flex items-start gap-3 rounded-2xl border border-white/55 bg-white/70 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={acceptsTerms}
              onChange={(event) => setAcceptsTerms(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#6B39F4]"
            />
            <span>
              {t('acceptPrefix')}{' '}
              <a
                href="https://www.investappgroup.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#6B39F4] underline decoration-[#6B39F4]/40 underline-offset-2"
              >
                {t('termsAndConditions')}
              </a>
              .
            </span>
          </label>

          <button
            type="button"
            disabled={!rol || !acceptsTerms || savingRole}
            className="mt-6 w-full cursor-pointer rounded-[18px] bg-[#6B39F4] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(107,57,244,0.22)] transition hover:bg-[#5c2ff0] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            onClick={async () => {
              if (!rol) return;
              setSavingRole(true);
              setStatus('');
              try {
                await guardarRol(rol, { completeOnboarding: false });
                setCurrentSlide(0);
                setDirection(1);
                setStage('slides');
              } catch (error) {
                setStatus(
                  error instanceof Error
                    ? error.message
                    : t('roleUpdateError')
                );
              } finally {
                setSavingRole(false);
              }
            }}
          >
            {savingRole ? t('saving') : t('continue')}
          </button>

          {status ? <p className="mt-4 text-center text-sm text-rose-600">{status}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] min-h-screen overflow-hidden bg-[#F7F8FF] text-[#101828]">
      <div
        className="relative h-full w-full touch-pan-y select-none overflow-hidden"
        onTouchStart={(event) => handleTouchStart(event.touches[0]?.clientX ?? 0)}
        onTouchMove={(event) => handleTouchMove(event.touches[0]?.clientX ?? 0)}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activeSlide.id}
            custom={direction}
            initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? '-100%' : '100%', opacity: 0.9 }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={activeSlide.imageSrc}
              alt={tx(activeSlide.titleKey)}
              fill
              priority={currentSlide === 0}
              sizes="100vw"
              className="object-cover object-top"
            />
          </motion.div>
        </AnimatePresence>

        <section className="absolute inset-x-0 bottom-0 z-20 flex h-[25dvh] min-h-[220px] flex-col items-center rounded-t-[34px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(247,241,255,0.62)_42%,rgba(232,245,255,0.58))] px-7 pb-[max(env(safe-area-inset-bottom),1rem)] pt-5 text-center shadow-[0_-24px_70px_rgba(77,63,137,0.14)] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[21rem] flex-1 flex-col items-center justify-center">
            <h1 className="text-[1.45rem] font-semibold leading-tight text-black">{tx(activeSlide.titleKey)}</h1>
            <p className="mt-3 text-[0.98rem] font-medium leading-6 text-black/78">
              {tx(activeSlide.descriptionKey)}
            </p>
          </div>

          {status ? <p className="mb-3 text-xs font-medium text-rose-600">{status}</p> : null}

          <button
            type="button"
            aria-label={
              currentSlide === ONBOARDING_SLIDES.length - 1 ? t('finishOnboarding') : t('nextSlide')
            }
            onClick={goToNext}
            disabled={savingRole}
            className="flex h-[68px] w-[68px] cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B2FF4_100%)] text-white shadow-[0_18px_40px_rgba(107,57,244,0.34)] transition active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingRole ? (
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            ) : (
              <ChevronRightIcon />
            )}
          </button>

          <div className="mt-5">
            <SlideDots activeIndex={currentSlide} label={t('progress')} />
          </div>
        </section>
      </div>
    </main>
  );
}
