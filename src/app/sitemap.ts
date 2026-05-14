import { MetadataRoute } from 'next'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { BlogPost } from '@/lib/blog/types'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://datapresent.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const blogPosts: MetadataRoute.Sitemap = []

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

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/fr`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/en`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/fr/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/en/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    ...blogPosts,
  ]
}