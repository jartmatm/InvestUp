import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'InvestApp',
    short_name: 'InvestApp',
    description: 'Plataforma fintech para inversiones y repayments descentralizados',
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
