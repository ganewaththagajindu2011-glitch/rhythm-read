import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rhythm Read',
    short_name: 'Rhythm Read',
    description: 'Read free and premium digital books online.',
    start_url: '/',
    display: 'standalone',
    background_color: '#eef2f7',
    theme_color: '#eef2f7',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
  };
}
