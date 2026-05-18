// ==========================================
// Org Tests
// ==========================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma using vi.hoisted
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    membership: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

describe('org', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export ensureUserHasOrganization function', async () => {
    const module = await import('@/lib/org')
    expect(module.ensureUserHasOrganization).toBeDefined()
  })

  it('should return existing org id if user already has membership', async () => {
    const { ensureUserHasOrganization } = await import('@/lib/org')

    mockPrisma.membership.findFirst.mockResolvedValue({
      orgId: 'existing-org-id',
    })

    const result = await ensureUserHasOrganization('user-123', 'test@example.com')

    expect(result).toBe('existing-org-id')
    expect(mockPrisma.membership.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
    })
    expect(mockPrisma.organization.create).not.toHaveBeenCalled()
  })

  it('should create new organization if user has no membership', async () => {
    const { ensureUserHasOrganization } = await import('@/lib/org')

    mockPrisma.membership.findFirst.mockResolvedValue(null)
    mockPrisma.organization.findUnique.mockResolvedValue(null)
    mockPrisma.organization.create.mockResolvedValue({
      id: 'new-org-id',
    })

    const result = await ensureUserHasOrganization('user-123', 'testuser@example.com')

    expect(result).toBe('new-org-id')
    expect(mockPrisma.organization.create).toHaveBeenCalled()
  })

  it('should export getUserOrganizations function', async () => {
    const module = await import('@/lib/org')
    expect(module.getUserOrganizations).toBeDefined()
  })

  it('should return user organizations with plan info', async () => {
    const { getUserOrganizations } = await import('@/lib/org')

    mockPrisma.membership.findMany.mockResolvedValue([
      {
        org: {
          id: 'org-1',
          name: 'Org 1',
          slug: 'org-1',
          subscription: { plan: 'PRO' },
          _count: { reports: 5, members: 3 },
        },
        role: 'OWNER',
      },
    ])

    const result = await getUserOrganizations('user-123')

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 'org-1',
      name: 'Org 1',
      slug: 'org-1',
      role: 'OWNER',
      plan: 'PRO',
      reportCount: 5,
      memberCount: 3,
    })
  })
})
