'use client'

import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { Clock, Tag } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type BlogPost } from '@/lib/blog/types'

interface BlogCardProps {
  post: BlogPost
  locale: string
}

export function BlogCard({ post, locale }: BlogCardProps) {
  const dateLocale = locale === 'fr' ? fr : enUS
  const formattedDate = format(new Date(post.publishedAt), 'd MMMM yyyy', {
    locale: dateLocale,
  })

  return (
    <Link href={`/${locale}/blog/${post.slug}`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        {/* Cover Image */}
        {post.coverImage && (
          <div className="relative aspect-[16/9] overflow-hidden bg-muted">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        <CardContent className="flex-1 pt-6">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground text-sm line-clamp-3">
            {post.description}
          </p>
        </CardContent>

        <CardFooter className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{post.readingTime} min</span>
          </div>
          <time dateTime={post.publishedAt}>{formattedDate}</time>
        </CardFooter>
      </Card>
    </Link>
  )
}