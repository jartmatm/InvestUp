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
  { id: 1, size: 6, leftOffset: '-148px', riseX: '-108px', riseY: '-46px', color: '#40C4AA', glow: '#40C4AA', delay: '0s', duration: '2.7s' },
  { id: 2, size: 5, leftOffset: '-132px', riseX: '-164px', riseY: '-8px', color: '#48C0FF', glow: '#48C0FF', delay: '0.08s', duration: '2.95s' },
  { id: 3, size: 4, leftOffset: '-118px', riseX: '-142px', riseY: '34px', color: '#FFD45C', glow: '#FFD45C', delay: '0.16s', duration: '2.85s' },
  { id: 4, size: 7, leftOffset: '-102px', riseX: '-92px', riseY: '76px', color: '#FF6BCB', glow: '#FF6BCB', delay: '0.22s', duration: '3.1s' },
  { id: 5, size: 5, leftOffset: '-86px', riseX: '-132px', riseY: '108px', color: '#7C5CFF', glow: '#7C5CFF', delay: '0.12s', duration: '3s' },
  { id: 6, size: 4, leftOffset: '-72px', riseX: '-52px', riseY: '128px', color: '#B7FF63', glow: '#B7FF63', delay: '0.3s', duration: '2.92s' },
  { id: 7, size: 6, leftOffset: '-56px', riseX: '-78px', riseY: '54px', color: '#FF9F4A', glow: '#FF9F4A', delay: '0.18s', duration: '2.8s' },
  { id: 8, size: 5, leftOffset: '-42px', riseX: '-28px', riseY: '98px', color: '#40C4AA', glow: '#40C4AA', delay: '0.34s', duration: '3.08s' },
  { id: 9, size: 4, leftOffset: '-28px', riseX: '-64px', riseY: '146px', color: '#FFFFFF', glow: '#FFFFFF', delay: '0.26s', duration: '3.16s' },
  { id: 10, size: 6, leftOffset: '-12px', riseX: '-16px', riseY: '118px', color: '#48C0FF', glow: '#48C0FF', delay: '0.06s', duration: '2.88s' },
  { id: 11, size: 5, leftOffset: '2px', riseX: '10px', riseY: '134px', color: '#FFD45C', glow: '#FFD45C', delay: '0.28s', duration: '3.14s' },
  { id: 12, size: 7, leftOffset: '18px', riseX: '28px', riseY: '92px', color: '#FF6BCB', glow: '#FF6BCB', delay: '0.1s', duration: '2.82s' },
  { id: 13, size: 5, leftOffset: '34px', riseX: '62px', riseY: '138px', color: '#7C5CFF', glow: '#7C5CFF', delay: '0.36s', duration: '3.12s' },
  { id: 14, size: 4, leftOffset: '50px', riseX: '36px', riseY: '58px', color: '#B7FF63', glow: '#B7FF63', delay: '0.2s', duration: '2.76s' },
  { id: 15, size: 6, leftOffset: '66px', riseX: '92px', riseY: '104px', color: '#FF9F4A', glow: '#FF9F4A', delay: '0.14s', duration: '2.98s' },
  { id: 16, size: 5, leftOffset: '82px', riseX: '146px', riseY: '56px', color: '#40C4AA', glow: '#40C4AA', delay: '0.4s', duration: '3.06s' },
  { id: 17, size: 4, leftOffset: '98px', riseX: '126px', riseY: '18px', color: '#48C0FF', glow: '#48C0FF', delay: '0.24s', duration: '2.9s' },
  { id: 18, size: 6, leftOffset: '114px', riseX: '168px', riseY: '-22px', color: '#FFD45C', glow: '#FFD45C', delay: '0.32s', duration: '3.18s' },
  { id: 19, size: 5, leftOffset: '130px', riseX: '110px', riseY: '-52px', color: '#FF6BCB', glow: '#FF6BCB', delay: '0.44s', duration: '3.02s' },
  { id: 20, size: 4, leftOffset: '146px', riseX: '194px', riseY: '40px', color: '#FFFFFF', glow: '#FFFFFF', delay: '0.5s', duration: '3.22s' },
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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,33,0.1)_0%,rgba(18,29,66,0.1)_46%,rgba(34,23,92,0.1)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(72,192,255,0.08),transparent_28%),radial-gradient(circle_at_24%_75%,rgba(64,196,170,0.08),transparent_24%),radial-gradient(circle_at_78%_24%,rgba(124,92,255,0.08),transparent_26%),radial-gradient(circle_at_bottom,rgba(255,107,203,0.08),transparent_22%)]" />
      <div className="absolute inset-0 bg-white/90" />
      <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-[#40C4AA]/6 blur-3xl" />
      <div className="absolute right-[-4rem] top-20 h-80 w-80 rounded-full bg-[#6B39F4]/8 blur-3xl" />
      <div className="absolute bottom-[-7rem] left-1/2 h-72 w-[28rem] -translate-x-1/2 rounded-full bg-[#FF6BCB]/6 blur-3xl" />

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
                    boxShadow: `0 0 10px ${particle.glow}`,
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
          opacity: 1;
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
            transform: translate(-50%, 0) scale(0.45);
          }
          14% {
            opacity: 1;
          }
          54% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translate(calc(-50% + var(--particle-x)), var(--particle-y)) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
