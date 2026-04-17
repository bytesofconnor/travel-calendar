import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const SITE_URL = 'https://heymara.app'
const SITE_NAME = 'HeyMara'
const TITLE = 'HeyMara — Shared Trip Planner for Couples & Travel Partners'
const DESCRIPTION =
  'The simplest shared travel calendar for couples and trip partners. Plan every flight, stay, and adventure together in real time. One calendar, two (or more) people, zero drama.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    'shared trip calendar',
    'couples travel planner',
    'travel calendar for couples',
    'collaborative trip planning',
    'shared vacation calendar',
    'trip planning app for couples',
    'travel itinerary sharing',
    'joint travel planner',
    'couple travel app',
    'shared holiday planner',
    'trip organizer for two',
    'vacation planner for couples',
  ],
  authors: [{ name: 'HeyMara', url: SITE_URL }],
  creator: 'HeyMara',
  publisher: 'HeyMara',
  applicationName: SITE_NAME,
  generator: SITE_NAME,
  referrer: 'origin-when-cross-origin',
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HeyMara — Shared Trip Planner for Couples',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
        creator: '@heymaraapp',
  },
  alternates: {
    canonical: SITE_URL,
  },
  category: 'travel',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description: DESCRIPTION,
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Web, iOS, Android',
    browserRequirements: 'Requires JavaScript',
    inLanguage: 'en',
    offers: {
      '@type': 'Offer',
      price: '9.99',
      priceCurrency: 'USD',
      description: 'Lifetime access — one payment, every trip forever',
    },
    featureList: [
      'Shared trip calendar',
      'Real-time collaboration',
      'Week and month views',
      'Travel itinerary planning',
      'Invite travel partners',
      'Export to calendar apps',
    ],
    audience: {
      '@type': 'Audience',
      audienceType: 'Couples, travel partners, friend groups',
    },
  }

  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="color-scheme" content="dark light" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
