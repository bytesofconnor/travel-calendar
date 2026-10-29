import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server'
import { DM_Sans, Instrument_Serif } from 'next/font/google'
import { ConvexClientProvider } from '@/components/convex-client-provider'
import { SkipLink } from '@/components/ds'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'
import './theme-packs.css'

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const SITE_URL = 'https://www.travelcalendar.space'
const SITE_NAME = 'Travel Calendar'
const TITLE = 'Travel Calendar — Shared Trip Planner for Couples & Travel Partners'
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
  authors: [{ name: 'Travel Calendar', url: SITE_URL }],
  creator: 'Travel Calendar',
  publisher: 'Travel Calendar',
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
        alt: 'Travel Calendar — Shared Trip Planner for Couples',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
        creator: '@travelcalendar',
  },
  alternates: {
    canonical: SITE_URL,
  },
  category: 'travel',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    shortcut: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: "Together",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1c1f27' },
    { media: '(prefers-color-scheme: dark)', color: '#16181e' },
  ],
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
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="color-scheme" content="light dark" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
        <body className={`${instrumentSerif.variable} ${dmSans.variable} font-sans antialiased`}>
          <SkipLink href="#main-content" />
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <ConvexClientProvider>
              {children}
            </ConvexClientProvider>
          </ThemeProvider>
          {process.env.NODE_ENV === 'production' && <Analytics />}
          {process.env.NODE_ENV === 'production' && <SpeedInsights />}
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  )
}
