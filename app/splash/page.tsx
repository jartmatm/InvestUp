"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Particles from "react-tsparticles";
import { useInvestUp } from "@/lib/investup-context";

export default function SplashScreen() {
  const router = useRouter();
  const { faseApp } = useInvestUp();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (faseApp === "dashboard") {
        router.push("/home");
        return;
      }
      if (faseApp === "onboarding") {
        router.push("/onboarding");
        return;
      }
      router.push("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [faseApp, router]);

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/fondo_home.jpg')" }}
      />
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" />

      <Particles
        className="absolute inset-0"
        options={{
          background: { color: "transparent" },
          particles: {
            number: { value: 40 },
            color: { value: "#ffffff" },
            opacity: { value: 0.15 },
            size: { value: 3 },
            move: {
              enable: true,
              speed: 1,
            },
          },
        }}
      />

      <div className="relative z-10 flex flex-col items-center animate-logoReveal">
        <img
          src="/logo.png"
          alt="InvestUp"
          className="w-72 drop-shadow-[0_0_35px_rgba(255,255,255,0.4)]"
        />
      </div>
    </div>
  );
}
