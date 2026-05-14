import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale, localeCookieName, locales, type AppLocale } from '@/i18n/locales';
import { getPathLocale, stripLocalePrefix } from '@/i18n/pathnames';
import { updateSession } from '@/utils/supabase/middleware';

const localeHeaderName = 'X-NEXT-INTL-LOCALE';
const publicFilePattern = /\.(.*)$/;

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    publicFilePattern.test(pathname)
  );
}

function getPreferredLocale(request: NextRequest): AppLocale {
  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const acceptedLanguages = request.headers.get('accept-language')?.split(',') ?? [];
  for (const item of acceptedLanguages) {
    const candidate = item.trim().split(';')[0]?.toLowerCase();
    const primary = candidate?.split('-')[0];
    if (isLocale(primary)) return primary;
  }

  return defaultLocale;
}

function setLocaleCookie(response: NextResponse, locale: AppLocale) {
  response.cookies.set(localeCookieName, locale, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
}

function setAlternateLinks(response: NextResponse, request: NextRequest, locale: AppLocale, unprefixedPathname: string) {
  const origin = request.nextUrl.origin;
  const path = unprefixedPathname === '/' ? '' : unprefixedPathname;
  const search = request.nextUrl.search;
  const links = [
    ...locales.map((item) => `<${origin}/${item}${path}${search}>; rel="alternate"; hreflang="${item}"`),
    `<${origin}/${defaultLocale}${path}${search}>; rel="alternate"; hreflang="x-default"`,
  ];

  response.headers.set('Link', links.join(', '));
  response.headers.set('Content-Language', locale);
}

function mergeSessionCookies(response: NextResponse, sessionResponse: NextResponse) {
  sessionResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
  response.headers.set('Cache-Control', sessionResponse.headers.get('Cache-Control') ?? 'private, no-store');
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionResponse = await updateSession(request);

  if (isPublicAsset(pathname) || pathname.startsWith('/api')) {
    return sessionResponse;
  }

  const pathLocale = getPathLocale(pathname);

  if (pathLocale) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(localeHeaderName, pathLocale);

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = stripLocalePrefix(pathname);

    const response = NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });
    setLocaleCookie(response, pathLocale);
    setAlternateLinks(response, request, pathLocale, rewriteUrl.pathname);
    mergeSessionCookies(response, sessionResponse);

    return response;
  }

  const locale = getPreferredLocale(request);
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;

  const response = NextResponse.redirect(redirectUrl);
  setLocaleCookie(response, locale);
  mergeSessionCookies(response, sessionResponse);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)',
  ],
};
