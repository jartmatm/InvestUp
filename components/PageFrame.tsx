'use client';

import BottomNav from '@/components/BottomNav';
import Navbar from '@/components/Navbar';

type PageFrameProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
};

export default function PageFrame({ title, subtitle, rightSlot, children }: PageFrameProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-teal-400 pb-24 pt-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.22),transparent_46%),radial-gradient(circle_at_86%_8%,rgba(255,255,255,0.16),transparent_38%)]" />
      <div className="relative mx-auto w-full max-w-xl px-5">
      <Navbar title={title} subtitle={subtitle} rightSlot={rightSlot} />
      <section>{children}</section>
      </div>
      <BottomNav />
    </main>
  );
}
