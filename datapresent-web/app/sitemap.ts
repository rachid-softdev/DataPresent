import { MetadataRoute } from 'next'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { BlogPost } from '@/lib/blog/types'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://datapresent.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const blogPosts: MetadataRoute.Sitemap = []
  const locales = ['fr', 'en']

  // Read blog posts
  try {
    const dataPath = join(process.cwd(), 'data', 'blog-posts.json')
    const rawData = readFileSync(dataPath, 'utf-8')
    const posts: BlogPost[] = JSON.parse(rawData)

    posts.forEach((post) => {
      blogPosts.push({
        url: `${BASE_URL}/${post.locale}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: 'monthly',
        priority: post.locale === 'en' ? 0.8 : 0.8,
      })
    })
  } catch {
    // No blog posts yet
  }

  // Dynamic routes with locale-based URLs
  const dynamicRoutes = [
    { path: '', priority: 1, changeFrequency: 'weekly' as const },
    { path: 'blog', priority: 0.8, changeFrequency: 'daily' as const },
    { path: 'login', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: 'signup', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: 'pricing', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: 'dashboard', priority: 0.7, changeFrequency: 'weekly' as const },
  ]

  const sitemapEntries: MetadataRoute.Sitemap = []

  // Add routes for each locale
  locales.forEach((locale) => {
    dynamicRoutes.forEach((route) => {
      sitemapEntries.push({
        url: `${BASE_URL}/${locale}${route.path ? '/' + route.path : ''}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      })
    })
  })

  // Add blog posts
  sitemapEntries.push(...blogPosts)

  // Add hreflang alternates for root
  sitemapEntries.push({
    url: `${BASE_URL}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
    alternates: {
      languages: {
        'fr-FR': `${BASE_URL}/fr`,
        'en-US': `${BASE_URL}/en`,
      },
    },
  })

  return sitemapEntries
}