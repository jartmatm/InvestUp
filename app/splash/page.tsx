'use client';

import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

function SplashLogo() {
  return (
    <div className="flex items-baseline justify-center font-extrabold leading-none text-[#121827]">
      <span>Invest</span>
      <span className="text-[#6B39F4]">App</span>
      <span className="ml-3 inline-block h-7 w-7 rounded-full bg-[#6B39F4] sm:h-9 sm:w-9" />
    </div>
  );
}

export default function SplashScreen() {
  const router = useRouter();
  const logoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 3000);

    const logo = logoRef.current;
    if (!logo) return () => clearTimeout(timer);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        logo,
        { opacity: 0, scale: 0.96, y: 12 },
        { opacity: 1, scale: 1, y: 0, duration: 0.85, ease: 'power2.out' }
      );
      gsap.to(logo, {
        scale: 1.025,
        y: -5,
        duration: 2.2,
        delay: 0.75,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    }, logo);

    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, [router]);

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#F4F1FF] px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_24%,rgba(255,255,255,0.92),transparent_36%),radial-gradient(circle_at_80%_18%,rgba(107,57,244,0.12),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(64,196,170,0.1),transparent_34%)]" />
      <div className="absolute inset-x-0 top-1/2 mx-auto h-44 max-w-[42rem] -translate-y-1/2 rounded-full bg-white/40 blur-3xl" />

      <section
        ref={logoRef}
        aria-label="InvestApp"
        className="relative z-10 select-none text-[3.5rem] sm:text-[5.25rem] md:text-[6.5rem]"
      >
        <SplashLogo />
      </section>
    </main>
  );
}
