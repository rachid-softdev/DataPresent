'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { type ContentSection, type CalloutVariant } from '@/lib/blog/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, Info, XCircle, Quote } from 'lucide-react'

interface BlogRendererProps {
  sections: ContentSection[]
}

const calloutIcons: Record<CalloutVariant, React.ReactNode> = {
  tip: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
}

const calloutStyles: Record<CalloutVariant, string> = {
  tip: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50',
  warning: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50',
  info: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50',
  error: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50',
}

export function BlogRenderer({ sections }: BlogRendererProps) {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      {sections.map((section, index) => {
        switch (section.type) {
          case 'heading':
            const HeadingTag = `h${section.level}` as keyof JSX.IntrinsicElements
            return (
              <HeadingTag
                key={index}
                className={cn(
                  'scroll-mt-24',
                  section.level === 2
                    ? 'text-2xl md:text-3xl font-bold mt-12 mb-4'
                    : 'text-xl md:text-2xl font-semibold mt-8 mb-3'
                )}
              >
                {section.text}
              </HeadingTag>
            )

          case 'paragraph':
            return (
              <p key={index} className="text-base md:text-lg leading-relaxed mb-4 text-foreground/90">
                {section.text}
              </p>
            )

          case 'callout':
            return (
              <Card
                key={index}
                className={cn('my-6 border-l-4', calloutStyles[section.variant])}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {calloutIcons[section.variant]}
                    </div>
                    <div>
                      <p className="font-semibold mb-1">{section.title}</p>
                      <p className="text-sm text-muted-foreground">{section.text}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )

          case 'image':
            return (
              <figure key={index} className="my-8">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={section.src}
                    alt={section.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 800px"
                  />
                </div>
                {section.caption && (
                  <figcaption className="text-sm text-muted-foreground text-center mt-3">
                    {section.caption}
                  </figcaption>
                )}
              </figure>
            )

          case 'code':
            return (
              <div key={index} className="my-6 rounded-lg overflow-hidden border">
                <div className="bg-muted px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                  {section.language}
                </div>
                <pre className="bg-muted/50 p-4 overflow-x-auto">
                  <code className="text-sm font-mono">{section.code}</code>
                </pre>
              </div>
            )

          case 'list':
            const ListTag = section.ordered ? 'ol' : 'ul'
            return (
              <ListTag
                key={index}
                className={cn(
                  'my-6 ml-6 space-y-2',
                  section.ordered ? 'list-decimal' : 'list-disc'
                )}
              >
                {section.items.map((item, i) => (
                  <li key={i} className="text-base md:text-lg text-foreground/90">
                    {item}
                  </li>
                ))}
              </ListTag>
            )

          case 'quote':
            return (
              <blockquote
                key={index}
                className="my-8 pl-6 border-l-4 border-primary italic"
              >
                <p className="text-lg md:text-xl text-foreground/80 mb-2">
                  <Quote className="w-6 h-6 inline-block mr-2 text-primary/50" />
                  {section.text}
                </p>
                {section.author && (
                  <cite className="text-sm text-muted-foreground not-italic">
                    — {section.author}
                  </cite>
                )}
              </blockquote>
            )

          default:
            return null
        }
      })}
    </div>
  )
}