'use client';

import { useEffect, useState } from 'react';
import PageFrame from '@/components/PageFrame';

const LANGUAGE_OPTIONS = [
  'English (US)',
  'Spanish',
  'Portuguese',
  'French',
  'German',
  'Italian',
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function LanguagePage() {
  const [selectedLanguage, setSelectedLanguage] = useState('English (US)');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedLanguage = window.localStorage.getItem('investup_language') || 'English (US)';
    setSelectedLanguage(storedLanguage);
  }, []);

  const handleSelectLanguage = (language: string) => {
    setSelectedLanguage(language);
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('investup_language', language);
    window.dispatchEvent(new Event('investup-language-updated'));
  };

  return (
    <PageFrame title="Language" subtitle="Choose the language for your account">
      <div className="space-y-3">
        {LANGUAGE_OPTIONS.map((language) => {
          const active = language === selectedLanguage;
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
                  {active ? 'Currently selected' : 'Tap to use this language'}
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
