import { describe, it, expect } from 'vitest'
import { PLANS } from '@/lib/plans'

describe('plans', () => {
  describe('PLANS', () => {
    it('should have FREE, PRO, and TEAM plans', () => {
      expect(PLANS.FREE).toBeDefined()
      expect(PLANS.PRO).toBeDefined()
      expect(PLANS.TEAM).toBeDefined()
    })

    describe('FREE plan', () => {
      it('should have correct limits', () => {
        expect(PLANS.FREE.price).toBe(0)
        expect(PLANS.FREE.reportsPerMonth).toBe(3)
        expect(PLANS.FREE.maxSlides).toBe(8)
        expect(PLANS.FREE.watermark).toBe(true)
        expect(PLANS.FREE.formats).toEqual(['PPTX'])
      })
    })

    describe('PRO plan', () => {
      it('should have correct limits', () => {
        expect(PLANS.PRO.price).toBe(19)
        expect(PLANS.PRO.reportsPerMonth).toBe(30)
        expect(PLANS.PRO.maxSlides).toBe(20)
        expect(PLANS.PRO.watermark).toBe(false)
        expect(PLANS.PRO.formats).toEqual(['PPTX', 'PDF', 'DOCX'])
      })
    })

    describe('TEAM plan', () => {
      it('should have correct limits', () => {
        expect(PLANS.TEAM.price).toBe(49)
        expect(PLANS.TEAM.reportsPerMonth).toBe(-1) // unlimited
        expect(PLANS.TEAM.maxSlides).toBe(30)
        expect(PLANS.TEAM.watermark).toBe(false)
        expect(PLANS.TEAM.collaboration).toBe(true)
      })
    })

    it('should have increasing limits from FREE to TEAM', () => {
      expect(PLANS.FREE.reportsPerMonth).toBeLessThan(PLANS.PRO.reportsPerMonth)
      expect(PLANS.PRO.maxSlides).toBeLessThan(PLANS.TEAM.maxSlides)
    })
  })
})
