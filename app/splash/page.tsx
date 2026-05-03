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
  { id: 1, size: 6, leftOffset: '-156px', riseX: '-118px', riseY: '-42px', color: '#40C4AA', glow: 'rgba(64,196,170,0.9)', delay: '0s', duration: '2.7s' },
  { id: 2, size: 7, leftOffset: '-132px', riseX: '-168px', riseY: '2px', color: '#7C5CFF', glow: 'rgba(124,92,255,0.92)', delay: '0.08s', duration: '3s' },
  { id: 3, size: 5, leftOffset: '-108px', riseX: '-90px', riseY: '54px', color: '#FFBE4C', glow: 'rgba(255,190,76,0.94)', delay: '0.12s', duration: '2.9s' },
  { id: 4, size: 6, leftOffset: '-86px', riseX: '-54px', riseY: '92px', color: '#FF6BCB', glow: 'rgba(255,107,203,0.9)', delay: '0.16s', duration: '3.1s' },
  { id: 5, size: 7, leftOffset: '-62px', riseX: '-18px', riseY: '126px', color: '#48C0FF', glow: 'rgba(72,192,255,0.9)', delay: '0.2s', duration: '3s' },
  { id: 6, size: 5, leftOffset: '-38px', riseX: '-84px', riseY: '142px', color: '#B7FF63', glow: 'rgba(183,255,99,0.94)', delay: '0.24s', duration: '2.85s' },
  { id: 7, size: 6, leftOffset: '-16px', riseX: '-8px', riseY: '158px', color: '#FFD45C', glow: 'rgba(255,212,92,0.9)', delay: '0.28s', duration: '3.05s' },
  { id: 8, size: 8, leftOffset: '8px', riseX: '26px', riseY: '152px', color: '#40C4AA', glow: 'rgba(64,196,170,0.92)', delay: '0.11s', duration: '2.95s' },
  { id: 9, size: 5, leftOffset: '28px', riseX: '72px', riseY: '136px', color: '#48C0FF', glow: 'rgba(72,192,255,0.9)', delay: '0.32s', duration: '2.92s' },
  { id: 10, size: 6, leftOffset: '52px', riseX: '32px', riseY: '88px', color: '#FF6BCB', glow: 'rgba(255,107,203,0.92)', delay: '0.36s', duration: '3.2s' },
  { id: 11, size: 5, leftOffset: '74px', riseX: '104px', riseY: '48px', color: '#FFBE4C', glow: 'rgba(255,190,76,0.92)', delay: '0.4s', duration: '2.8s' },
  { id: 12, size: 7, leftOffset: '98px', riseX: '144px', riseY: '12px', color: '#7C5CFF', glow: 'rgba(124,92,255,0.92)', delay: '0.44s', duration: '3.1s' },
  { id: 13, size: 6, leftOffset: '122px', riseX: '116px', riseY: '-34px', color: '#40C4AA', glow: 'rgba(64,196,170,0.9)', delay: '0.48s', duration: '2.88s' },
  { id: 14, size: 5, leftOffset: '146px', riseX: '188px', riseY: '34px', color: '#48C0FF', glow: 'rgba(72,192,255,0.9)', delay: '0.52s', duration: '3.18s' },
  { id: 15, size: 4, leftOffset: '-142px', riseX: '-206px', riseY: '68px', color: '#FFD45C', glow: 'rgba(255,212,92,0.9)', delay: '0.14s', duration: '3.06s' },
  { id: 16, size: 4, leftOffset: '-72px', riseX: '-126px', riseY: '172px', color: '#7C5CFF', glow: 'rgba(124,92,255,0.9)', delay: '0.18s', duration: '2.96s' },
  { id: 17, size: 4, leftOffset: '70px', riseX: '126px', riseY: '170px', color: '#FF6BCB', glow: 'rgba(255,107,203,0.92)', delay: '0.26s', duration: '2.86s' },
  { id: 18, size: 4, leftOffset: '138px', riseX: '212px', riseY: '58px', color: '#B7FF63', glow: 'rgba(183,255,99,0.9)', delay: '0.34s', duration: '3.12s' },
];

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,33,0.08)_0%,rgba(18,29,66,0.08)_46%,rgba(34,23,92,0.08)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(72,192,255,0.08),transparent_30%),radial-gradient(circle_at_24%_75%,rgba(64,196,170,0.09),transparent_24%),radial-gradient(circle_at_78%_24%,rgba(124,92,255,0.1),transparent_26%),radial-gradient(circle_at_bottom,rgba(255,107,203,0.08),transparent_24%)]" />
      <div className="absolute inset-0 bg-white/60" />
      <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-[#40C4AA]/10 blur-3xl" />
      <div className="absolute right-[-4rem] top-20 h-80 w-80 rounded-full bg-[#6B39F4]/10 blur-3xl" />
      <div className="absolute bottom-[-7rem] left-1/2 h-72 w-[28rem] -translate-x-1/2 rounded-full bg-[#FF6BCB]/10 blur-3xl" />

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
            opacity: 1;
            transform: translate(-50%, 0) scale(0.35);
          }
          100% {
            opacity: 1;
            transform: translate(calc(-50% + var(--particle-x)), var(--particle-y)) scale(1.15);
          }
        }
      `}</style>
    </div>
  );
}
