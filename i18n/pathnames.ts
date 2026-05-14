import { type AppLocale, defaultLocale, isLocale } from '@/i18n/locales';

export function getPathLocale(pathname: string): AppLocale | null {
  const segment = pathname.split('/').filter(Boolean)[0];
  return isLocale(segment) ? segment : null;
}

export function stripLocalePrefix(pathname: string) {
  const locale = getPathLocale(pathname);
  if (!locale) return pathname || '/';

  const stripped = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '') || '/';
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

export function localizePath(pathname: string, locale: AppLocale = defaultLocale) {
  if (!pathname || pathname === '#') return pathname;
  if (/^(https?:|mailto:|tel:)/.test(pathname)) return pathname;

  const [pathWithoutHash, hash = ''] = pathname.split('#');
  const [pathOnly, query = ''] = pathWithoutHash.split('?');
  const unprefixedPath = stripLocalePrefix(pathOnly || '/');
  const localized = `/${locale}${unprefixedPath === '/' ? '' : unprefixedPath}`;
  const withQuery = query ? `${localized}?${query}` : localized;

  return hash ? `${withQuery}#${hash}` : withQuery;
}
