// ==========================================
// Plan Utils Tests
// ==========================================

import { describe, it, expect, vi } from 'vitest'

// Mock prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  report: {
    count: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

describe('plan-utils', () => {
  it('should export canUseFormat function', async () => {
    const { canUseFormat } = await import('@/lib/plan-utils')
    expect(canUseFormat).toBeDefined()
  })

  it('should check format permissions correctly', async () => {
    const { canUseFormat } = await import('@/lib/plan-utils')

    expect(canUseFormat('FREE', 'PPTX')).toBe(true)
    expect(canUseFormat('FREE', 'PDF')).toBe(false)
    expect(canUseFormat('FREE', 'DOCX')).toBe(false)
    expect(canUseFormat('PRO', 'PDF')).toBe(true)
    expect(canUseFormat('PRO', 'DOCX')).toBe(true)
    expect(canUseFormat('TEAM', 'PPTX')).toBe(true)
  })

  it('should export canHaveSlideCount function', async () => {
    const { canHaveSlideCount } = await import('@/lib/plan-utils')
    expect(canHaveSlideCount).toBeDefined()
  })

  it('should check slide count limits', async () => {
    const { canHaveSlideCount } = await import('@/lib/plan-utils')

    // FREE: maxSlides = 8
    expect(canHaveSlideCount('FREE', 5).allowed).toBe(true)
    expect(canHaveSlideCount('FREE', 8).allowed).toBe(true)
    expect(canHaveSlideCount('FREE', 9).allowed).toBe(false)
    expect(canHaveSlideCount('FREE', 9).maxSlides).toBe(8)

    // PRO: maxSlides = 20
    expect(canHaveSlideCount('PRO', 20).allowed).toBe(true)
    expect(canHaveSlideCount('PRO', 21).allowed).toBe(false)

    // TEAM: maxSlides = 30
    expect(canHaveSlideCount('TEAM', 30).allowed).toBe(true)

    // AGENCY: unlimited (-1)
    const agency = canHaveSlideCount('AGENCY', 999999)
    expect(agency.allowed).toBe(true)
    expect(agency.maxSlides).toBe(-1)
  })

  it('should export getUserPlan function', async () => {
    const { getUserPlan } = await import('@/lib/plan-utils')
    expect(getUserPlan).toBeDefined()
  })

  it('should return FREE plan when user has no membership', async () => {
    const { getUserPlan } = await import('@/lib/plan-utils')

    mockPrisma.user.findUnique.mockResolvedValue(null)

    const result = await getUserPlan('user-123')

    expect(result.plan).toBe('FREE')
    expect(result.orgId).toBe('')
  })

  it('should return plan from subscription', async () => {
    const { getUserPlan } = await import('@/lib/plan-utils')

    mockPrisma.user.findUnique.mockResolvedValue({
      membership: [
        {
          orgId: 'org-1',
          org: {
            subscription: { plan: 'PRO' },
          },
        },
      ],
    })

    const result = await getUserPlan('user-123')

    expect(result.plan).toBe('PRO')
    expect(result.orgId).toBe('org-1')
  })

  it('should export canCreateReport function', async () => {
    const { canCreateReport } = await import('@/lib/plan-utils')
    expect(canCreateReport).toBeDefined()
  })

  it('should allow report creation when under limit', async () => {
    const { canCreateReport } = await import('@/lib/plan-utils')

    mockPrisma.user.findUnique.mockResolvedValue({
      membership: [
        {
          orgId: 'org-1',
          org: {
            subscription: { plan: 'PRO' },
          },
        },
      ],
    })
    mockPrisma.report.count.mockResolvedValue(5)

    const result = await canCreateReport('user-123')

    expect(result.allowed).toBe(true)
  })

  it('should deny report creation when at limit', async () => {
    const { canCreateReport } = await import('@/lib/plan-utils')

    mockPrisma.user.findUnique.mockResolvedValue({
      membership: [
        {
          orgId: 'org-1',
          org: {
            subscription: { plan: 'FREE' },
          },
        },
      ],
    })
    mockPrisma.report.count.mockResolvedValue(3) // FREE has 3 limit

    const result = await canCreateReport('user-123')

    expect(result.allowed).toBe(false)
    expect(result.upgrade).toBe(true)
    expect(result.reason).toContain('3')
  })

  it('should allow unlimited reports for -1 limit plans', async () => {
    const { canCreateReport } = await import('@/lib/plan-utils')

    mockPrisma.user.findUnique.mockResolvedValue({
      membership: [
        {
          orgId: 'org-1',
          org: {
            subscription: { plan: 'AGENCY' },
          },
        },
      ],
    })

    const result = await canCreateReport('user-123')

    expect(result.allowed).toBe(true)
  })

  it('should export getRemainingReports function', async () => {
    const { getRemainingReports } = await import('@/lib/plan-utils')
    expect(getRemainingReports).toBeDefined()
  })

  it('should return -1 for unlimited plans', async () => {
    const { getRemainingReports } = await import('@/lib/plan-utils')

    mockPrisma.user.findUnique.mockResolvedValue({
      membership: [
        {
          orgId: 'org-1',
          org: {
            subscription: { plan: 'AGENCY' },
          },
        },
      ],
    })

    const result = await getRemainingReports('user-123')

    expect(result.remaining).toBe(-1)
    expect(result.total).toBe(-1)
  })
})
