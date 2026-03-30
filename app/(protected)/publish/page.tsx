'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageFrame from '@/components/PageFrame';

export default function PublishPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/portfolio');
  }, [router]);

  return (
    <PageFrame title="Publish project" subtitle="Redirecting to your business portfolio">
      <div className="rounded-xl border border-white/25 bg-white/20 p-4 text-sm text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
        Opening your portfolio...
      </div>
    </PageFrame>
  );
}
