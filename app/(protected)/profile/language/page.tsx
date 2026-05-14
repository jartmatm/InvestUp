'use client';

import { useLocale, useTranslations } from 'next-intl';
import LanguageSelector from '@/components/LanguageSelector';
import {
  ProfileInfoTile,
  ProfilePageShell,
  ProfileSurface,
} from '@/components/profile/ProfilePageShell';
import { getLanguageOption, isLocale } from '@/i18n/locales';

function GlobeIcon() {
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
      <path d="M4 12h16" />
      <path d="M12 4a12 12 0 0 1 0 16" />
      <path d="M12 4a12 12 0 0 0 0 16" />
    </svg>
  );
}

function SparkIcon() {
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
      <path d="m12 3 1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3Z" />
    </svg>
  );
}

export default function LanguagePage() {
  const locale = useLocale();
  const t = useTranslations('ProfilePages.languagePage');
  const activeLocale = isLocale(locale) ? locale : 'en';
  const activeLanguage = getLanguageOption(activeLocale);

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

          <div className="flex items-center justify-between gap-3 rounded-[24px] border border-[#DDD3FF] bg-[linear-gradient(135deg,rgba(107,57,244,0.12),rgba(255,255,255,0.96))] px-4 py-4 shadow-[0_16px_32px_rgba(31,38,64,0.06)]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5F1FF] text-[#6B39F4]">
                <GlobeIcon />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1C2336]">
                  {activeLanguage.nativeName}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#7B879C]">
                  {t('currentlySelected')}
                </p>
              </div>
            </div>
            <LanguageSelector variant="menu" />
          </div>
        </div>
      </ProfileSurface>

      <ProfileSurface>
        <div className="flex flex-col gap-3">
          <ProfileInfoTile
            icon={<SparkIcon />}
            eyebrow={t('currentModeEyebrow')}
            title={t('currentModeTitle')}
            description={t('currentModeDescription')}
            tone="purple"
          />
          <ProfileInfoTile
            icon={<GlobeIcon />}
            eyebrow={t('coverageEyebrow')}
            title={t('coverageTitle')}
            description={t('coverageDescription')}
            tone="blue"
          />
          <div className="rounded-[24px] border border-[#EBEEF7] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFF_100%)] px-4 py-4 text-sm leading-6 text-[#7B879C] shadow-[0_16px_32px_rgba(31,38,64,0.05)]">
            {t('footerNote')}
          </div>
        </div>
      </ProfileSurface>
    </ProfilePageShell>
  );
}
