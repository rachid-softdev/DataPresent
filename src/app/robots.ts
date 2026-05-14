import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://datapresent.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/settings/', '/share/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}