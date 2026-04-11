import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://ourcalendar.space/sitemap.xml',
    host: 'https://ourcalendar.space',
  }
}
