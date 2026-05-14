'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getLanguageOption, isLocale, languageOptions, localeCookieName, type AppLocale } from '@/i18n/locales';
import { localizePath } from '@/i18n/pathnames';

type LanguageSelectorProps = {
  variant?: 'desktop' | 'mobile' | 'menu';
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition duration-200 ${open ? '-rotate-90' : 'rotate-90'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export default function LanguageSelector({ variant = 'desktop' }: LanguageSelectorProps) {
  const locale = useLocale();
  const t = useTranslations('Locale');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const activeLocale = isLocale(locale) ? locale : 'en';
  const active = getLanguageOption(activeLocale);
  const compact = variant === 'mobile';

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectLocale = (nextLocale: AppLocale) => {
    const query = searchParams.toString();
    const nextPath = localizePath(`${pathname}${query ? `?${query}` : ''}`, nextLocale);

    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    startTransition(() => {
      router.replace(nextPath);
      router.refresh();
    });
  };

  return (
    <div ref={menuRef} className="relative" dir="ltr">
      <button
        type="button"
        aria-label={t('changeLanguage')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7EAF3] bg-white font-bold text-[#1F2A44] shadow-[0_12px_28px_rgba(21,28,44,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-[#D9CCFF] hover:text-[#6B39F4] focus:outline-none focus:ring-4 focus:ring-[#6B39F4]/10 dark:border-white/10 dark:bg-slate-950 dark:text-white ${
          compact ? 'h-9 px-2.5 text-xs' : 'h-10 px-3 text-sm'
        } ${isPending ? 'opacity-70' : ''}`}
      >
        <span className={compact ? 'text-base' : 'text-lg'} aria-hidden="true">
          {active.flag}
        </span>
        <span className={compact ? 'sr-only' : 'hidden xl:inline'}>{active.nativeName}</span>
        <span className={compact ? 'text-[11px]' : 'xl:hidden'}>{active.locale.toUpperCase()}</span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`absolute z-50 mt-3 max-h-[70vh] w-[260px] overflow-y-auto rounded-[24px] border border-[#E7EAF3] bg-white/95 p-2 shadow-[0_26px_70px_rgba(21,28,44,0.16)] ring-1 ring-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 ${
            compact ? 'right-0 bottom-[calc(100%+10px)]' : 'right-0 top-full'
          }`}
        >
          <p className="px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#98A1B5]">
            {t('label')}
          </p>
          <div className="space-y-1">
            {languageOptions.map((option) => {
              const selected = option.locale === activeLocale;
              return (
                <button
                  key={option.locale}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => selectLocale(option.locale)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition duration-200 ${
                    selected
                      ? 'bg-[#F1ECFF] text-[#6B39F4]'
                      : 'text-[#344054] hover:bg-[#F8F9FB] dark:text-slate-200 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl" aria-hidden="true">
                    {option.flag}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{option.nativeName}</span>
                    <span className="block truncate text-xs font-medium text-[#73809A]">{option.name}</span>
                  </span>
                  {selected ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-[#6B39F4]" aria-label={t('currentLanguage')} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
