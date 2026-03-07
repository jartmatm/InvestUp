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
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 pb-24 pt-6">
      <Navbar title={title} subtitle={subtitle} rightSlot={rightSlot} />
      <section>{children}</section>
      <BottomNav />
    </main>
  );
}
