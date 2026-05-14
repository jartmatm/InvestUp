import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale } from '@/i18n/locales';

const namespaces = [
  'common',
  'navigation',
  'chrome',
  'app',
  'feed',
  'home',
  'send',
  'portfolio',
  'profile',
  'publish',
  'documents',
] as const;

type MessageCatalog = Record<string, unknown>;

async function loadNamespace(locale: string, namespace: (typeof namespaces)[number]) {
  try {
    return (await import(`../messages/${locale}/${namespace}.json`)).default as MessageCatalog;
  } catch {
    return {};
  }
}

async function loadMessages(locale: string) {
  const [englishCatalogs, localeCatalogs] = await Promise.all([
    Promise.all(namespaces.map((namespace) => loadNamespace(defaultLocale, namespace))),
    locale === defaultLocale ? Promise.resolve([]) : Promise.all(namespaces.map((namespace) => loadNamespace(locale, namespace))),
  ]);

  return Object.assign({}, ...englishCatalogs, ...localeCatalogs);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
