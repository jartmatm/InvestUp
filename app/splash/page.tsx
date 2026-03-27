"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Particles from "react-tsparticles";
import { useInvestApp } from "@/lib/investapp-context";

export default function SplashScreen() {
  const router = useRouter();
  const { faseApp } = useInvestApp();

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
      <div className="absolute inset-0 animated-gradient" />

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
          alt="InvestApp"
          className="w-72 drop-shadow-[0_0_35px_rgba(255,255,255,0.4)]"
        />
      </div>
    </div>
  );
}
