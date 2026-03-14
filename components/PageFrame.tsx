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
    <main className="min-h-screen bg-gray-100 pb-24 pt-6 text-gray-900">
      <div className="mx-auto w-full max-w-xl px-4">
        <Navbar title={title} subtitle={subtitle} rightSlot={rightSlot} />
        <section>{children}</section>
      </div>
      <BottomNav />
    </main>
  );
}
