import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Nav } from './components/nav';
import { Providers } from './providers';
import Script from 'next/script';
import { SITE } from '@/lib/site-config';
import { getSiteUrl } from '@/lib/seo';

const siteUrl = getSiteUrl();
const siteImage = `${siteUrl}/images/rhythm-read-signature-book.png`;

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Rhythm Read',
  title: {
    default: 'Rhythm Read — Read eBooks Online | Free & Premium Digital Books',
    template: '%s | Rhythm Read',
  },
  description: 'Discover free and premium eBooks, read books online, explore digital stories, and build your personal reading library with Rhythm Read.',
  keywords: [
    'ebook', 'ebooks', 'eBooks online', 'read ebooks online', 'free ebooks', 'digital books',
    'online reading', 'digital reading', 'online bookstore', 'free online books', 'Rhythm Read',
  ],
  authors: [{ name: SITE.owner }],
  creator: SITE.owner,
  publisher: 'Rhythm Read',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Rhythm Read — Read eBooks Online | Free & Premium Digital Books',
    description: 'Discover free and premium eBooks, read online, and build your personal digital library on Rhythm Read.',
    url: siteUrl,
    siteName: 'Rhythm Read',
    locale: 'en_US',
    type: 'website',
    images: [{ url: siteImage, alt: 'Rhythm Read digital reading platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rhythm Read — Read eBooks Online',
    description: 'Discover free and premium digital books on Rhythm Read.',
    images: [siteImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  category: 'books',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  manifest: '/manifest.webmanifest',
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#eef2f7',
  colorScheme: 'light',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: siteUrl,
    email: SITE.email,
    telephone: SITE.phone,
    description: SITE.description,
    address: { '@type': 'PostalAddress', addressCountry: SITE.country },
  };

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: siteUrl,
    description: SITE.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/discover?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en">
      <body>
        <Script id="rhythmread-organization" type="application/ld+json" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationLd) }} />
        <Script id="rhythmread-website" type="application/ld+json" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteLd) }} />
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT ? (
          <Script
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        ) : null}
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
