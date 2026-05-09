'use client';

import Link from 'next/link';

function IconPremium() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 9 3.2 8h7.6L19 9l-4.2 3.1L12 6 9.2 12.1 5 9Z" />
      <path d="M8 20h8" />
    </svg>
  );
}

export default function DesktopUpgradeCard() {
  return (
    <div className="mt-auto rounded-[24px] border border-[#ECE7FF] bg-[linear-gradient(145deg,#FFFFFF_0%,#F4F0FF_100%)] p-5 text-center shadow-[0_24px_60px_rgba(107,57,244,0.10)]">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EEE7FF] text-[#6B39F4]">
        <IconPremium />
      </span>
      <p className="mt-4 text-base font-bold text-[#6B39F4]">Upgrade to Premium</p>
      <p className="mt-2 text-sm leading-5 text-[#74809A]">
        Unlock exclusive opportunities and advanced analytics.
      </p>
      <Link
        href="/profile"
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#7C5CFF_0%,#5B2FF4_100%)] text-sm font-bold text-white shadow-[0_16px_30px_rgba(107,57,244,0.24)] transition duration-200 hover:-translate-y-0.5"
      >
        Upgrade now
      </Link>
    </div>
  );
}
