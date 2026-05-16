'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getLanguageOption, isLocale, languageOptions, localeCookieName, type AppLocale } from '@/i18n/locales';
import { localizePath } from '@/i18n/pathnames';

type LanguageSelectorProps = {
  variant?: 'desktop' | 'mobile' | 'menu';
};

const persistLocaleCookie = (nextLocale: AppLocale) => {
  globalThis.document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
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
  const inProfileLanguagePage = variant === 'menu';
  const buttonSizeClassName = compact
    ? 'h-9 rounded-xl px-2.5 text-xs'
    : inProfileLanguagePage
      ? 'h-11 rounded-2xl px-3.5 text-sm'
      : 'h-10 rounded-xl px-3 text-sm';
  const menuPositionClassName = inProfileLanguagePage
    ? 'fixed inset-x-4 bottom-24 z-[9999] max-h-[58vh] w-auto sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-3 sm:max-h-[70vh] sm:w-[280px]'
    : compact
      ? 'absolute right-0 bottom-[calc(100%+10px)] z-[9999] max-h-[70vh] w-[260px]'
      : 'absolute right-0 top-full z-[9999] mt-3 max-h-[70vh] w-[260px]';

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

    persistLocaleCookie(nextLocale);
    setOpen(false);
    startTransition(() => {
      router.replace(nextPath);
      router.refresh();
    });
  };

  return (
    <div ref={menuRef} className={`relative ${open ? 'z-[9999]' : 'z-10'}`} dir="ltr">
      <button
        type="button"
        aria-label={t('changeLanguage')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center justify-center gap-2 border border-[#DDD3FF] bg-[linear-gradient(135deg,#FFFFFF_0%,#F6F1FF_48%,#EEF4FF_100%)] font-bold text-[#5B2FF4] shadow-[0_14px_30px_rgba(107,57,244,0.12)] ring-1 ring-white/80 transition duration-200 hover:-translate-y-0.5 hover:border-[#BDAAFF] hover:text-[#4B22D6] hover:shadow-[0_18px_38px_rgba(107,57,244,0.18)] focus:outline-none focus:ring-4 focus:ring-[#6B39F4]/10 dark:border-[#8C73FF]/50 dark:bg-[linear-gradient(135deg,#201A39_0%,#111827_100%)] dark:text-[#CFC4FF] ${buttonSizeClassName} ${
          isPending ? 'opacity-70' : ''
        }`}
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
          className={`${menuPositionClassName} overflow-y-auto rounded-[26px] border border-[#DDD3FF] bg-white/95 p-2 shadow-[0_28px_80px_rgba(55,43,120,0.22)] ring-1 ring-white/85 backdrop-blur-2xl dark:border-[#8C73FF]/30 dark:bg-slate-950/95`}
        >
          <p className="px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#6B39F4]">
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
                      ? 'bg-[linear-gradient(135deg,#F1ECFF_0%,#EEF4FF_100%)] text-[#5B2FF4] shadow-[inset_0_0_0_1px_rgba(107,57,244,0.10)]'
                      : 'text-[#48566F] hover:bg-[#F8F5FF] hover:text-[#5B2FF4] dark:text-slate-200 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl" aria-hidden="true">
                    {option.flag}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{option.nativeName}</span>
                    <span className="block truncate text-xs font-medium text-[#7B879C]">{option.name}</span>
                  </span>
                  {selected ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-[#6B39F4] shadow-[0_0_0_4px_rgba(107,57,244,0.12)]" aria-label={t('currentLanguage')} />
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
