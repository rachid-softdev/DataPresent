/**
 * Script de génération d'articles de blog par IA
 * Exécute: node scripts/generate-blog-posts.ts
 * Schedule CI: chaque lundi 9h UTC
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'
import { type BlogPost } from '../src/lib/blog/types'

// ============================================================
// Schémas de validation
// ============================================================

const HeadingSectionSchema = z.object({
  type: z.literal('heading'),
  level: z.union([z.literal(2), z.literal(3)]),
  text: z.string(),
})

const ParagraphSectionSchema = z.object({
  type: z.literal('paragraph'),
  text: z.string(),
})

const CalloutSectionSchema = z.object({
  type: z.literal('callout'),
  variant: z.enum(['tip', 'warning', 'info', 'error']),
  title: z.string(),
  text: z.string(),
})

const ImageSectionSchema = z.object({
  type: z.literal('image'),
  src: z.string().url(),
  alt: z.string(),
  caption: z.string().optional(),
})

const CodeSectionSchema = z.object({
  type: z.literal('code'),
  language: z.string(),
  code: z.string(),
})

const ListSectionSchema = z.object({
  type: z.literal('list'),
  ordered: z.boolean(),
  items: z.array(z.string()),
})

const QuoteSectionSchema = z.object({
  type: z.literal('quote'),
  text: z.string(),
  author: z.string().optional(),
})

const ContentSectionSchema = z.discriminatedUnion('type', [
  HeadingSectionSchema,
  ParagraphSectionSchema,
  CalloutSectionSchema,
  ImageSectionSchema,
  CodeSectionSchema,
  ListSectionSchema,
  QuoteSectionSchema,
])

const BlogContentSchema = z.object({
  sections: z.array(ContentSectionSchema),
})

const BlogSEOSchema = z.object({
  metaTitle: z.string(),
  metaDescription: z.string(),
  ogImage: z.string().optional(),
})

const GeneratedPostSchema = z.object({
  slug: z.string(),
  locale: z.enum(['en', 'fr']),
  title: z.string(),
  description: z.string(),
  publishedAt: z.string(),
  updatedAt: z.string(),
  readingTime: z.number().int().min(1),
  tags: z.array(z.string()),
  coverImage: z.string().optional(),
  content: BlogContentSchema,
  seo: BlogSEOSchema,
})

const GeneratedPostsSchema = z.array(GeneratedPostSchema)

// ============================================================
// Thèmes prédéfinis pour la génération
// ============================================================

const BLOG_THEMES = [
  // FR
  "comment automatiser la création de rapports avec l'IA",
  "les meilleures pratiques pour visualiser vos données",
  "comment choisir le bon graphique pour vos données",
  "utiliser l'IA pour analyser vos données en quelques minutes",
  "les erreurs courantes dans la présentation de données",
  "comment créer des présentations impactantes sans être designer",
  "l'avenir de la visualisation de données avec l'IA",
  "guide complet sur les KPIs essentiels pour votre entreprise",
  "comment transformer vos données en story-telling efficace",
  "les avantages de l'automatisation pour les équipes数据分析",
  "best practices for data visualization",
  "how to choose the right chart for your data",
  "using AI to analyze data in minutes",
  "common mistakes in data presentation",
  "how to create impactful presentations without being a designer",
  "the future of data visualization with AI",
  "essential KPIs guide for your business",
  "how to transform data into effective storytelling",
  "advantages of automation for data teams",
  "how to present quarterly results effectively",
]

// ============================================================
// Logique principale
// ============================================================

async function generateBlogPosts(): Promise<void> {
  console.log('🚀 Starting blog post generation...\n')

  // 1. Lire les articles existants
  const dataPath = join(process.cwd(), 'data', 'blog-posts.json')
  let existingPosts: BlogPost[] = []

  try {
    const rawData = readFileSync(dataPath, 'utf-8')
    existingPosts = JSON.parse(rawData)
    console.log(`📖 Found ${existingPosts.length} existing posts`)
  } catch {
    console.log('📖 No existing posts found, starting fresh')
  }

  // 2. Extraire les slugs existants pour éviter les doublons
  const existingSlugs = new Set(existingPosts.map((p) => p.slug))
  console.log(`🔗 Existing slugs: ${existingSlugs.size}\n`)

  // 3. Préparer les prompts pour l'IA
  const usedThemes = new Set<string>()
  const themesToGenerate = BLOG_THEMES.filter((theme) => {
    if (usedThemes.has(theme)) return false
    usedThemes.add(theme)
    return true
  }).slice(0, 2) // On génère 2 articles (1 FR + 1 EN)

  const prompt = buildPrompt(themesToGenerate, existingSlugs)

  console.log('🤖 Calling Anthropic API...\n')

  // 4. Appeler l'API Anthropic
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment')
    process.exit(1)
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content[0]
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Invalid response from Claude')
    }

    // 5. Parser et valider la réponse
    const jsonStr = textContent.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const parsed = JSON.parse(jsonStr)
    const validatedPosts = GeneratedPostsSchema.parse(parsed)

    console.log(`✅ Generated ${validatedPosts.length} new posts`)

    // 6. Merger avec les articles existants
    const allPosts = [...existingPosts, ...validatedPosts]

    // 7. Écrire le fichier JSON
    writeFileSync(dataPath, JSON.stringify(allPosts, null, 2), 'utf-8')
    console.log(`💾 Saved ${allPosts.length} posts to data/blog-posts.json`)

    // 8. Résumé
    console.log('\n📝 New posts:')
    validatedPosts.forEach((post) => {
      console.log(`   - [${post.locale}] ${post.title}`)
      console.log(`     slug: ${post.slug}`)
    })
  } catch (error) {
    console.error('\n❌ Error during generation:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

function buildPrompt(themes: string[], existingSlugs: Set<string>): string {
  const today = new Date().toISOString().split('T')[0]

  return `You are a content writer specialized in B2B SaaS and data presentation.

Your task: Generate 2 blog posts (1 in French, 1 in English) about topics related to DataPresent, a SaaS platform that transforms data into presentations using AI.

## Requirements

- Language: First post in French, second post in English
- Each post MUST use a UNIQUE slug (URL-safe, lowercase, hyphenated). Example: "generer-rapports-ia-5-minutes" (FR) / "generate-ai-reports-5-minutes" (EN)
- Do NOT use these existing slugs: ${Array.from(existingSlugs).join(', ') || 'none'}
- Content should be rich with sections (minimum 5 sections per post)
- Each section must have meaningful content (2-3 paragraphs for paragraphs sections)
- Tags should be relevant (3-6 tags per post)
- metaTitle MUST be less than 60 characters
- metaDescription MUST be less than 160 characters
- Cover images: Use Unsplash URLs when possible. Format: https://images.unsplash.com/photo-{ID}?w=1200&h=630&fit=crop
- publishedAt: ${today}

## Topics to cover
${themes.map((t, i) => `${i + 1}. ${t}`).join('\n')}

## Output Format
Return a JSON array with exactly 2 posts:

\`\`\`json
[
  {
    "slug": "article-slug-in-french",
    "locale": "fr",
    "title": "French title (catchy, under 80 chars)",
    "description": "French description (under 200 chars, engaging)",
    "publishedAt": "${today}",
    "updatedAt": "${today}",
    "readingTime": 5,
    "tags": ["tag1", "tag2", "tag3"],
    "coverImage": "https://images.unsplash.com/...",
    "content": {
      "sections": [
        {
          "type": "paragraph",
          "text": "Paragraph text in French..."
        },
        {
          "type": "heading",
          "level": 2,
          "text": "Section title"
        },
        {
          "type": "callout",
          "variant": "tip|warning|info",
          "title": "Callout title",
          "text": "Callout text"
        },
        {
          "type": "list",
          "ordered": true|false,
          "items": ["item1", "item2"]
        },
        {
          "type": "quote",
          "text": "Quote text",
          "author": "Author name (optional)"
        },
        {
          "type": "code",
          "language": "javascript|python|json|...",
          "code": "code content"
        },
        {
          "type": "image",
          "src": "https://...",
          "alt": "Image description",
          "caption": "Optional caption"
        }
      ]
    },
    "seo": {
      "metaTitle": "SEO title (under 60 chars)",
      "metaDescription": "SEO description (under 160 chars)",
      "ogImage": "https://images.unsplash.com/..."
    }
  },
  {
    "slug": "article-slug-in-english",
    "locale": "en",
    ...
  }
]
\`\`\`

## Writing style
- Professional but accessible
- Include concrete examples and practical tips
- Mention DataPresent naturally when relevant
- Use a mix of section types for visual variety

Start directly with the JSON array, no preamble.`
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  generateBlogPosts()
}

export { generateBlogPosts }