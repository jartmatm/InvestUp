'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import InvestAppLogo from '@/components/InvestAppLogo';
import { useInvestApp } from '@/lib/investapp-context';

const ONBOARDING_SLIDES = [
  '/onboarding/onboarding-1.svg',
  '/onboarding/onboarding-2.svg',
  '/onboarding/onboarding-3.svg',
  '/onboarding/onboarding-4.svg',
] as const;

const SWIPE_THRESHOLD = 48;

type OnboardingStage = 'slides' | 'profile';

export default function OnboardingPage() {
  const router = useRouter();
  const { faseApp, guardarRol, rolSeleccionado } = useInvestApp();
  const [rol, setRol] = useState<'inversor' | 'emprendedor' | null>(rolSeleccionado);
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [stage, setStage] = useState<OnboardingStage>('slides');
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'dashboard') router.replace('/home');
  }, [faseApp, router]);

  useEffect(() => {
    setRol(rolSeleccionado);
  }, [rolSeleccionado]);

  if (faseApp !== 'onboarding') {
    return <main className="min-h-screen bg-transparent" />;
  }

  const goToNext = () => {
    setCurrentSlide((previous) => {
      if (previous >= ONBOARDING_SLIDES.length - 1) {
        setStage('profile');
        return previous;
      }

      return previous + 1;
    });
  };

  const goToPrevious = () => {
    setCurrentSlide((previous) => Math.max(0, previous - 1));
  };

  const skipSlides = () => {
    setStage('profile');
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
          <div className="mx-auto mb-6 flex items-center justify-center">
            <div className="scale-[0.48] origin-center">
              <InvestAppLogo />
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6B39F4]/70">
              Welcome
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Choose your profile
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              We will tailor your experience depending on whether you want to invest in ventures or
              grow your own business.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={() => setRol('inversor')}
              className={`rounded-[24px] border px-5 py-5 text-left transition ${
                rol === 'inversor'
                  ? 'border-[#6B39F4]/35 bg-[#6B39F4]/10 text-[#6B39F4] shadow-[0_14px_28px_rgba(107,57,244,0.12)]'
                  : 'border-slate-200/80 bg-white/80 text-slate-700 hover:bg-white'
              }`}
            >
              <p className="text-base font-semibold">Investor</p>
              <p className={`mt-1 text-sm ${rol === 'inversor' ? 'text-[#6B39F4]/80' : 'text-slate-500'}`}>
                Explore businesses and invest with confidence.
              </p>
            </button>

            <button
              onClick={() => setRol('emprendedor')}
              className={`rounded-[24px] border px-5 py-5 text-left transition ${
                rol === 'emprendedor'
                  ? 'border-[#40C4AA]/35 bg-[#40C4AA]/12 text-[#1C9A82] shadow-[0_14px_28px_rgba(64,196,170,0.12)]'
                  : 'border-slate-200/80 bg-white/80 text-slate-700 hover:bg-white'
              }`}
            >
              <p className="text-base font-semibold">Entrepreneur</p>
              <p
                className={`mt-1 text-sm ${rol === 'emprendedor' ? 'text-[#1C9A82]/80' : 'text-slate-500'}`}
              >
                Publish your business and connect with investors.
              </p>
            </button>
          </div>

          <label className="mt-6 flex items-start gap-3 rounded-2xl border border-white/55 bg-white/70 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={acceptsTerms}
              onChange={(event) => setAcceptsTerms(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#6B39F4]"
            />
            <span>
              I accept the{' '}
              <a
                href="https://www.investappgroup.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#6B39F4] underline decoration-[#6B39F4]/40 underline-offset-2"
              >
                terms and conditions
              </a>
              .
            </span>
          </label>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={!rol || !acceptsTerms}
              className="w-full rounded-[18px] bg-[#6B39F4] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(107,57,244,0.22)] transition hover:bg-[#5c2ff0] disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
              onClick={async () => {
                if (!rol) return;
                await guardarRol(rol);
              }}
            >
              Continue
            </button>

            <button
              type="button"
              onClick={() => setStage('slides')}
              className="w-full text-center text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              Back to onboarding
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F8FF] px-3 py-4">
      <div
        className="relative w-full max-w-[410px] touch-pan-y select-none"
        onTouchStart={(event) => handleTouchStart(event.touches[0]?.clientX ?? 0)}
        onTouchMove={(event) => handleTouchMove(event.touches[0]?.clientX ?? 0)}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative mx-auto aspect-[271/588] w-full overflow-hidden rounded-[32px] shadow-[0_20px_60px_rgba(122,90,248,0.16)]">
          <Image
            key={ONBOARDING_SLIDES[currentSlide]}
            src={ONBOARDING_SLIDES[currentSlide]}
            alt={`Onboarding slide ${currentSlide + 1}`}
            fill
            priority
            sizes="(max-width: 480px) 100vw, 410px"
            className="bg-[#F7F8FF] object-contain object-center"
          />

          <button
            type="button"
            aria-label="Skip onboarding"
            onClick={skipSlides}
            className="absolute right-[4.5%] top-[2.2%] h-[8.8%] w-[22%] rounded-full bg-transparent"
          />

          <button
            type="button"
            aria-label={currentSlide === ONBOARDING_SLIDES.length - 1 ? 'Finish onboarding' : 'Next slide'}
            onClick={goToNext}
            className="absolute bottom-[4.1%] left-1/2 h-[9%] w-[76%] -translate-x-1/2 rounded-full bg-transparent"
          />
        </div>
      </div>
    </main>
  );
}
