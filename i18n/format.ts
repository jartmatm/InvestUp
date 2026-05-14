import { defaultLocale, type AppLocale } from '@/i18n/locales';

export function formatCurrency(
  value: number,
  locale: AppLocale = defaultLocale,
  currency = 'USD',
  options?: Intl.NumberFormatOptions
) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatNumber(value: number, locale: AppLocale = defaultLocale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatPercent(value: number, locale: AppLocale = defaultLocale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatDate(
  value: string | number | Date,
  locale: AppLocale = defaultLocale,
  options?: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    ...options,
  }).format(new Date(value));
}

export function formatRelativeDays(days: number, locale: AppLocale = defaultLocale) {
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day');
}
