import { z } from 'zod'

/**
 * Environment variable schema
 * This validates all required environment variables at runtime
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().min(1),
  
  // NextAuth
  NEXTAUTH_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  
  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_ID: z.string().min(1).optional(),
  GITHUB_SECRET: z.string().min(1).optional(),
  
  // AI
  ANTHROPIC_API_KEY: z.string().min(40, 'ANTHROPIC_API_KEY must be at least 40 characters'),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  STRIPE_PRO_PRICE_ID: z.string().startsWith('price_').optional(),
  STRIPE_TEAM_PRICE_ID: z.string().startsWith('price_').optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
  
  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  
  // Redis (for BullMQ)
  REDIS_URL: z.string().url().min(1).optional(),
  
  // Email
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  
  // Google Sheets
  GOOGLE_SHEETS_CLIENT_EMAIL: z.string().email().optional(),
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().min(1).optional(),
  
  // Sentry (optional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
  
  // App config
  NEXT_PUBLIC_BASE_URL: z.string().url().optional().default('http://localhost:3000'),
})

export type EnvConfig = z.infer<typeof envSchema>

/**
 * Validated environment variables
 * This will throw on startup if required variables are missing
 */
let validatedEnv: EnvConfig | null = null

/**
 * Validate environment variables and return the config
 * Call this once at application startup
 */
export function validateEnv(): EnvConfig {
  if (validatedEnv) {
    return validatedEnv
  }

  const result = envSchema.safeParse(process.env, {
    errorMap: (issue) => ({
      message: `${issue.path.join('.')}: ${issue.message}`,
    }),
  })

  if (!result.success) {
    const errors = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    
    const error = new Error(
      `\n❌ Environment validation failed:\n${errors}\n\n` +
      `Please check your .env file and ensure all required variables are set.\n` +
      `See .env.example for reference.`
    )
    
    console.error(error.message)
    throw error
  }

  validatedEnv = result.data
  
  // Log successful validation (sanitized)
  console.log('✅ Environment variables validated successfully')
  if (process.env.NODE_ENV === 'production') {
    console.log(`  - Database: ${result.data.DATABASE_URL.split('@')[1]?.split('?')[0] || 'connected'}`)
    console.log(`  - Redis: ${result.data.REDIS_URL ? 'connected' : 'not configured'}`)
    console.log(`  - Stripe: ${result.data.STRIPE_SECRET_KEY ? 'configured' : 'not configured'}`)
    console.log(`  - Sentry: ${result.data.SENTRY_DSN ? 'configured' : 'not configured'}`)
  }

  return validatedEnv
}

/**
 * Get validated environment (throws if not validated)
 */
export function getEnv(): EnvConfig {
  if (!validatedEnv) {
    throw new Error('Environment not validated. Call validateEnv() first.')
  }
  return validatedEnv
}

/**
 * Check if a specific feature is configured
 */
export function isFeatureEnabled(feature: 'stripe' | 'sentry' | 'r2' | 'redis' | 'googleSheets'): boolean {
  const env = getEnv()
  
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

/**
 * Required in production - helper to check critical variables
 */
export function requireEnv(key: keyof EnvConfig): string {
  const env = getEnv()
  const value = env[key]
  
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`)
  }
  
  return value
}