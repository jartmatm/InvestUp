'use client';

import { useEffect, useRef } from 'react';
import { useAppTheme } from '@/lib/app-theme';

type Particle = {
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  alpha: number;
  tint: string;
  pulse: number;
  pulseSpeed: number;
};

const PARTICLE_TINTS = ['108, 77, 255', '77, 141, 255', '159, 92, 255', '0, 209, 160'];

export default function PrivyLoginBackground() {
  const { mode } = useAppTheme();
  const darkMode = mode === 'dark';
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
      const particleCount = width < 480 ? 34 : 48;

      particles = Array.from({ length: particleCount }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.55 + Math.random() * 1.45,
        velocityX: (Math.random() - 0.5) * 0.1,
        velocityY: (Math.random() - 0.5) * 0.1,
        alpha: 0.06 + Math.random() * 0.16,
        tint: PARTICLE_TINTS[index % PARTICLE_TINTS.length] ?? PARTICLE_TINTS[0],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.008 + Math.random() * 0.012,
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

      if (reducedMotion) {
        drawParticles(false);
      }
    };

    const drawParticles = (animate: boolean) => {
      context.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        if (animate) {
          particle.x += particle.velocityX;
          particle.y += particle.velocityY;
          particle.pulse += particle.pulseSpeed;

          if (particle.x < -24) particle.x = width + 24;
          if (particle.x > width + 24) particle.x = -24;
          if (particle.y < -24) particle.y = height + 24;
          if (particle.y > height + 24) particle.y = -24;
        }

        const alpha = particle.alpha * (0.72 + Math.sin(particle.pulse) * 0.28);
        const glow = context.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.radius * 6.2
        );

        glow.addColorStop(0, `rgba(${particle.tint}, ${alpha})`);
        glow.addColorStop(1, `rgba(${particle.tint}, 0)`);

        context.fillStyle = glow;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius * 6.2, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = darkMode
          ? `rgba(255, 255, 255, ${Math.min(alpha + 0.08, 0.28)})`
          : `rgba(${particle.tint}, ${Math.min(alpha + 0.06, 0.24)})`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius * 0.52, 0, Math.PI * 2);
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
      root.style.setProperty('--privy-parallax-soft-x', `${(parallaxX * 0.35).toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-soft-y', `${(parallaxY * 0.35).toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-field-x', `${(parallaxX * 0.55).toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-field-y', `${(parallaxY * 0.55).toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-bottom-x', `${(parallaxX * 0.3).toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-inverse-soft-x', `${(-parallaxX * 0.35).toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-inverse-soft-y', `${(-parallaxY * 0.35).toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-inverse-field-x', `${(-parallaxX * 0.45).toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-inverse-field-y', `${(-parallaxY * 0.45).toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-planet-left-x', `${(-parallaxX * 1.4).toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-planet-left-y', `${(-parallaxY * 1.4).toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-planet-right-x', `${(parallaxX * 1.1).toFixed(2)}px`);
      root.style.setProperty('--privy-parallax-planet-right-y', `${(parallaxY * 1.1).toFixed(2)}px`);
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
  }, [darkMode]);

  return (
    <div
      ref={rootRef}
      className={`privy-login-background fixed inset-0 overflow-hidden ${
        darkMode ? 'privy-login-background--dark' : 'privy-login-background--light'
      }`}
    >
      <div className="privy-login-background__mesh" />
      <div className="privy-login-background__stellar-wash" />
      <div className="privy-login-background__planet privy-login-background__planet--main" />
      <div className="privy-login-background__planet privy-login-background__planet--small-left" />
      <div className="privy-login-background__planet privy-login-background__planet--small-right" />
      <div className="privy-login-background__wave privy-login-background__wave--left" />
      <div className="privy-login-background__wave privy-login-background__wave--right" />
      <div className="privy-login-background__wave privy-login-background__wave--bottom" />
      <div className="privy-login-background__focus" />
      <div className="privy-login-background__horizon" />
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
          background: var(--privy-root-bg);
          --privy-parallax-x: 0px;
          --privy-parallax-y: 0px;
          --privy-parallax-inverse-x: 0px;
          --privy-parallax-inverse-y: 0px;
          --privy-parallax-soft-x: 0px;
          --privy-parallax-soft-y: 0px;
          --privy-parallax-field-x: 0px;
          --privy-parallax-field-y: 0px;
          --privy-parallax-bottom-x: 0px;
          --privy-parallax-inverse-soft-x: 0px;
          --privy-parallax-inverse-soft-y: 0px;
          --privy-parallax-inverse-field-x: 0px;
          --privy-parallax-inverse-field-y: 0px;
          --privy-parallax-planet-left-x: 0px;
          --privy-parallax-planet-left-y: 0px;
          --privy-parallax-planet-right-x: 0px;
          --privy-parallax-planet-right-y: 0px;
          --privy-root-bg: #f3f0fb;
          --privy-mesh-bg:
            radial-gradient(circle at 15% 12%, rgba(108, 77, 255, 0.2) 0%, transparent 30%),
            radial-gradient(circle at 86% 17%, rgba(77, 141, 255, 0.18) 0%, transparent 31%),
            radial-gradient(circle at 48% 76%, rgba(159, 92, 255, 0.12) 0%, transparent 36%),
            radial-gradient(circle at 78% 68%, rgba(0, 209, 160, 0.06) 0%, transparent 28%),
            linear-gradient(135deg, #fbf9ff 0%, #f3f0fb 44%, #edf5ff 100%);
          --privy-stellar-bg:
            radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.5), transparent 36%),
            radial-gradient(circle at 52% 54%, rgba(108, 77, 255, 0.13), transparent 38%),
            radial-gradient(circle at 40% 64%, rgba(77, 141, 255, 0.1), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(243, 240, 251, 0.2));
          --privy-stellar-opacity: 0.9;
          --privy-planet-main-bg:
            radial-gradient(circle at 50% 68%, rgba(255, 255, 255, 0.92) 0%, rgba(230, 235, 255, 0.8) 43%, rgba(220, 210, 255, 0.58) 62%, rgba(255, 255, 255, 0) 78%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(108, 77, 255, 0.07));
          --privy-planet-main-shadow:
            0 -1px 0 rgba(108, 77, 255, 0.28),
            0 -18px 48px rgba(108, 77, 255, 0.22),
            0 -3px 14px rgba(159, 92, 255, 0.24),
            inset 0 68px 120px rgba(255, 255, 255, 0.48),
            inset 0 -150px 210px rgba(202, 214, 255, 0.28);
          --privy-planet-main-opacity: 0.78;
          --privy-planet-small-bg:
            radial-gradient(circle at 68% 22%, rgba(255, 255, 255, 0.96), rgba(159, 92, 255, 0.3) 30%, rgba(106, 129, 255, 0.18) 62%, rgba(255, 255, 255, 0) 75%),
            radial-gradient(circle, rgba(108, 77, 255, 0.22), transparent 72%);
          --privy-planet-small-shadow:
            -18px -18px 36px rgba(108, 77, 255, 0.16),
            14px 18px 34px rgba(100, 116, 139, 0.12),
            0 0 24px rgba(159, 92, 255, 0.18);
          --privy-planet-a-opacity-high: 0.72;
          --privy-planet-a-opacity-low: 0.5;
          --privy-planet-b-opacity-high: 0.5;
          --privy-planet-b-opacity-low: 0.34;
          --privy-wave-opacity: 0.36;
          --privy-wave-blend: multiply;
          --privy-wave-bg:
            repeating-radial-gradient(
              ellipse at 50% 100%,
              transparent 0 16px,
              rgba(108, 77, 255, 0.13) 17px 18px,
              transparent 19px 28px
            ),
            linear-gradient(90deg, rgba(77, 141, 255, 0.11), rgba(159, 92, 255, 0.1), transparent 62%);
          --privy-wave-filter: drop-shadow(0 0 7px rgba(108, 77, 255, 0.18));
          --privy-focus-bg: radial-gradient(
            circle at center,
            rgba(255, 255, 255, 0.64) 0%,
            rgba(77, 141, 255, 0.16) 18%,
            rgba(108, 77, 255, 0.16) 36%,
            rgba(243, 240, 251, 0) 72%
          );
          --privy-horizon-bg:
            radial-gradient(ellipse at center, rgba(255, 255, 255, 0.76) 0%, rgba(77, 141, 255, 0.42) 8%, rgba(108, 77, 255, 0.24) 24%, transparent 58%),
            linear-gradient(90deg, transparent 0%, rgba(108, 77, 255, 0.18) 36%, rgba(255, 255, 255, 0.68) 50%, rgba(77, 141, 255, 0.2) 64%, transparent 100%);
          --privy-horizon-opacity-min: 0.24;
          --privy-horizon-opacity-max: 0.5;
          --privy-orb-opacity: 0.42;
          --privy-orb-violet-bg: radial-gradient(circle, rgba(108, 77, 255, 0.28) 0%, transparent 68%);
          --privy-orb-blue-bg: radial-gradient(circle, rgba(77, 141, 255, 0.24) 0%, transparent 70%);
          --privy-orb-neon-bg: radial-gradient(circle, rgba(159, 92, 255, 0.2) 0%, transparent 72%);
          --privy-orb-green-bg: radial-gradient(circle, rgba(0, 209, 160, 0.09) 0%, transparent 74%);
          --privy-particles-opacity: 0.36;
          --privy-particles-blend: multiply;
          --privy-grain-bg:
            radial-gradient(rgba(18, 24, 52, 0.1) 0.55px, transparent 0.75px),
            radial-gradient(rgba(108, 77, 255, 0.16) 0.45px, transparent 0.7px);
          --privy-grain-opacity: 0.05;
          --privy-grain-blend: multiply;
          --privy-vignette-bg:
            radial-gradient(circle at center, rgba(243, 240, 251, 0) 28%, rgba(143, 116, 255, 0.08) 70%, rgba(90, 84, 160, 0.18) 100%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(243, 240, 251, 0.34) 100%);
        }

        .privy-login-background--dark {
          --privy-root-bg: #0a0b1a;
          --privy-mesh-bg:
            radial-gradient(circle at 15% 12%, rgba(108, 77, 255, 0.34) 0%, transparent 28%),
            radial-gradient(circle at 86% 17%, rgba(77, 141, 255, 0.26) 0%, transparent 30%),
            radial-gradient(circle at 48% 76%, rgba(159, 92, 255, 0.2) 0%, transparent 34%),
            radial-gradient(circle at 78% 68%, rgba(0, 209, 160, 0.07) 0%, transparent 28%),
            linear-gradient(135deg, #040611 0%, #0a0b1a 42%, #101436 100%);
          --privy-stellar-bg:
            radial-gradient(circle at 50% 35%, rgba(159, 92, 255, 0.18), transparent 42%),
            radial-gradient(circle at 50% 56%, rgba(77, 141, 255, 0.09), transparent 34%),
            linear-gradient(180deg, rgba(2, 3, 12, 0.18), rgba(10, 11, 26, 0.18));
          --privy-stellar-opacity: 0.82;
          --privy-planet-main-bg:
            radial-gradient(circle at 50% 72%, rgba(20, 22, 55, 0.8) 0%, rgba(6, 7, 19, 0.96) 54%, rgba(3, 4, 12, 1) 76%),
            linear-gradient(180deg, rgba(130, 86, 255, 0.04), rgba(2, 3, 12, 0.4));
          --privy-planet-main-shadow:
            0 -1px 0 rgba(194, 150, 255, 0.5),
            0 -18px 52px rgba(108, 77, 255, 0.46),
            0 -3px 16px rgba(159, 92, 255, 0.58),
            inset 0 70px 120px rgba(124, 78, 255, 0.06),
            inset 0 -160px 220px rgba(1, 2, 10, 0.88);
          --privy-planet-main-opacity: 0.92;
          --privy-planet-small-bg:
            radial-gradient(circle at 68% 22%, rgba(178, 128, 255, 0.94), rgba(108, 77, 255, 0.46) 28%, rgba(12, 10, 34, 0.98) 62%),
            radial-gradient(circle, rgba(159, 92, 255, 0.46), transparent 72%);
          --privy-planet-small-shadow:
            -18px -18px 42px rgba(108, 77, 255, 0.34),
            14px 18px 44px rgba(4, 6, 20, 0.7),
            0 0 28px rgba(159, 92, 255, 0.26);
          --privy-planet-a-opacity-high: 0.92;
          --privy-planet-a-opacity-low: 0.76;
          --privy-planet-b-opacity-high: 0.78;
          --privy-planet-b-opacity-low: 0.56;
          --privy-wave-opacity: 0.58;
          --privy-wave-blend: screen;
          --privy-wave-bg:
            repeating-radial-gradient(
              ellipse at 50% 100%,
              transparent 0 16px,
              rgba(108, 77, 255, 0.2) 17px 18px,
              transparent 19px 28px
            ),
            linear-gradient(90deg, rgba(77, 141, 255, 0.16), rgba(159, 92, 255, 0.12), transparent 62%);
          --privy-wave-filter: drop-shadow(0 0 8px rgba(108, 77, 255, 0.42));
          --privy-focus-bg: radial-gradient(
            circle at center,
            rgba(255, 255, 255, 0.15) 0%,
            rgba(77, 141, 255, 0.1) 18%,
            rgba(108, 77, 255, 0.14) 36%,
            rgba(10, 11, 26, 0) 72%
          );
          --privy-horizon-bg:
            radial-gradient(ellipse at center, rgba(255, 255, 255, 0.52) 0%, rgba(77, 141, 255, 0.7) 8%, rgba(108, 77, 255, 0.34) 24%, transparent 58%),
            linear-gradient(90deg, transparent 0%, rgba(108, 77, 255, 0.34) 36%, rgba(255, 255, 255, 0.76) 50%, rgba(77, 141, 255, 0.34) 64%, transparent 100%);
          --privy-horizon-opacity-min: 0.5;
          --privy-horizon-opacity-max: 0.86;
          --privy-orb-opacity: 0.58;
          --privy-orb-violet-bg: radial-gradient(circle, rgba(108, 77, 255, 0.4) 0%, transparent 68%);
          --privy-orb-blue-bg: radial-gradient(circle, rgba(77, 141, 255, 0.28) 0%, transparent 70%);
          --privy-orb-neon-bg: radial-gradient(circle, rgba(159, 92, 255, 0.24) 0%, transparent 72%);
          --privy-orb-green-bg: radial-gradient(circle, rgba(0, 209, 160, 0.12) 0%, transparent 74%);
          --privy-particles-opacity: 0.58;
          --privy-particles-blend: screen;
          --privy-grain-bg:
            radial-gradient(rgba(255, 255, 255, 0.18) 0.55px, transparent 0.75px),
            radial-gradient(rgba(108, 77, 255, 0.2) 0.45px, transparent 0.7px);
          --privy-grain-opacity: 0.045;
          --privy-grain-blend: soft-light;
          --privy-vignette-bg:
            radial-gradient(circle at center, rgba(10, 11, 26, 0) 24%, rgba(10, 11, 26, 0.22) 68%, rgba(10, 11, 26, 0.84) 100%),
            linear-gradient(180deg, rgba(10, 11, 26, 0.18) 0%, rgba(10, 11, 26, 0.42) 100%);
        }

        .privy-login-background__mesh,
        .privy-login-background__stellar-wash,
        .privy-login-background__planet,
        .privy-login-background__wave,
        .privy-login-background__focus,
        .privy-login-background__horizon,
        .privy-login-background__orb,
        .privy-login-background__particles,
        .privy-login-background__grain,
        .privy-login-background__vignette {
          position: absolute;
          inset: 0;
        }

        .privy-login-background__mesh {
          inset: -14%;
          background: var(--privy-mesh-bg);
          background-size: 150% 150%;
          transform: translate3d(var(--privy-parallax-x), var(--privy-parallax-y), 0) scale(1.08);
          animation: privyMeshShift 20s ease-in-out infinite alternate;
          will-change: transform, background-position;
        }

        .privy-login-background__stellar-wash {
          background: var(--privy-stellar-bg);
          opacity: var(--privy-stellar-opacity);
          transform: translate3d(var(--privy-parallax-inverse-soft-x), var(--privy-parallax-inverse-soft-y), 0)
            scale(1.03);
          will-change: transform;
        }

        .privy-login-background__planet {
          border-radius: 9999px;
          pointer-events: none;
          will-change: transform, opacity;
        }

        .privy-login-background__planet--main {
          left: 50%;
          top: 19%;
          width: min(82rem, 142vw);
          aspect-ratio: 1 / 1;
          transform: translate3d(calc(-50% + var(--privy-parallax-inverse-x)), var(--privy-parallax-inverse-y), 0);
          background: var(--privy-planet-main-bg);
          box-shadow: var(--privy-planet-main-shadow);
          opacity: var(--privy-planet-main-opacity);
          -webkit-mask-image: linear-gradient(to bottom, #000 0 62%, transparent 79%);
          mask-image: linear-gradient(to bottom, #000 0 62%, transparent 79%);
        }

        .privy-login-background__planet--small-left,
        .privy-login-background__planet--small-right {
          width: clamp(4.8rem, 17vw, 8.5rem);
          aspect-ratio: 1 / 1;
          background: var(--privy-planet-small-bg);
          box-shadow: var(--privy-planet-small-shadow);
        }

        .privy-login-background__planet--small-left {
          left: 6%;
          top: 8%;
          transform: translate3d(var(--privy-parallax-planet-left-x), var(--privy-parallax-planet-left-y), 0);
          animation: privyPlanetFloatA 18s ease-in-out infinite;
        }

        .privy-login-background__planet--small-right {
          right: 10%;
          top: 26%;
          width: clamp(2.4rem, 8vw, 3.6rem);
          opacity: var(--privy-planet-b-opacity-high);
          transform: translate3d(var(--privy-parallax-planet-right-x), var(--privy-parallax-planet-right-y), 0);
          animation: privyPlanetFloatB 16s ease-in-out infinite;
        }

        .privy-login-background__wave {
          overflow: hidden;
          opacity: var(--privy-wave-opacity);
          mix-blend-mode: var(--privy-wave-blend);
          will-change: transform, opacity;
        }

        .privy-login-background__wave::before {
          content: '';
          position: absolute;
          inset: -36%;
          background: var(--privy-wave-bg);
          filter: var(--privy-wave-filter);
          transform: perspective(720px) rotateX(64deg) rotateZ(var(--privy-wave-rotation, 0deg));
          transform-origin: 50% 100%;
          animation: privyWaveDrift 18s ease-in-out infinite alternate;
        }

        .privy-login-background__wave--left {
          inset: 13% auto auto -34%;
          width: 72%;
          height: 58%;
          --privy-wave-rotation: -24deg;
          transform: translate3d(var(--privy-parallax-field-x), var(--privy-parallax-field-y), 0);
        }

        .privy-login-background__wave--right {
          inset: 20% -40% auto auto;
          width: 86%;
          height: 58%;
          --privy-wave-rotation: 24deg;
          transform: translate3d(var(--privy-parallax-inverse-field-x), var(--privy-parallax-inverse-field-y), 0);
        }

        .privy-login-background__wave--bottom {
          inset: auto -12% -32% -12%;
          height: 42%;
          opacity: 0.48;
          --privy-wave-rotation: 0deg;
          transform: translate3d(var(--privy-parallax-bottom-x), 0, 0);
        }

        .privy-login-background__focus {
          inset: 18% 10% 20%;
          background: var(--privy-focus-bg);
          filter: blur(20px);
          transform: translate3d(var(--privy-parallax-inverse-x), var(--privy-parallax-inverse-y), 0);
          will-change: transform;
        }

        .privy-login-background__horizon {
          left: 50%;
          top: 45%;
          width: min(28rem, 68vw);
          height: 3.2rem;
          transform: translate3d(calc(-50% + var(--privy-parallax-x)), var(--privy-parallax-y), 0);
          background: var(--privy-horizon-bg);
          filter: blur(10px);
          opacity: var(--privy-horizon-opacity-max);
          animation: privyHorizonPulse 8s ease-in-out infinite;
          will-change: opacity, transform;
        }

        .privy-login-background__orb {
          filter: blur(76px);
          opacity: var(--privy-orb-opacity);
          will-change: transform, opacity;
        }

        .privy-login-background__orb--violet {
          inset: auto auto 7% -12%;
          width: 22rem;
          height: 22rem;
          background: var(--privy-orb-violet-bg);
          animation: privyOrbFloatA 16s ease-in-out infinite;
        }

        .privy-login-background__orb--blue {
          inset: 4% -12% auto auto;
          width: 22rem;
          height: 22rem;
          background: var(--privy-orb-blue-bg);
          animation: privyOrbFloatB 20s ease-in-out infinite;
        }

        .privy-login-background__orb--neon {
          inset: 33% auto auto 36%;
          width: 16rem;
          height: 16rem;
          background: var(--privy-orb-neon-bg);
          animation: privyOrbFloatC 14s ease-in-out infinite;
        }

        .privy-login-background__orb--green {
          inset: auto 14% 18% auto;
          width: 10rem;
          height: 10rem;
          background: var(--privy-orb-green-bg);
          animation: privyOrbFloatD 18s ease-in-out infinite;
        }

        .privy-login-background__particles {
          opacity: var(--privy-particles-opacity);
          mix-blend-mode: var(--privy-particles-blend);
        }

        .privy-login-background__grain {
          background-image: var(--privy-grain-bg);
          background-position:
            0 0,
            3px 5px;
          background-size:
            8px 8px,
            13px 13px;
          opacity: var(--privy-grain-opacity);
          mix-blend-mode: var(--privy-grain-blend);
        }

        .privy-login-background__vignette {
          background: var(--privy-vignette-bg);
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

        @keyframes privyPlanetFloatA {
          0%,
          100% {
            opacity: var(--privy-planet-a-opacity-high);
          }
          50% {
            opacity: var(--privy-planet-a-opacity-low);
          }
        }

        @keyframes privyPlanetFloatB {
          0%,
          100% {
            opacity: var(--privy-planet-b-opacity-high);
          }
          50% {
            opacity: var(--privy-planet-b-opacity-low);
          }
        }

        @keyframes privyWaveDrift {
          0% {
            opacity: 0.7;
          }
          100% {
            opacity: 0.46;
          }
        }

        @keyframes privyHorizonPulse {
          0%,
          100% {
            opacity: var(--privy-horizon-opacity-min);
          }
          50% {
            opacity: var(--privy-horizon-opacity-max);
          }
        }

        @media (max-width: 640px) {
          .privy-login-background__planet--main {
            top: 16%;
            width: 156vw;
          }

          .privy-login-background__wave--left {
            inset: 13% auto auto -54%;
            width: 104%;
          }

          .privy-login-background__wave--right {
            inset: 20% -68% auto auto;
            width: 118%;
          }

          .privy-login-background__wave--bottom {
            height: 36%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .privy-login-background__mesh,
          .privy-login-background__orb,
          .privy-login-background__planet,
          .privy-login-background__wave::before,
          .privy-login-background__horizon {
            animation: none !important;
          }

          .privy-login-background__mesh,
          .privy-login-background__stellar-wash,
          .privy-login-background__focus,
          .privy-login-background__wave {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
