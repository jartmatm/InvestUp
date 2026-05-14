import type { MetadataRoute } from 'next';
import { getTranslations } from 'next-intl/server';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations('Metadata');

  return {
    name: t('title'),
    short_name: 'InvestApp',
    description: t('description'),
    start_url: '/splash',
    display: 'standalone',
    background_color: '#F4F1FF',
    theme_color: '#6B39F4',
    icons: [
      {
        src: '/investapp-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/investapp-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
