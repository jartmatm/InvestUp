'use client';

import PageFrame from '@/components/PageFrame';
import { LANGUAGE_OPTIONS, useAppLanguage } from '@/lib/app-language';

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function LanguagePage() {
  const { languageLabel, setLanguageLabel, t } = useAppLanguage();

  const handleSelectLanguage = (language: string) => {
    setLanguageLabel(language as (typeof LANGUAGE_OPTIONS)[number]);
  };

  return (
    <PageFrame title="Language" subtitle="Choose the language for your account">
      <div className="space-y-3">
        {LANGUAGE_OPTIONS.map((language) => {
          const active = language === languageLabel;
          return (
            <button
              key={language}
              type="button"
              onClick={() => handleSelectLanguage(language)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition ${
                active
                  ? 'border-[#6B39F4] bg-[#6B39F4]/10 text-[#6B39F4]'
                  : 'border-white/25 bg-white/20 text-gray-800 hover:bg-white/30'
              }`}
            >
              <div>
                <p className="text-sm font-semibold">{language}</p>
                <p className="text-xs text-gray-500">
                  {active ? t('Currently selected') : t('Tap to use this language')}
                </p>
              </div>
              {active ? <CheckIcon /> : null}
            </button>
          );
        })}
      </div>
    </PageFrame>
  );
}
