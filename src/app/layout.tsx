import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL = 'https://floodwatch-b7g.pages.dev';

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'LankaFlood Watch | Real-Time Hydrology & Flood Radar Sri Lanka',
    template: '%s | LankaFlood Watch',
  },
  description:
    'Live hydro-meteorological river level telemetry, flood warning radar, and rainfall forecasts across Kelani, Kalu, Gin, Nilwala, Mahaweli, and all Sri Lankan river basins.',
  keywords: [
    'Sri Lanka flood alert',
    'Sri Lanka flood radar',
    'river water levels Sri Lanka',
    'Kelani Ganga flood',
    'Kalu Ganga water level',
    'Gin Ganga flood alert',
    'Nilwala river gauge',
    'Mahaweli river water level',
    'Attanagalu Oya flood',
    'Disaster Management Centre Sri Lanka',
    'Irrigation Department flood warnings',
    'live river telemetry Sri Lanka',
    'LankaFlood Watch',
  ],
  authors: [{ name: 'LankaFlood Watch' }],
  creator: 'LankaFlood Watch',
  publisher: 'LankaFlood Watch',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_LK',
    url: SITE_URL,
    siteName: 'LankaFlood Watch',
    title: 'LankaFlood Watch | Real-Time Hydrology & Flood Radar Sri Lanka',
    description:
      'Live hydro-meteorological river level telemetry, flood warning radar, and rainfall forecasts for Sri Lankan river basins.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LankaFlood Watch | Real-Time Hydrology & Flood Radar Sri Lanka',
    description:
      'Live hydro-meteorological river level telemetry, flood warning radar, and rainfall forecasts for Sri Lankan river basins.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'Weather & Disaster Management',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'LankaFlood Watch',
  url: SITE_URL,
  applicationCategory: 'WeatherApplication',
  operatingSystem: 'All',
  description:
    'Live hydro-meteorological river level telemetry, flood warning radar, and rainfall forecasts for Sri Lankan river basins.',
  spatialCoverage: {
    '@type': 'Place',
    name: 'Sri Lanka',
    geo: {
      '@type': 'GeoShape',
      box: '5.9 79.5 9.9 81.9',
    },
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'LKR',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
