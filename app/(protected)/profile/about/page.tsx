'use client';

import { useTranslations } from 'next-intl';
import { ProfilePageShell, ProfileSurface } from '@/components/profile/ProfilePageShell';

type AboutSection = {
  title: string;
  body: string[];
  list?: Array<{ title: string; text: string }>;
};

export default function AboutAppPage() {
  const t = useTranslations('ProfilePages.about');
  const sections = t.raw('sections') as AboutSection[];

  return (
    <ProfilePageShell
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <ProfileSurface className="bg-[linear-gradient(160deg,rgba(107,57,244,0.14)_0%,rgba(255,255,255,0.94)_46%,rgba(76,110,245,0.08)_100%)]">
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
              {section.list ? (
                <div className="flex flex-col gap-3">
                  {section.list.map((item, index) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 rounded-[22px] border border-[#EBEEF7] bg-[#FCFCFF] px-4 py-4"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5F1FF] text-xs font-semibold text-[#6B39F4]">
                        {index + 1}
                      </span>
                      <p className="leading-6">
                        <span className="font-semibold text-[#1C2336]">{item.title}: </span>
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </ProfileSurface>
        ))}
      </div>
    </ProfilePageShell>
  );
}
