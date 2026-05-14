import { getTranslations } from 'next-intl/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { BlogCard } from '@/components/blog/blog-card'
import { BlogHeader } from '@/components/blog/blog-header'
import type { BlogPost } from '@/lib/blog/types'

interface BlogPageProps {
  params: Promise<{ locale: string }>
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = await params
  const t = await getTranslations('blog')

  // Read posts from JSON file
  const dataPath = join(process.cwd(), 'data', 'blog-posts.json')
  let allPosts: BlogPost[] = []

  try {
    const rawData = readFileSync(dataPath, 'utf-8')
    allPosts = JSON.parse(rawData)
  } catch {
    // No posts yet
  }

  // Filter posts by current locale and sort by date
  const posts = allPosts
    .filter((post) => post.locale === locale)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BlogHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 md:py-24 px-6 border-b border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('title')}</h1>
            <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-6xl mx-auto">
            {posts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground">{t('noArticles')}</p>
                <p className="text-sm text-muted-foreground/70 mt-2">{t('noArticlesDesc')}</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => (
                  <BlogCard key={post.slug} post={post} locale={locale} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground text-sm">
          <p>© 2026 DataPresent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}