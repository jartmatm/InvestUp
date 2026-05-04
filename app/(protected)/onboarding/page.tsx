'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInvestApp } from '@/lib/investapp-context';

type OnboardingStage = 'slides' | 'profile';
type FrontRole = 'inversor' | 'emprendedor';
type SlideId = 'opportunities' | 'portfolio' | 'send';

type SlideDefinition = {
  id: SlideId;
  imageSrc: string;
  title: string;
  description: string;
};

const ONBOARDING_SLIDES: SlideDefinition[] = [
  {
    id: 'opportunities',
    imageSrc: '/onboarding/onboarding-opportunities.png',
    title: 'Find real opportunities',
    description:
      'Explore curated ventures, compare interest rates and discover businesses ready to grow.',
  },
  {
    id: 'portfolio',
    imageSrc: '/onboarding/onboarding-portfolio.png',
    title: 'Track every investment',
    description:
      'Follow portfolio value, average rate and activity with clear performance insights.',
  },
  {
    id: 'send',
    imageSrc: '/onboarding/onboarding-send.png',
    title: 'Move funds with confidence',
    description:
      'Send, invest and manage contacts from one secure flow built for everyday use.',
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

function SlideDots({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex items-center justify-center gap-3" aria-label="Onboarding progress">
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

function FloatingPrismOverlays() {
  const prisms = [
    {
      className: 'left-[-9%] top-[4%] h-32 w-44 rotate-[-18deg]',
      style: {
        background:
          'linear-gradient(135deg, rgba(30,54,255,0.78), rgba(35,227,255,0.68) 45%, rgba(255,48,196,0.68) 78%)',
        clipPath: 'polygon(48% 0%, 100% 100%, 0% 82%)',
      },
    },
    {
      className: 'right-[-11%] top-[20%] h-36 w-36 rotate-[22deg] rounded-full',
      style: {
        background:
          'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.82), rgba(41,231,255,0.65) 22%, rgba(23,42,248,0.78) 48%, rgba(255,37,203,0.6) 76%)',
      },
    },
    {
      className: 'left-[-12%] bottom-[17%] h-44 w-52 rotate-[34deg]',
      style: {
        background:
          'linear-gradient(145deg, rgba(23,36,248,0.78), rgba(22,239,255,0.64) 42%, rgba(255,26,195,0.72) 72%, rgba(255,240,115,0.54))',
        clipPath: 'polygon(12% 0%, 100% 45%, 42% 100%)',
      },
    },
    {
      className: 'right-[-18%] bottom-[2%] h-40 w-64 rotate-[-9deg] rounded-[38px]',
      style: {
        background:
          'linear-gradient(115deg, rgba(28,55,255,0.76), rgba(28,216,255,0.62) 42%, rgba(255,42,209,0.66) 70%, rgba(255,245,131,0.5))',
      },
    },
  ];

  return (
    <>
      {prisms.map((prism, index) => (
        <span
          key={index}
          data-floating-prism
          className={cn(
            'absolute opacity-45 blur-[0.2px] mix-blend-multiply shadow-[0_18px_48px_rgba(41,77,255,0.2)] will-change-transform',
            prism.className
          )}
          style={prism.style}
        />
      ))}
    </>
  );
}

function HeartFillIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
      <path
        d="M12 21s-6.7-4.25-9.2-8.57C.54 8.51 2.78 4 7.03 4c2.05 0 3.58 1.07 4.97 2.7C13.39 5.07 14.92 4 16.97 4c4.25 0 6.49 4.51 4.23 8.43C18.7 16.75 12 21 12 21Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SlideAnimationLayer({ slideId }: { slideId: SlideId }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <FloatingPrismOverlays />

      {slideId === 'opportunities' ? (
        <>
          <span
            data-effect="opportunity-card"
            className="absolute left-[16%] top-[42%] h-[16%] w-[31%] rounded-[22px] border border-transparent bg-white/5 opacity-0 shadow-none will-change-transform"
          />
          <span
            data-effect="opportunity-heart"
            className="absolute left-[42.2%] top-[42.5%] flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-[#FF4E9A] opacity-0 shadow-[0_14px_30px_rgba(255,78,154,0.24)] backdrop-blur-sm will-change-transform"
          >
            <HeartFillIcon />
          </span>
        </>
      ) : null}

      {slideId === 'portfolio' ? (
        <>
          <svg
            data-effect="trend-line"
            className="absolute left-[19%] top-[38%] h-[7%] w-[62%] overflow-visible"
            viewBox="0 0 320 82"
            fill="none"
            aria-hidden="true"
          >
            <path
              data-effect="trend-path"
              d="M6 62 C24 34 39 26 58 38 S92 43 111 33 139 45 158 31 188 67 213 48 235 30 256 22 286 43 314 12"
              stroke="rgba(255,255,255,0.9)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
            <circle cx="314" cy="12" r="7" fill="white" opacity="0.95" />
          </svg>
          <span
            data-effect="portfolio-ring"
            className="absolute left-[61.5%] top-[28%] h-[10%] w-[23%] rounded-full border-[9px] border-transparent border-r-[#41D9B8] border-t-[#41D9B8] opacity-85 will-change-transform"
          />
          <span
            data-effect="portfolio-row"
            className="absolute left-[18%] top-[47.3%] h-[5.3%] w-[66%] rounded-[18px] border border-[#6B39F4]/18 bg-[#6B39F4]/10 opacity-0 shadow-[0_12px_34px_rgba(107,57,244,0.18)] will-change-transform"
          />
          <span
            data-effect="portfolio-row"
            className="absolute left-[18%] top-[52.8%] h-[5.3%] w-[66%] rounded-[18px] border border-[#40C4AA]/18 bg-[#40C4AA]/12 opacity-0 shadow-[0_12px_34px_rgba(64,196,170,0.16)] will-change-transform"
          />
          <span
            data-effect="portfolio-row"
            className="absolute left-[18%] top-[58.3%] h-[5.3%] w-[66%] rounded-[18px] border border-[#6B39F4]/18 bg-[#6B39F4]/10 opacity-0 shadow-[0_12px_34px_rgba(107,57,244,0.18)] will-change-transform"
          />
        </>
      ) : null}

      {slideId === 'send' ? (
        <>
          <span
            data-effect="send-breath-card"
            className="absolute left-[15%] top-[28%] h-[17%] w-[70%] rounded-[26px] border border-white/25 bg-white/5 opacity-85 shadow-[0_20px_46px_rgba(31,193,170,0.22)] will-change-transform"
          />
          <span
            data-effect="send-breath-card"
            className="absolute left-[15%] top-[46%] h-[17%] w-[70%] rounded-[26px] border border-white/25 bg-white/5 opacity-85 shadow-[0_20px_46px_rgba(255,160,36,0.22)] will-change-transform"
          />
        </>
      ) : null}
    </div>
  );
}

export default function OnboardingPage() {
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
  const slideScopeRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (stage !== 'slides' || !slideScopeRef.current) return;

    const scope = slideScopeRef.current;
    const ctx = gsap.context(() => {
      gsap.set('[data-slide-visual]', { clearProps: 'transform' });
      gsap.set('[data-effect]', { clearProps: 'all' });

      gsap.to('[data-floating-prism]', {
        x: (index) => [8, -7, 6, -9][index % 4],
        y: (index) => [-18, 14, -14, 16][index % 4],
        rotation: (index) => [7, -8, 6, -5][index % 4],
        duration: (index) => [6.5, 7.2, 7.8, 6.8][index % 4],
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        stagger: 0.18,
      });

      if (activeSlide.id === 'opportunities') {
        gsap.set('[data-effect="opportunity-card"]', { transformOrigin: '50% 50%' });
        gsap.set('[data-effect="opportunity-heart"]', { transformOrigin: '50% 50%' });

        gsap
          .timeline({ repeat: -1, repeatDelay: 1.4, defaults: { ease: 'sine.inOut' } })
          .to('[data-slide-visual]', { y: '-6.5%', duration: 2.15, delay: 0.35 })
          .to('[data-slide-visual]', { y: '0%', duration: 2.15 })
          .to(
            '[data-effect="opportunity-heart"]',
            { opacity: 1, scale: 1.08, duration: 0.48, ease: 'back.out(1.8)' },
            '+=0.05'
          )
          .to(
            '[data-effect="opportunity-card"]',
            {
              opacity: 1,
              scale: 1.045,
              borderColor: 'rgba(255,78,154,0.38)',
              boxShadow: '0 22px 54px rgba(255,78,154,0.2)',
              duration: 1.05,
            },
            '<'
          )
          .to(
            '[data-effect="opportunity-card"]',
            {
              scale: 1,
              boxShadow: '0 0 0 rgba(255,78,154,0)',
              duration: 1.25,
            },
            '+=0.05'
          )
          .to('[data-effect="opportunity-heart"]', { scale: 1, duration: 0.7 }, '<');
      }

      if (activeSlide.id === 'portfolio') {
        const trendPath = scope.querySelector('[data-effect="trend-path"]');

        if (trendPath instanceof SVGPathElement) {
          const pathLength = trendPath.getTotalLength();
          gsap.set(trendPath, {
            strokeDasharray: pathLength,
            strokeDashoffset: pathLength,
          });
          gsap.to(trendPath, {
            strokeDashoffset: 0,
            duration: 2.6,
            ease: 'power1.inOut',
            repeat: -1,
            repeatDelay: 1,
          });
        }

        gsap.to('[data-effect="portfolio-row"]', {
          opacity: 1,
          scale: 1.035,
          duration: 1.65,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          stagger: 0.18,
        });

        gsap.to('[data-effect="portfolio-ring"]', {
          rotation: 360,
          duration: 3.8,
          ease: 'none',
          repeat: -1,
          transformOrigin: '50% 50%',
        });
      }

      if (activeSlide.id === 'send') {
        gsap.to('[data-effect="send-breath-card"]', {
          scale: 1.028,
          opacity: 1,
          duration: 1.9,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          stagger: 0.32,
          transformOrigin: '50% 50%',
        });
      }
    }, scope);

    return () => ctx.revert();
  }, [activeSlide.id, stage]);

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
          : 'We could not finish updating your role.'
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
              Welcome
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Choose your profile</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              We will tailor your experience depending on whether you want to invest in ventures or
              grow your own business.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RoleButton
              active={rol === 'inversor'}
              title="Investor"
              description="Explore businesses and invest with confidence."
              tone="purple"
              onClick={() => setRol('inversor')}
            />
            <RoleButton
              active={rol === 'emprendedor'}
              title="Entrepreneur"
              description="Publish your business and connect with investors."
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
                    : 'We could not finish updating your role.'
                );
              } finally {
                setSavingRole(false);
              }
            }}
          >
            {savingRole ? 'Saving...' : 'Continue'}
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
            ref={slideScopeRef}
            key={activeSlide.id}
            custom={direction}
            initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? '-100%' : '100%', opacity: 0.9 }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <div data-slide-visual className="absolute inset-0 will-change-transform">
              <Image
                src={activeSlide.imageSrc}
                alt={activeSlide.title}
                fill
                priority={currentSlide === 0}
                sizes="100vw"
                className="object-cover object-top"
              />
            </div>
            <SlideAnimationLayer slideId={activeSlide.id} />
          </motion.div>
        </AnimatePresence>

        <section className="absolute inset-x-0 bottom-0 z-20 flex h-[25dvh] min-h-[220px] flex-col items-center rounded-t-[34px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(247,241,255,0.62)_42%,rgba(232,245,255,0.58))] px-7 pb-[max(env(safe-area-inset-bottom),1rem)] pt-5 text-center shadow-[0_-24px_70px_rgba(77,63,137,0.14)] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[21rem] flex-1 flex-col items-center justify-center">
            <h1 className="text-[1.45rem] font-semibold leading-tight text-black">{activeSlide.title}</h1>
            <p className="mt-3 text-[0.98rem] font-medium leading-6 text-black/78">
              {activeSlide.description}
            </p>
          </div>

          {status ? <p className="mb-3 text-xs font-medium text-rose-600">{status}</p> : null}

          <button
            type="button"
            aria-label={
              currentSlide === ONBOARDING_SLIDES.length - 1 ? 'Finish onboarding' : 'Next slide'
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
            <SlideDots activeIndex={currentSlide} />
          </div>
        </section>
      </div>
    </main>
  );
}
