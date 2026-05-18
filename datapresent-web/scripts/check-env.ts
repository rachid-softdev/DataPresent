/**
 * Validate environment variables by importing env.ts
 * Run: npm run check:env
 *
 * Loading order (Next.js standard):
 * 1. .env (base - always loaded)
 * 2. .env.development or .env.production (environment-specific)
 * 3. .env.local or .env.production.local (secrets - highest priority)
 */

import dotenv from 'dotenv'
import path from 'path'

const cwd = process.cwd()

// Determine environment from NODE_ENV or default to development
const nodeEnv = process.env.NODE_ENV || 'development'
console.log(`📋 Environment: ${nodeEnv}`)

// Load .env first (base configuration - shared non-sensitive values)
console.log('  Loading .env (base config)...')
dotenv.config({ path: path.resolve(cwd, '.env') })

// Load environment-specific non-sensitive values
const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development'
console.log(`  Loading ${envFile} (environment-specific)...`)
dotenv.config({ path: path.resolve(cwd, envFile) })

// Load secrets (highest priority - ignored by git)
const localEnvFile = nodeEnv === 'production' ? '.env.production.local' : '.env.local'
console.log(`  Loading ${localEnvFile} (secrets)...`)
dotenv.config({ path: path.resolve(cwd, localEnvFile) })

// Import env.ts to trigger Zod validation
// This will throw if validation fails
const { env: _env } = await import('../env.ts')

console.log('✅ Environment variables are valid')
