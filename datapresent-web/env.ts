import { z } from 'zod'

const envSchema = z.object({
  // =========================
  // REQUIRED (crash if missing)
  // =========================
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url(),

  // =========================
  // AUTH
  // =========================
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),

  // =========================
  // STRIPE
  // =========================
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  STRIPE_PRICE_STARTER_MONTHLY: z.string().startsWith('price_').optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().startsWith('price_').optional(),
  STRIPE_PRICE_TEAM_MONTHLY: z.string().startsWith('price_').optional(),

  // =========================
  // AI
  // =========================
  ANTHROPIC_API_KEY: z.string().min(8, 'ANTHROPIC_API_KEY must be at least 8 characters'),

  // =========================
  // EMAIL (SMTP - dev)
  // =========================
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // =========================
  // EMAIL (Resend - prod)
  // =========================
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  EMAIL_FROM: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  // =========================
  // COMPANY (facturation)
  // =========================
  COMPANY_NAME: z.string().optional(),
  COMPANY_ADDRESS: z.string().optional(),
  COMPANY_SIREN: z.string().optional(),
  COMPANY_SIRET: z.string().optional(),
  COMPANY_TVA: z.string().optional(),
  COMPANY_CAPITAL: z.string().optional(),
  COMPANY_RCS: z.string().optional(),
  COMPANY_EMAIL: z.string().optional(),

  // =========================
  // STORAGE (Cloudflare R2)
  // =========================
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // =========================
  // REDIS (BullMQ)
  // =========================
  REDIS_URL: z.string().url().optional(),
  REDIS_TLS_ENABLED: z.enum(['true', 'false']).optional().default('false'),
  REDIS_TLS_CA: z.string().optional(),
  REDIS_TLS_REJECT_UNAUTHORIZED: z.enum(['true', 'false']).optional().default('true'),

  // =========================
  // SECURITY
  // =========================
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters'),
  JOB_SIGNING_SECRET: z.string().min(32, 'JOB_SIGNING_SECRET must be at least 32 characters'),
  ALLOWED_ORIGINS: z.string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true // optional
      return val.split(',').every(o => {
        try {
          const url = new URL(o.trim())
          return url.protocol === 'https:' || url.protocol === 'http:'
        } catch {
          return false
        }
      })
    },
    { message: 'ALLOWED_ORIGINS must be a comma-separated list of valid URLs (e.g., https://app.example.com,https://example.com)' }
  ),

  // =========================
  // RATE LIMITING
  // =========================
  RATE_LIMIT_STRATEGY: z.enum(['strict', 'relaxed']).optional().default('strict'),

  // =========================
  // GOOGLE SHEETS (optional)
  // =========================
  GOOGLE_SHEETS_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().optional(),

  // =========================
  // VERCEL
  // =========================
  VERCEL_TOKEN: z.string().optional(),
  VERCEL_OIDC_TOKEN: z.string().optional(),
  VERCEL_ORG_ID: z.string().optional(),
  VERCEL_PROJECT_ID: z.string().optional(),

  // =========================
  // SENTRY (optional)
  // =========================
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment variables')
}

export const env = parsed.data

/**
 * Check if a specific feature is configured
 */
export function isFeatureEnabled(feature: 'stripe' | 'sentry' | 'r2' | 'redis' | 'googleSheets'): boolean {
  switch (feature) {
    case 'stripe':
      return Boolean(env.STRIPE_SECRET_KEY)
    case 'sentry':
      return Boolean(env.SENTRY_DSN)
    case 'r2':
      return Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY)
    case 'redis':
      return Boolean(env.REDIS_URL)
    case 'googleSheets':
      return Boolean(env.GOOGLE_SHEETS_CLIENT_EMAIL && env.GOOGLE_SHEETS_PRIVATE_KEY)
    default:
      return false
  }
}
