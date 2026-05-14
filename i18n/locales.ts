export const defaultLocale = 'en';

export const locales = ['en', 'es', 'hi', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ar'] as const;

export type AppLocale = (typeof locales)[number];

export const localeCookieName = 'NEXT_LOCALE';

export const languageOptions: Array<{
  locale: AppLocale;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}> = [
  { locale: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
  { locale: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { locale: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
  { locale: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', dir: 'ltr' },
  { locale: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { locale: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { locale: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { locale: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { locale: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', dir: 'ltr' },
  { locale: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
];

export function isLocale(value: string | null | undefined): value is AppLocale {
  return Boolean(value && (locales as readonly string[]).includes(value));
}

export function getLanguageOption(locale: string | null | undefined) {
  return languageOptions.find((option) => option.locale === locale) ?? languageOptions[0];
}

export function getTextDirection(locale: string | null | undefined) {
  return getLanguageOption(locale).dir;
}
