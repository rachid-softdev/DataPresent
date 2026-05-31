// ==========================================
// Health Check Endpoint Tests
// ==========================================
//
// Tests the /api/health GET endpoint:
// - Returns 200 when DB and Redis are both OK
// - Returns 503 when DB or Redis is degraded
// - Reports individual check statuses

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock variables (must use vi.hoisted)
// ---------------------------------------------------------------------------
const mockQueryRaw = vi.hoisted(() => vi.fn())
const mockRedisPing = vi.hoisted(() => vi.fn())
const mockGetRedisConnectionAsync = vi.hoisted(() => vi.fn())
const mockJson = vi.hoisted(() => vi.fn())

vi.mock('next/server', () => ({
  NextResponse: {
    json: mockJson,
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}))

vi.mock('@/lib/redis', () => ({
  getRedisConnectionAsync: mockGetRedisConnectionAsync,
}))

// ---------------------------------------------------------------------------
// Import the module under test
// ---------------------------------------------------------------------------
import { GET } from '@/app/api/health/route'

describe('Health check endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mockJson to return a Response
    mockJson.mockImplementation((body: object, init?: ResponseInit) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: new Headers(init?.headers),
      })
    })
  })

  // -----------------------------------------------------------------------
  // All systems OK → 200
  // -----------------------------------------------------------------------
  it('should return 200 when database and redis are both OK', async () => {
    // Arrange
    mockQueryRaw.mockResolvedValue([{ '1': 1 }])
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: mockRedisPing.mockResolvedValue('PONG'),
    })

    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.status).toBe('ok')
    expect(data.checks.database).toBe('ok')
    expect(data.checks.redis).toBe('ok')
    expect(data.timestamp).toBeDefined()
  })

  // -----------------------------------------------------------------------
  // Database down → 503
  // -----------------------------------------------------------------------
  it('should return 503 when database check fails', async () => {
    // Arrange
    mockQueryRaw.mockRejectedValue(new Error('DB connection refused'))
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: mockRedisPing.mockResolvedValue('PONG'),
    })

    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    expect(response.status).toBe(503)
    expect(data.status).toBe('degraded')
    expect(data.checks.database).toBe('error')
    expect(data.checks.redis).toBe('ok')
  })

  // -----------------------------------------------------------------------
  // Redis down → 503
  // -----------------------------------------------------------------------
  it('should return 503 when redis check fails', async () => {
    // Arrange
    mockQueryRaw.mockResolvedValue([{ '1': 1 }])
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: mockRedisPing.mockRejectedValue(new Error('Redis connection refused')),
    })

    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    expect(response.status).toBe(503)
    expect(data.status).toBe('degraded')
    expect(data.checks.database).toBe('ok')
    expect(data.checks.redis).toBe('error')
  })

  // -----------------------------------------------------------------------
  // Redis unavailable (null) → 503
  // -----------------------------------------------------------------------
  it('should return 503 when redis is unavailable (null connection)', async () => {
    // Arrange
    mockQueryRaw.mockResolvedValue([{ '1': 1 }])
    mockGetRedisConnectionAsync.mockResolvedValue(null)

    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    expect(response.status).toBe(503)
    expect(data.status).toBe('degraded')
    expect(data.checks.database).toBe('ok')
    expect(data.checks.redis).toBe('unavailable')
  })

  // -----------------------------------------------------------------------
  // Both down → 503
  // -----------------------------------------------------------------------
  it('should return 503 when both database and redis are down', async () => {
    // Arrange
    mockQueryRaw.mockRejectedValue(new Error('DB down'))
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: mockRedisPing.mockRejectedValue(new Error('Redis down')),
    })

    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    expect(response.status).toBe(503)
    expect(data.status).toBe('degraded')
    expect(data.checks.database).toBe('error')
    expect(data.checks.redis).toBe('error')
  })

  // -----------------------------------------------------------------------
  // Response shape validation
  // -----------------------------------------------------------------------
  it('should return the correct response shape', async () => {
    // Arrange
    mockQueryRaw.mockResolvedValue([{ '1': 1 }])
    mockGetRedisConnectionAsync.mockResolvedValue({
      ping: mockRedisPing.mockResolvedValue('PONG'),
    })

    // Act
    const response = await GET()
    const data = await response.json()

    // Assert
    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('checks')
    expect(data.checks).toHaveProperty('database')
    expect(data.checks).toHaveProperty('redis')
    expect(data).toHaveProperty('timestamp')
    expect(typeof data.timestamp).toBe('string')
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp)
  })
})
