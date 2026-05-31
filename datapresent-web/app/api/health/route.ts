import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedisConnectionAsync } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: { database: string; redis: string } = {
    database: 'unknown',
    redis: 'unknown',
  }

  // Check database
  try {
    await prisma.$queryRaw<unknown>`SELECT 1`
    checks.database = 'ok'
  } catch (error) {
    console.error('[health] Database check failed:', error)
    checks.database = 'error'
  }

  // Check Redis
  try {
    const redis = await getRedisConnectionAsync()
    if (redis) {
      await redis.ping()
      checks.redis = 'ok'
    } else {
      checks.redis = 'unavailable'
    }
  } catch (error) {
    console.error('[health] Redis check failed:', error)
    checks.redis = 'error'
  }

  const allOk = checks.database === 'ok' && checks.redis === 'ok'

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  )
}
