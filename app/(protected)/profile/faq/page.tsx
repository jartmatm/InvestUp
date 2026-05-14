'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ProfilePageShell, ProfileSurface } from '@/components/profile/ProfilePageShell';

type FaqItem = {
  question: string;
  answer: string;
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition ${open ? 'rotate-180 text-[#6B39F4]' : 'text-[#98A2B3]'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 4.1 1.9c-.8.7-1.6 1.2-1.6 2.4" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

export default function FaqPage() {
  const t = useTranslations('ProfilePages.faqPage');
  const faqs = t.raw('items') as FaqItem[];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <ProfilePageShell
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <ProfileSurface className="bg-[linear-gradient(160deg,rgba(74,108,247,0.12)_0%,rgba(255,255,255,0.96)_46%,rgba(107,57,244,0.08)_100%)]">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
              {t('heroEyebrow')}
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
              {t('heroTitle')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7B879C]">
              {t('heroDescription')}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-[24px] border border-[#EBEEF7] bg-white/82 px-4 py-4 shadow-[0_16px_32px_rgba(31,38,64,0.05)]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F1FF] text-[#6B39F4]">
              <QuestionIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1C2336]">
                {t('questionCount', { count: faqs.length })}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#7B879C]">
                {t('questionCountDescription')}
              </p>
            </div>
          </div>
        </div>
      </ProfileSurface>

      <div className="flex flex-col gap-3">
        {faqs.map((item, index) => {
          const open = openIndex === index;

          return (
            <ProfileSurface
              key={item.question}
              className={
                open
                  ? 'border-[#DDD3FF] bg-[linear-gradient(135deg,rgba(107,57,244,0.10),rgba(255,255,255,0.96))]'
                  : 'bg-white/88'
              }
            >
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F5F1FF] text-[#6B39F4]">
                    <QuestionIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1C2336]">{item.question}</p>
                    {open ? (
                      <p className="mt-2 text-sm leading-6 text-[#667085]">{item.answer}</p>
                    ) : null}
                  </div>
                </div>
                <Chevron open={open} />
              </button>
            </ProfileSurface>
          );
        })}
      </div>
    </ProfilePageShell>
  );
}
