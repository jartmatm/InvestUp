'use client';

import { useTranslations } from 'next-intl';
import { ProfilePageShell, ProfileSurface } from '@/components/profile/ProfilePageShell';

type PolicySection = {
  title: string;
  body: string[];
};

export default function PrivacyPolicyPage() {
  const t = useTranslations('ProfilePages.privacyPolicyPage');
  const sections = t.raw('sections') as PolicySection[];

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
        </div>
      </ProfileSurface>

      <div className="flex flex-col gap-3">
        {sections.map((section) => (
          <ProfileSurface key={section.title}>
            <div className="flex flex-col gap-3 text-sm text-[#4B5565]">
              <h2 className="text-base font-semibold tracking-[-0.02em] text-[#1C2336]">
                {section.title}
              </h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="leading-6">
                  {paragraph}
                </p>
              ))}
            </div>
          </ProfileSurface>
        ))}
      </div>
    </ProfilePageShell>
  );
}
