import { Metadata } from 'next'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { BlogPost } from '@/lib/blog/types'

interface MetadataProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { locale, slug } = await params

  const dataPath = join(process.cwd(), 'data', 'blog-posts.json')
  let allPosts: BlogPost[] = []

  try {
    const rawData = readFileSync(dataPath, 'utf-8')
    allPosts = JSON.parse(rawData)
  } catch {
    return {
      title: 'Blog | DataPresent',
      description: 'Latest news, tips and insights about data presentation',
    }
  }

  const post = allPosts.find((p) => p.slug === slug && p.locale === locale)

  if (!post) {
    return {
      title: 'Blog | DataPresent',
      description: 'Latest news, tips and insights about data presentation',
    }
  }

  return {
    title: post.seo.metaTitle,
    description: post.seo.metaDescription,
    openGraph: {
      title: post.seo.metaTitle,
      description: post.seo.metaDescription,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: ['DataPresent'],
      tags: post.tags,
      images: post.seo.ogImage ? [{ url: post.seo.ogImage, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seo.metaTitle,
      description: post.seo.metaDescription,
      images: post.seo.ogImage ? [post.seo.ogImage] : [],
    },
    alternates: {
      canonical: `/${locale}/blog/${slug}`,
    },
  }
}