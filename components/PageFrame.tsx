'use client';

import BottomNav from '@/components/BottomNav';
import Navbar from '@/components/Navbar';
import PageBackButton from '@/components/PageBackButton';

type PageFrameProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  topSlot?: React.ReactNode;
  headerAlign?: 'left' | 'center';
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
};

export default function PageFrame({
  title,
  subtitle,
  rightSlot,
  topSlot,
  headerAlign = 'left',
  showBackButton = false,
  backHref = '/profile',
  backLabel = 'Back',
  children,
}: PageFrameProps) {
  return (
    <main className="min-h-screen bg-transparent pb-32 pt-6 text-gray-900">
      <div className="mx-auto w-full max-w-xl rounded-[28px] border border-white/25 bg-white/20 px-4 py-4 backdrop-blur-md shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        {showBackButton ? (
          <div className="mb-4 flex justify-start">
            <PageBackButton fallbackHref={backHref} label={backLabel} />
          </div>
        ) : null}
        {topSlot ? <div className="mb-4 flex justify-center">{topSlot}</div> : null}
        <Navbar title={title} subtitle={subtitle} rightSlot={rightSlot} align={headerAlign} />
        <section>{children}</section>
      </div>
      <BottomNav />
    </main>
  );
}
