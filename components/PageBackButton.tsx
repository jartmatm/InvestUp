'use client';

import { useRouter } from 'next/navigation';

type PageBackButtonProps = {
  fallbackHref?: string;
  label?: string;
  className?: string;
};

export default function PageBackButton({
  fallbackHref = '/profile',
  label = 'Back',
  className,
}: PageBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/80 px-4 py-2 text-sm font-semibold tracking-[-0.02em] text-[#0F172A] shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-md transition hover:bg-white ${className ?? ''}`}
      aria-label={label}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
