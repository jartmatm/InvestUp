import { routing } from '@/i18n/routing';
import messages from '@/messages/en.json';

declare module 'use-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
