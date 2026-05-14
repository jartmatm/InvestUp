import { defineRouting } from 'next-intl/routing';
import { defaultLocale, localeCookieName, locales } from '@/i18n/locales';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeCookie: {
    name: localeCookieName,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  },
  localeDetection: true,
  alternateLinks: true,
});
