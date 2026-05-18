import { NextResponse } from 'next/server'

export const ERROR_CODES = {
  ERR_AUTH_UNAUTHORIZED: 'errors.auth.unauthorized',
  ERR_AUTH_INVALID_TOKEN: 'errors.auth.invalidToken',
  ERR_AUTH_TOKEN_EXPIRED: 'errors.auth.tokenExpired',
  ERR_AUTH_TOKEN_USED: 'errors.auth.tokenUsed',
  ERR_AUTH_FAILED: 'errors.auth.failed',
  
  ERR_VALIDATION_EMAIL_REQUIRED: 'errors.validation.emailRequired',
  ERR_VALIDATION_EMAIL_INVALID: 'errors.validation.emailInvalid',
  ERR_VALIDATION_REQUIRED: 'errors.validation.required',
  ERR_VALIDATION_SLUG_REQUIRED: 'errors.validation.slugRequired',
  ERR_VALIDATION_SLUG_TAKEN: 'errors.validation.slugTaken',
  ERR_VALIDATION_RATE_LIMIT: 'errors.validation.rateLimit',
  ERR_VALIDATION_COMMENT_REQUIRED: 'errors.validation.commentRequired',
  ERR_VALIDATION_FILE_REQUIRED: 'errors.validation.fileRequired',
  ERR_VALIDATION_INVALID_PLAN: 'errors.validation.invalidPlan',
  ERR_VALIDATION_INVALID_PASSWORD: 'errors.validation.invalidPassword',
  ERR_VALIDATION_FORMAT_NOT_ALLOWED: 'errors.validation.formatNotAllowed',
  
  ERR_RESOURCE_NOT_FOUND: 'errors.resource.notFound',
  ERR_RESOURCE_FORBIDDEN: 'errors.resource.forbidden',
  ERR_RESOURCE_MEMBER_NOT_FOUND: 'errors.resource.memberNotFound',
  ERR_RESOURCE_ALREADY_MEMBER: 'errors.resource.alreadyMember',
  ERR_RESOURCE_OWNER_DELETE: 'errors.resource.ownerDelete',
  ERR_RESOURCE_NO_ORGANIZATION: 'errors.resource.noOrganization',
  ERR_RESOURCE_NO_SUBSCRIPTION: 'errors.resource.noSubscription',
  ERR_RESOURCE_ALREADY_GENERATING: 'errors.resource.alreadyGenerating',
  ERR_RESOURCE_NO_SOURCE_FILE: 'errors.resource.noSourceFile',
  ERR_RESOURCE_INVALID_SIGNATURE: 'errors.resource.invalidSignature',
  ERR_RESOURCE_EXPIRED: 'errors.resource.expired',
} as const

export const SUCCESS_CODES = {
  MSG_AUTH_MAGIC_SENT: 'messages.auth.magicSent',
  MSG_AUTH_SIGNUP_SUCCESS: 'messages.auth.signupSuccess',
  MSG_REPORT_GENERATED: 'messages.reports.generated',
  MSG_REPORT_DELETED: 'messages.reports.deleted',
  MSG_REPORT_EXPORTED: 'messages.reports.exported',
  MSG_PROFILE_UPDATED: 'messages.settings.profileUpdated',
  MSG_ORGANIZATION_CREATED: 'messages.settings.organizationCreated',
  MSG_MEMBER_INVITED: 'messages.settings.memberInvited',
  MSG_MEMBER_REMOVED: 'messages.settings.memberRemoved',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]
export type SuccessCode = typeof SUCCESS_CODES[keyof typeof SUCCESS_CODES]

export function apiError(code: ErrorCode, status: number = 400): NextResponse {
  return NextResponse.json({ error: code }, { status })
}

export function apiSuccess(code: SuccessCode, data?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ message: code, ...data })
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: ERROR_CODES.ERR_AUTH_UNAUTHORIZED }, { status: 401 })
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: ERROR_CODES.ERR_RESOURCE_FORBIDDEN }, { status: 403 })
}

export function notFound(code: ErrorCode = ERROR_CODES.ERR_RESOURCE_NOT_FOUND): NextResponse {
  return NextResponse.json({ error: code }, { status: 404 })
}

export function badRequest(code: ErrorCode): NextResponse {
  return NextResponse.json({ error: code }, { status: 400 })
}