import { describe, it, expect } from 'vitest'
import {
  ERROR_CODES,
  SUCCESS_CODES,
  apiError,
  apiSuccess,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
} from '@/lib/errors'

describe('errors', () => {
  describe('ERROR_CODES', () => {
    it('should have all required error codes', () => {
      expect(ERROR_CODES.ERR_AUTH_UNAUTHORIZED).toBe('errors.auth.unauthorized')
      expect(ERROR_CODES.ERR_VALIDATION_INVALID_PASSWORD).toBe('errors.validation.invalidPassword')
      expect(ERROR_CODES.ERR_RESOURCE_EXPIRED).toBe('errors.resource.expired')
    })

    it('should have all validation error codes', () => {
      expect(ERROR_CODES.ERR_VALIDATION_EMAIL_REQUIRED).toBeDefined()
      expect(ERROR_CODES.ERR_VALIDATION_EMAIL_INVALID).toBeDefined()
      expect(ERROR_CODES.ERR_VALIDATION_REQUIRED).toBeDefined()
      expect(ERROR_CODES.ERR_VALIDATION_RATE_LIMIT).toBeDefined()
    })

    it('should have all resource error codes', () => {
      expect(ERROR_CODES.ERR_RESOURCE_NOT_FOUND).toBeDefined()
      expect(ERROR_CODES.ERR_RESOURCE_FORBIDDEN).toBeDefined()
      expect(ERROR_CODES.ERR_RESOURCE_ALREADY_GENERATING).toBeDefined()
    })
  })

  describe('SUCCESS_CODES', () => {
    it('should have all success codes', () => {
      expect(SUCCESS_CODES.MSG_AUTH_MAGIC_SENT).toBeDefined()
      expect(SUCCESS_CODES.MSG_REPORT_GENERATED).toBeDefined()
      expect(SUCCESS_CODES.MSG_REPORT_DELETED).toBeDefined()
    })
  })

  describe('apiError', () => {
    it('should return a NextResponse with the error code and status', () => {
      const response = apiError(ERROR_CODES.ERR_AUTH_UNAUTHORIZED, 401)
      expect(response.status).toBe(401)
    })

    it('should default to status 400', () => {
      const response = apiError(ERROR_CODES.ERR_VALIDATION_REQUIRED)
      expect(response.status).toBe(400)
    })
  })

  describe('unauthorized', () => {
    it('should return 401 with unauthorized error', () => {
      const response = unauthorized()
      expect(response.status).toBe(401)
    })
  })

  describe('forbidden', () => {
    it('should return 403 with forbidden error', () => {
      const response = forbidden()
      expect(response.status).toBe(403)
    })
  })

  describe('notFound', () => {
    it('should return 404 with not found error', () => {
      const response = notFound()
      expect(response.status).toBe(404)
    })

    it('should accept a custom error code', () => {
      const response = notFound(ERROR_CODES.ERR_RESOURCE_MEMBER_NOT_FOUND)
      expect(response.status).toBe(404)
    })
  })

  describe('badRequest', () => {
    it('should return 400 with the given error code', () => {
      const response = badRequest(ERROR_CODES.ERR_VALIDATION_EMAIL_INVALID)
      expect(response.status).toBe(400)
    })
  })
})
