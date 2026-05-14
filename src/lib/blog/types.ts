export type ContentSectionType =
  | 'heading'
  | 'paragraph'
  | 'callout'
  | 'image'
  | 'code'
  | 'list'
  | 'quote'

export type CalloutVariant = 'tip' | 'warning' | 'info' | 'error'

export interface HeadingSection {
  type: 'heading'
  level: 2 | 3
  text: string
}

export interface ParagraphSection {
  type: 'paragraph'
  text: string
}

export interface CalloutSection {
  type: 'callout'
  variant: CalloutVariant
  title: string
  text: string
}

export interface ImageSection {
  type: 'image'
  src: string
  alt: string
  caption?: string
}

export interface CodeSection {
  type: 'code'
  language: string
  code: string
}

export interface ListSection {
  type: 'list'
  ordered: boolean
  items: string[]
}

export interface QuoteSection {
  type: 'quote'
  text: string
  author?: string
}

export type ContentSection =
  | HeadingSection
  | ParagraphSection
  | CalloutSection
  | ImageSection
  | CodeSection
  | ListSection
  | QuoteSection

export interface BlogContent {
  sections: ContentSection[]
}

export interface BlogSEO {
  metaTitle: string
  metaDescription: string
  ogImage?: string
}

export interface BlogPost {
  slug: string
  locale: 'en' | 'fr'
  title: string
  description: string
  publishedAt: string
  updatedAt: string
  readingTime: number
  tags: string[]
  coverImage?: string
  content: BlogContent
  seo: BlogSEO
}