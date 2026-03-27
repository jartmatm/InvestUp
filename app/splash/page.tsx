"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 animated-gradient" />

      <div className="relative z-10 flex flex-col items-center gap-4 animate-logoReveal">
        <img
          src="/logo.png"
          alt="InvestApp"
          className="w-72 drop-shadow-[0_0_35px_rgba(255,255,255,0.4)]"
        />
        <p className="text-sm font-medium tracking-[0.2em] text-white/80">INVESTAPP</p>
      </div>
    </div>
  );
}
