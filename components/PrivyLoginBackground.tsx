'use client';

import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  alpha: number;
  tint: string;
};

const PARTICLE_TINTS = ['108, 77, 255', '77, 141, 255', '159, 92, 255', '0, 209, 160'];

export default function PrivyLoginBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!root || !canvas || !context) {
      return;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointerQuery = window.matchMedia('(pointer: fine)');

    let reducedMotion = reducedMotionQuery.matches;
    let isRunning = true;
    let frameId = 0;
    let width = 0;
    let height = 0;
    let devicePixelRatio = 1;
    let particles: Particle[] = [];
    let parallaxX = 0;
    let parallaxY = 0;
    let targetParallaxX = 0;
    let targetParallaxY = 0;

    const createParticles = () => {
      const particleCount = width < 480 ? 18 : 28;

      particles = Array.from({ length: particleCount }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.8 + Math.random() * 1.8,
        velocityX: (Math.random() - 0.5) * 0.12,
        velocityY: (Math.random() - 0.5) * 0.12,
        alpha: 0.08 + Math.random() * 0.12,
        tint: PARTICLE_TINTS[index % PARTICLE_TINTS.length] ?? PARTICLE_TINTS[0],
      }));
    };

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(height * devicePixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      createParticles();
    };

    const drawParticles = (animate: boolean) => {
      context.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        if (animate) {
          particle.x += particle.velocityX;
          particle.y += particle.velocityY;

          if (particle.x < -24) particle.x = width + 24;
          if (particle.x > width + 24) particle.x = -24;
          if (particle.y < -24) particle.y = height + 24;
          if (particle.y > height + 24) particle.y = -24;
        }

        const glow = context.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.radius * 5.4
        );

        glow.addColorStop(0, `rgba(${particle.tint}, ${particle.alpha})`);
        glow.addColorStop(1, `rgba(${particle.tint}, 0)`);

        context.fillStyle = glow;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius * 5.4, 0, Math.PI * 2);
        context.fill();
      });
    };

    const updateParallax = () => {
      if (!finePointerQuery.matches || reducedMotion) {
        parallaxX = 0;
        parallaxY = 0;
      } else {
        parallaxX += (targetParallaxX - parallaxX) * 0.06;
        parallaxY += (targetParallaxY - parallaxY) * 0.06;
      }

      root.style.setProperty('--privy-parallax-x', `${parallaxX.toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-y', `${parallaxY.toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-inverse-x', `${(-parallaxX).toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-inverse-y', `${(-parallaxY).toFixed(2)}px`);
    };

    const renderFrame = () => {
      if (!isRunning) {
        return;
      }

      updateParallax();
      drawParticles(true);
      frameId = window.requestAnimationFrame(renderFrame);
    };

    const syncMotionPreference = () => {
      reducedMotion = reducedMotionQuery.matches;
      window.cancelAnimationFrame(frameId);

      if (reducedMotion) {
        targetParallaxX = 0;
        targetParallaxY = 0;
        updateParallax();
        drawParticles(false);
        return;
      }

      frameId = window.requestAnimationFrame(renderFrame);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!finePointerQuery.matches || reducedMotion || width === 0 || height === 0) {
        return;
      }

      const normalizedX = event.clientX / width - 0.5;
      const normalizedY = event.clientY / height - 0.5;

      targetParallaxX = normalizedX * 16;
      targetParallaxY = normalizedY * 14;
    };

    const handlePointerLeave = () => {
      targetParallaxX = 0;
      targetParallaxY = 0;
    };

    resizeCanvas();
    syncMotionPreference();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    reducedMotionQuery.addEventListener('change', syncMotionPreference);

    return () => {
      isRunning = false;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      reducedMotionQuery.removeEventListener('change', syncMotionPreference);
    };
  }, []);

  return (
    <div ref={rootRef} className="privy-login-background fixed inset-0 overflow-hidden bg-[#0A0B1A]">
      <div className="privy-login-background__mesh" />
      <div className="privy-login-background__focus" />
      <div className="privy-login-background__orb privy-login-background__orb--violet" />
      <div className="privy-login-background__orb privy-login-background__orb--blue" />
      <div className="privy-login-background__orb privy-login-background__orb--neon" />
      <div className="privy-login-background__orb privy-login-background__orb--green" />
      <canvas ref={canvasRef} className="privy-login-background__particles" aria-hidden="true" />
      <div className="privy-login-background__grain" />
      <div className="privy-login-background__vignette" />

      <style jsx>{`
        .privy-login-background {
          pointer-events: none;
          isolation: isolate;
          --privy-parallax-x: 0px;
          --privy-parallax-y: 0px;
          --privy-parallax-inverse-x: 0px;
          --privy-parallax-inverse-y: 0px;
        }

        .privy-login-background__mesh,
        .privy-login-background__focus,
        .privy-login-background__orb,
        .privy-login-background__particles,
        .privy-login-background__grain,
        .privy-login-background__vignette {
          position: absolute;
          inset: 0;
        }

        .privy-login-background__mesh {
          inset: -14%;
          background:
            radial-gradient(circle at 18% 16%, rgba(108, 77, 255, 0.34) 0%, transparent 32%),
            radial-gradient(circle at 82% 20%, rgba(77, 141, 255, 0.28) 0%, transparent 34%),
            radial-gradient(circle at 50% 78%, rgba(159, 92, 255, 0.16) 0%, transparent 34%),
            linear-gradient(135deg, #080912 0%, #0a0b1a 46%, #10162a 100%);
          background-size: 140% 140%;
          transform: translate3d(var(--privy-parallax-x), var(--privy-parallax-y), 0) scale(1.08);
          animation: privyMeshShift 18s ease-in-out infinite alternate;
          will-change: transform, background-position;
        }

        .privy-login-background__focus {
          inset: 18% 10% 20%;
          background: radial-gradient(
            circle at center,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(77, 141, 255, 0.08) 18%,
            rgba(108, 77, 255, 0.12) 36%,
            rgba(10, 11, 26, 0) 72%
          );
          filter: blur(18px);
          transform: translate3d(var(--privy-parallax-inverse-x), var(--privy-parallax-inverse-y), 0);
          will-change: transform;
        }

        .privy-login-background__orb {
          filter: blur(76px);
          opacity: 0.58;
          will-change: transform, opacity;
        }

        .privy-login-background__orb--violet {
          inset: auto auto 8% -8%;
          width: 16rem;
          height: 16rem;
          background: radial-gradient(circle, rgba(108, 77, 255, 0.32) 0%, transparent 68%);
          animation: privyOrbFloatA 16s ease-in-out infinite;
        }

        .privy-login-background__orb--blue {
          inset: 8% -8% auto auto;
          width: 18rem;
          height: 18rem;
          background: radial-gradient(circle, rgba(77, 141, 255, 0.26) 0%, transparent 70%);
          animation: privyOrbFloatB 20s ease-in-out infinite;
        }

        .privy-login-background__orb--neon {
          inset: 24% auto auto 32%;
          width: 13rem;
          height: 13rem;
          background: radial-gradient(circle, rgba(159, 92, 255, 0.22) 0%, transparent 72%);
          animation: privyOrbFloatC 14s ease-in-out infinite;
        }

        .privy-login-background__orb--green {
          inset: auto 14% 18% auto;
          width: 10rem;
          height: 10rem;
          background: radial-gradient(circle, rgba(0, 209, 160, 0.12) 0%, transparent 74%);
          animation: privyOrbFloatD 18s ease-in-out infinite;
        }

        .privy-login-background__particles {
          opacity: 0.46;
          mix-blend-mode: screen;
        }

        .privy-login-background__grain {
          background-image: radial-gradient(rgba(255, 255, 255, 0.16) 0.55px, transparent 0.75px);
          background-size: 8px 8px;
          opacity: 0.04;
          mix-blend-mode: soft-light;
        }

        .privy-login-background__vignette {
          background:
            radial-gradient(circle at center, rgba(10, 11, 26, 0) 24%, rgba(10, 11, 26, 0.22) 68%, rgba(10, 11, 26, 0.84) 100%),
            linear-gradient(180deg, rgba(10, 11, 26, 0.18) 0%, rgba(10, 11, 26, 0.42) 100%);
        }

        @keyframes privyMeshShift {
          0% {
            background-position: 0% 0%, 100% 0%, 50% 100%, 50% 50%;
          }
          100% {
            background-position: 18% 10%, 84% 12%, 48% 86%, 52% 50%;
          }
        }

        @keyframes privyOrbFloatA {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(34px, -22px, 0) scale(1.08);
          }
        }

        @keyframes privyOrbFloatB {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-30px, 26px, 0) scale(1.06);
          }
        }

        @keyframes privyOrbFloatC {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(18px, 24px, 0) scale(1.04);
          }
        }

        @keyframes privyOrbFloatD {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-16px, -18px, 0) scale(1.05);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .privy-login-background__mesh,
          .privy-login-background__orb {
            animation: none !important;
          }

          .privy-login-background__mesh,
          .privy-login-background__focus {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
