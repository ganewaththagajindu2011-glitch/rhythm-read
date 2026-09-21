import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Nav } from './components/nav';
import { Providers } from './providers';
import Script from 'next/script';
import { SITE } from '@/lib/site-config';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {verification: {
  google: 'I4Cb3P52O02uc7fDB3SfUrKpUI0tLYRuNaVZngk3DWU',
},
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Rhythm Read — The Rhythm of Digital Reading',
    template: '%s | Rhythm Read',
  },
  description: 'Discover premium eBooks, free online reads, and digital stories on Rhythm Read — The Rhythm of Digital Reading.',
  keywords: ['ebooks', 'digital reading', 'online books', 'free ebooks', 'digital bookstore'],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Rhythm Read — The Rhythm of Digital Reading',
    description: 'Discover premium eBooks, free online reads, and digital stories on Rhythm Read.',
    url: siteUrl,
    siteName: 'Rhythm Read',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rhythm Read — The Rhythm of Digital Reading',
    description: 'Discover premium eBooks and free online reads.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f7f7f5',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Script id="rhythmread-organization" type="application/ld+json" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context':'https://schema.org', '@type':'Organization', name:SITE.name, url:siteUrl, email:SITE.email, telephone:SITE.phone, description:SITE.description }) }} />
        <Script id="rhythmread-website" type="application/ld+json" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context':'https://schema.org', '@type':'WebSite', name:SITE.name, url:siteUrl }) }} />
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
