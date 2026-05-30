// ==========================================
// CSRF Token API Endpoint Tests
// ==========================================
//
// Tests the /api/csrf-token route handler:
// - Token generation returns valid CSRF token
// - Bound/unbound to user session
// - Different tokens each call
// - Error handling

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock next/server
// ---------------------------------------------------------------------------
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: object, init?: ResponseInit) => {
      const headers = new Headers(init?.headers)
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers,
      })
    }),
  },
  NextRequest: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock next/headers (required by csrf.ts → cookies())
// ---------------------------------------------------------------------------
const { mockCookies } = vi.hoisted(() => ({
  mockCookies: {
    get: vi.fn(),
  },
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookies),
}))

// ---------------------------------------------------------------------------
// Mock auth
// ---------------------------------------------------------------------------
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { GET } from '@/app/api/csrf-token/route'
import { validateCsrfToken } from '@/lib/security/csrf'
import { auth } from '@/lib/auth'

describe('CSRF Token API - GET /api/csrf-token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a valid CSRF token in the response', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('token')
    expect(typeof data.token).toBe('string')

    // Token should be validatable
    const isValid = await validateCsrfToken(data.token)
    expect(isValid).toBe(true)
  })

  it('should generate a token that can be validated without userId binding', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    // Validate without userId
    const isValid = await validateCsrfToken(data.token)
    expect(isValid).toBe(true)
  })

  it('should bind token to session user when authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400).toISOString(),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(typeof data.token).toBe('string')

    // Validate WITH matching userId
    const isValid = await validateCsrfToken(data.token, 'user-123')
    expect(isValid).toBe(true)
  })

  it('should generate different tokens on each call', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const response1 = await GET()
    const data1 = await response1.json()

    const response2 = await GET()
    const data2 = await response2.json()

    expect(data1.token).not.toBe(data2.token)
  })

  it('should generate different tokens for different users', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-alice', email: 'alice@example.com' },
      expires: new Date(Date.now() + 86400).toISOString(),
    })
    const responseAlice = await GET()
    const dataAlice = await responseAlice.json()

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-bob', email: 'bob@example.com' },
      expires: new Date(Date.now() + 86400).toISOString(),
    })
    const responseBob = await GET()
    const dataBob = await responseBob.json()

    expect(dataAlice.token).not.toBe(dataBob.token)
  })

  it('should return 500 when auth throws an error', async () => {
    vi.mocked(auth).mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toHaveProperty('error')
    expect(data.error).toBe('Failed to generate token')
  })
})
