import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().min(8),

  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  REDIS_URL: z.string().url().optional(),
  REDIS_TLS_ENABLED: z.enum(['true', 'false']).optional().default('false'),
  REDIS_TLS_CA: z.string().optional(),
  REDIS_TLS_REJECT_UNAUTHORIZED: z.enum(['true', 'false']).optional().default('true'),

  JOB_SIGNING_SECRET: z.string().min(32),

  // Stripe price IDs (referenced by compat.ts PLANS object)
  STRIPE_PRICE_STARTER_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_TEAM_MONTHLY: z.string().optional(),

  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),

  GOOGLE_SHEETS_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid worker environment variables:', parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment variables')
}

export const env = parsed.data

export function isFeatureEnabled(feature: 'r2' | 'sentry' | 'redis'): boolean {
  switch (feature) {
    case 'r2':
      return Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY)
    case 'sentry':
      return Boolean(env.SENTRY_DSN)
    case 'redis':
      return Boolean(env.REDIS_URL)
    default:
      return false
  }
}
