import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { readFileSync } from 'fs'
import { join } from 'path'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, Calendar, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BlogRenderer } from '@/components/blog/blog-renderer'
import { BlogHeader } from '@/components/blog/blog-header'
import type { BlogPost } from '@/lib/blog/types'
import { ShareButton } from './share-button'
import { generateMetadata } from './metadata'

interface ArticlePageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams() {
  const dataPath = join(process.cwd(), 'data', 'blog-posts.json')

  try {
    const rawData = readFileSync(dataPath, 'utf-8')
    const posts: BlogPost[] = JSON.parse(rawData)

    return posts.map((post) => ({
      locale: post.locale,
      slug: post.slug,
    }))
  } catch {
    return []
  }
}

export async function generateMetadataWrapper(props: ArticlePageProps) {
  const { locale, slug } = await props.params
  return generateMetadata({ locale, slug })
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { locale, slug } = await params
  const t = await getTranslations('blog')

  // Read posts from JSON file
  const dataPath = join(process.cwd(), 'data', 'blog-posts.json')
  let allPosts: BlogPost[] = []

  try {
    const rawData = readFileSync(dataPath, 'utf-8')
    allPosts = JSON.parse(rawData)
  } catch {
    // No posts
  }

  // Find the post
  const post = allPosts.find((p) => p.slug === slug && p.locale === locale)

  if (!post) {
    notFound()
  }

  const dateLocale = locale === 'fr' ? fr : enUS
  const formattedDate = format(new Date(post.publishedAt), 'd MMMM yyyy', {
    locale: dateLocale,
  })

  // Get related posts (same locale, different slug)
  const relatedPosts = allPosts
    .filter((p) => p.locale === locale && p.slug !== slug)
    .slice(0, 3)

  // JSON-LD Structured Data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: post.coverImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: 'DataPresent' },
    publisher: {
      '@type': 'Organization',
      name: 'DataPresent',
      logo: { '@type': 'ImageObject', url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://datapresent.com'}/logo.png` }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${process.env.NEXT_PUBLIC_BASE_URL || 'https://datapresent.com'}/${locale}/blog/${slug}`
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogHeader />

      <main className="flex-1">
        {/* Article Header */}
        <header className="border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
            {/* Back link */}
            <Link
              href={`/${locale}/blog`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('back')}
            </Link>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              {post.description}
            </p>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <time dateTime={post.publishedAt}>
                  {t('publishedOn')} {formattedDate}
                </time>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.readingTime} {t('minRead')}</span>
              </div>
              <ShareButton title={post.title} locale={locale} />
            </div>
          </div>
        </header>

        {/* Cover Image */}
        {post.coverImage && (
          <div className="relative aspect-[21/9] max-w-5xl mx-auto w-full px-6">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover rounded-lg"
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
          </div>
        )}

        {/* Article Content */}
        <article className="max-w-3xl mx-auto px-6 py-12 md:py-16">
          <BlogRenderer sections={post.content.sections} />
        </article>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="border-t border-border py-12 md:py-16 px-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-8">{t('relatedArticles')}</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.slug}
                    href={`/${locale}/blog/${relatedPost.slug}`}
                    className="group"
                  >
                    {relatedPost.coverImage && (
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-4">
                        <Image
                          src={relatedPost.coverImage}
                          alt={relatedPost.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </div>
                    )}
                    <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                      {relatedPost.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {relatedPost.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground text-sm">
          <p>© 2026 DataPresent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}