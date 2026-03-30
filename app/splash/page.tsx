'use client';

import Image from 'next/image';
import { useEffect, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

type SplashParticle = {
  id: number;
  size: number;
  leftOffset: string;
  riseX: string;
  riseY: string;
  color: string;
  glow: string;
  delay: string;
  duration: string;
};

const splashParticles: SplashParticle[] = [
  { id: 1, size: 10, leftOffset: '-120px', riseX: '-88px', riseY: '-54px', color: '#40C4AA', glow: 'rgba(64,196,170,0.7)', delay: '0s', duration: '2.8s' },
  { id: 2, size: 12, leftOffset: '-84px', riseX: '-142px', riseY: '10px', color: '#7C5CFF', glow: 'rgba(124,92,255,0.75)', delay: '0.18s', duration: '3.1s' },
  { id: 3, size: 8, leftOffset: '-48px', riseX: '-62px', riseY: '72px', color: '#FFBE4C', glow: 'rgba(255,190,76,0.78)', delay: '0.12s', duration: '2.9s' },
  { id: 4, size: 9, leftOffset: '-14px', riseX: '-18px', riseY: '112px', color: '#FF6BCB', glow: 'rgba(255,107,203,0.7)', delay: '0.28s', duration: '3.2s' },
  { id: 5, size: 14, leftOffset: '14px', riseX: '22px', riseY: '126px', color: '#48C0FF', glow: 'rgba(72,192,255,0.74)', delay: '0.1s', duration: '3s' },
  { id: 6, size: 8, leftOffset: '44px', riseX: '68px', riseY: '58px', color: '#B7FF63', glow: 'rgba(183,255,99,0.78)', delay: '0.24s', duration: '2.8s' },
  { id: 7, size: 10, leftOffset: '82px', riseX: '146px', riseY: '8px', color: '#FFD45C', glow: 'rgba(255,212,92,0.75)', delay: '0.34s', duration: '3.15s' },
  { id: 8, size: 12, leftOffset: '120px', riseX: '102px', riseY: '-48px', color: '#40C4AA', glow: 'rgba(64,196,170,0.72)', delay: '0.42s', duration: '2.95s' },
  { id: 9, size: 7, leftOffset: '-146px', riseX: '-188px', riseY: '42px', color: '#48C0FF', glow: 'rgba(72,192,255,0.72)', delay: '0.48s', duration: '3.18s' },
  { id: 10, size: 9, leftOffset: '154px', riseX: '198px', riseY: '46px', color: '#FF6BCB', glow: 'rgba(255,107,203,0.72)', delay: '0.52s', duration: '3.22s' },
  { id: 11, size: 6, leftOffset: '-24px', riseX: '-96px', riseY: '144px', color: '#FFFFFF', glow: 'rgba(255,255,255,0.85)', delay: '0.16s', duration: '3.12s' },
  { id: 12, size: 6, leftOffset: '28px', riseX: '104px', riseY: '144px', color: '#FFFFFF', glow: 'rgba(255,255,255,0.85)', delay: '0.38s', duration: '3.08s' },
];

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 3800);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,33,0.6)_0%,rgba(18,29,66,0.6)_46%,rgba(34,23,92,0.6)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(72,192,255,0.14),transparent_28%),radial-gradient(circle_at_24%_75%,rgba(64,196,170,0.16),transparent_24%),radial-gradient(circle_at_78%_24%,rgba(124,92,255,0.18),transparent_26%),radial-gradient(circle_at_bottom,rgba(255,107,203,0.16),transparent_22%)]" />
      <div className="absolute inset-0 bg-white/10" />
      <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-[#40C4AA]/12 blur-3xl" />
      <div className="absolute right-[-4rem] top-20 h-80 w-80 rounded-full bg-[#6B39F4]/16 blur-3xl" />
      <div className="absolute bottom-[-7rem] left-1/2 h-72 w-[28rem] -translate-x-1/2 rounded-full bg-[#FF6BCB]/12 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex w-full max-w-[28rem] items-center justify-center">
          <div className="absolute bottom-[-2.2rem] left-1/2 h-24 w-[18rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,190,76,0.94)_0%,rgba(255,107,203,0.38)_44%,transparent_72%)] blur-2xl opacity-90" />
          <div className="absolute bottom-[-3.3rem] left-1/2 h-44 w-[22rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(107,57,244,0.48)_0%,rgba(0,82,255,0.24)_38%,transparent_74%)] blur-3xl" />

          <div className="absolute inset-x-0 bottom-[2.2rem] z-0 h-56">
            {splashParticles.map((particle) => (
              <span
                key={particle.id}
                className="splash-particle"
                style={
                  {
                    width: `${particle.size}px`,
                    height: `${particle.size}px`,
                    left: `calc(50% + ${particle.leftOffset})`,
                    bottom: '0',
                    background: particle.color,
                    boxShadow: `0 0 18px ${particle.glow}`,
                    animationDelay: particle.delay,
                    animationDuration: particle.duration,
                    ['--particle-x' as string]: particle.riseX,
                    ['--particle-y' as string]: particle.riseY,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <Image
            src="/investapp-splash-logo.png"
            alt="InvestApp"
            width={512}
            height={512}
            priority
            className="splash-logo relative z-10 w-[min(80vw,24rem)] select-none"
          />
        </div>
      </div>

      <style jsx>{`
        .splash-logo {
          filter: drop-shadow(0 26px 70px rgba(7, 12, 24, 0.5));
          animation: splash-logo-float 3.3s ease-in-out infinite;
        }

        .splash-particle {
          position: absolute;
          border-radius: 999px;
          opacity: 0;
          will-change: transform, opacity;
          animation-name: splash-particle-burst;
          animation-timing-function: ease-out;
          animation-iteration-count: infinite;
        }

        @keyframes splash-logo-float {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.01);
          }
        }

        @keyframes splash-particle-burst {
          0% {
            opacity: 0;
            transform: translate(-50%, 0) scale(0.35);
          }
          14% {
            opacity: 1;
          }
          54% {
            opacity: 0.95;
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--particle-x)), var(--particle-y)) scale(1.15);
          }
        }
      `}</style>
    </div>
  );
}
