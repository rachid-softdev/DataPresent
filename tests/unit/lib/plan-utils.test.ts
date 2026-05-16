import { describe, it, expect, vi, beforeEach } from 'vitest'
import { canUseFormat, canHaveSlideCount } from '@/lib/plan-utils'
import { PLANS } from '@/lib/plans'

// Mock prisma - we'll test sync functions mainly
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    report: {
      count: vi.fn(),
    },
  },
}))

describe('plan-utils', () => {
  describe('canUseFormat', () => {
    it('should allow PPTX for FREE plan', () => {
      expect(canUseFormat('FREE', 'PPTX')).toBe(true)
    })

    it('should not allow PDF for FREE plan', () => {
      expect(canUseFormat('FREE', 'PDF')).toBe(false)
    })

    it('should not allow DOCX for FREE plan', () => {
      expect(canUseFormat('FREE', 'DOCX')).toBe(false)
    })

    it('should allow all formats for PRO plan', () => {
      expect(canUseFormat('PRO', 'PPTX')).toBe(true)
      expect(canUseFormat('PRO', 'PDF')).toBe(true)
      expect(canUseFormat('PRO', 'DOCX')).toBe(true)
    })

    it('should allow all formats for TEAM plan', () => {
      expect(canUseFormat('TEAM', 'PPTX')).toBe(true)
      expect(canUseFormat('TEAM', 'PDF')).toBe(true)
      expect(canUseFormat('TEAM', 'DOCX')).toBe(true)
    })

    it('should allow all formats for AGENCY plan', () => {
      expect(canUseFormat('AGENCY', 'PPTX')).toBe(true)
      expect(canUseFormat('AGENCY', 'PDF')).toBe(true)
      expect(canUseFormat('AGENCY', 'DOCX')).toBe(true)
    })

    it('should handle invalid format gracefully', () => {
      expect(canUseFormat('FREE', 'INVALID')).toBe(false)
    })
  })

  describe('canHaveSlideCount', () => {
    describe('FREE plan', () => {
      it('should allow 8 slides (max)', () => {
        const result = canHaveSlideCount('FREE', 8)
        expect(result.allowed).toBe(true)
        expect(result.maxSlides).toBe(8)
      })

      it('should not allow more than 8 slides', () => {
        const result = canHaveSlideCount('FREE', 9)
        expect(result.allowed).toBe(false)
        expect(result.maxSlides).toBe(8)
      })

      it('should allow less than max', () => {
        const result = canHaveSlideCount('FREE', 5)
        expect(result.allowed).toBe(true)
      })
    })

    describe('PRO plan', () => {
      it('should allow up to 20 slides', () => {
        const result = canHaveSlideCount('PRO', 20)
        expect(result.allowed).toBe(true)
        expect(result.maxSlides).toBe(20)
      })

      it('should not allow more than 20 slides', () => {
        const result = canHaveSlideCount('PRO', 21)
        expect(result.allowed).toBe(false)
      })
    })

    describe('TEAM plan', () => {
      it('should allow up to 30 slides', () => {
        const result = canHaveSlideCount('TEAM', 30)
        expect(result.allowed).toBe(true)
        expect(result.maxSlides).toBe(30)
      })

      it('should not allow more than 30 slides', () => {
        const result = canHaveSlideCount('TEAM', 31)
        expect(result.allowed).toBe(false)
      })
    })

    describe('AGENCY plan', () => {
      it('should allow unlimited slides (returns maxSlides as -1)', () => {
        const result = canHaveSlideCount('AGENCY', 1000)
        expect(result.allowed).toBe(true)
        expect(result.maxSlides).toBe(-1)
      })
    })
  })

  describe('PLANS configuration consistency', () => {
    it('FREE should have watermark', () => {
      expect(PLANS.FREE.watermark).toBe(true)
    })

    it('PRO should not have watermark', () => {
      expect(PLANS.PRO.watermark).toBe(false)
    })

    it('TEAM should have collaboration', () => {
      expect(PLANS.TEAM.collaboration).toBe(true)
    })

    it('AGENCY should have all premium features', () => {
      expect(PLANS.AGENCY.whiteLabel).toBe(true)
      expect(PLANS.AGENCY.apiAccess).toBe(true)
      expect(PLANS.AGENCY.prioritySupport).toBe(true)
      expect(PLANS.AGENCY.customDomain).toBe(true)
      expect(PLANS.AGENCY.reportsPerMonth).toBe(-1) // unlimited
      expect(PLANS.AGENCY.maxSlides).toBe(-1) // unlimited
    })

    it('AGENCY should have no stripe price ID', () => {
      expect(PLANS.AGENCY.stripePriceId).toBeNull()
    })
  })
})