// ==========================================
// Export Worker Consumption Tests
// ==========================================
//
// Tests the export worker's consumption tracking:
// - consume() is called before export processing (quota check)
// - Export is marked ERROR when quota is exhausted
// - Security validation rejects unauthorized jobs
// - Export status is updated correctly (DONE / ERROR)

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mock variables — ALL must be in vi.hoisted for vi.mock factories
// ---------------------------------------------------------------------------
const mockPrismaExportFindUniqueOrThrow = vi.hoisted(() => vi.fn())
const mockPrismaExportUpdate = vi.hoisted(() => vi.fn())
const mockGeneratePptx = vi.hoisted(() => vi.fn())
const mockGeneratePdf = vi.hoisted(() => vi.fn())
const mockGenerateDocx = vi.hoisted(() => vi.fn())
const mockUploadToR2 = vi.hoisted(() => vi.fn())
const mockExtractSignedJobData = vi.hoisted(() => vi.fn())
const mockConsume = vi.hoisted(() => vi.fn())
const mockGetRedisConnectionAsync = vi.hoisted(() => vi.fn())

const mockLimitReachedError = vi.hoisted(() => {
  return class extends Error {
    constructor(public featureKey: string, public limit: number, public used: number, public resetAt: Date | null) {
      super(`Limit reached for ${featureKey}: ${used}/${limit}`)
      this.name = 'LimitReachedError'
    }
  }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedWorkerProcessFn: ((job: any) => Promise<void>) | null = null
const mockWorkerConstructor = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Mock bullmq — use a class so `new Worker(...)` works
// ---------------------------------------------------------------------------
vi.mock('bullmq', () => {
  class MockWorker {
    constructor(name: string, processFn: (job: unknown) => Promise<void>, opts: unknown) {
      // Forward to spy for assertion tracking
      mockWorkerConstructor(name, processFn, opts)
      capturedWorkerProcessFn = processFn
    }
    on = vi.fn()
    close = vi.fn()
  }
  return { Worker: MockWorker }
})

// ---------------------------------------------------------------------------
// Mock prisma
// ---------------------------------------------------------------------------
vi.mock('@/lib/prisma', () => ({
  prisma: {
    export: {
      findUniqueOrThrow: mockPrismaExportFindUniqueOrThrow,
      update: mockPrismaExportUpdate,
    },
  },
}))

// ---------------------------------------------------------------------------
// Mock exporters
// ---------------------------------------------------------------------------
vi.mock('@/lib/exporters', () => ({
  generatePptx: mockGeneratePptx,
  generatePdf: mockGeneratePdf,
  generateDocx: mockGenerateDocx,
}))

// ---------------------------------------------------------------------------
// Mock R2 upload
// ---------------------------------------------------------------------------
vi.mock('@/lib/r2', () => ({
  uploadToR2: mockUploadToR2,
}))

// ---------------------------------------------------------------------------
// Mock job security
// ---------------------------------------------------------------------------
vi.mock('@/lib/queue/job-security', () => ({
  extractSignedJobData: mockExtractSignedJobData,
}))

// ---------------------------------------------------------------------------
// Mock feature-gate consume and LimitReachedError
// ---------------------------------------------------------------------------
vi.mock('@/lib/entitlements/feature-gate', () => ({
  consume: mockConsume,
  LimitReachedError: mockLimitReachedError,
}))

// ---------------------------------------------------------------------------
// Mock redis
// ---------------------------------------------------------------------------
vi.mock('@/lib/redis', () => ({
  getRedisConnectionAsync: mockGetRedisConnectionAsync,
}))

// ---------------------------------------------------------------------------
// Mock sentry
// ---------------------------------------------------------------------------
vi.mock('@/lib/sentry', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock env
// ---------------------------------------------------------------------------
vi.mock('@/env', () => ({
  env: {
    REDIS_URL: 'redis://localhost:6379',
    REDIS_TLS_ENABLED: 'false',
    REDIS_TLS_REJECT_UNAUTHORIZED: 'false',
  },
}))

// ---------------------------------------------------------------------------
// Import the module under test
// ---------------------------------------------------------------------------
import { getExportWorker } from '@/lib/queue/workers/export.worker'

describe('Export worker consumption tracking', () => {
  // Shared mock export record
  const mockExportRecord = {
    id: 'export-123',
    reportId: 'report-456',
    format: 'PPTX',
    report: {
      title: 'Test Report',
      orgId: 'org-789',
      org: {
        id: 'org-789',
        subscription: { plan: 'PRO' },
        members: [{ userId: 'user-1' }],
      },
      slides: [
        { title: 'Slide 1', layout: 'TITLE_SLIDE', contentJson: '{"text":"Hello"}', speakerNotes: null },
      ],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock: valid signature
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { exportId: 'export-123', format: 'PPTX', userId: 'user-1' },
    })

    // Default mock: valid export record
    mockPrismaExportFindUniqueOrThrow.mockResolvedValue(mockExportRecord)

    // Default mock: successful update
    mockPrismaExportUpdate.mockResolvedValue({ id: 'export-123', status: 'DONE' })

    // Default mock: successful generation
    mockGeneratePptx.mockResolvedValue(Buffer.from('pptx-content'))
    mockUploadToR2.mockResolvedValue(undefined)

    // Default mock: successful consume (quota available)
    mockConsume.mockResolvedValue({ success: true, used: 0, limit: null, featureKey: 'exportsPerMonth', resetAt: null })

    // Default mock: redis connection
    mockGetRedisConnectionAsync.mockResolvedValue({ status: 'ready' })
  })

  // -----------------------------------------------------------------------
  // Worker setup
  // -----------------------------------------------------------------------
  it('should create a Worker with name "export"', async () => {
    const worker = await getExportWorker()

    expect(mockWorkerConstructor).toHaveBeenCalledWith('export', expect.any(Function), expect.any(Object))
    expect(worker).toBeDefined()
  })

  // -----------------------------------------------------------------------
  // Happy path — consume() called before processing successful export
  // -----------------------------------------------------------------------
  it('should call consume() before processing a valid PPTX export', async () => {
    // Arrange
    await getExportWorker()

    // Act
    await capturedWorkerProcessFn!({
      id: 'job-1',
      data: { exportId: 'export-123', format: 'PPTX', userId: 'user-1', signature: 'valid-sig' },
      attemptsMade: 0,
    })

    // Assert
    expect(mockConsume).toHaveBeenCalledWith('org-789', 'exportsPerMonth')
    expect(mockGeneratePptx).toHaveBeenCalledOnce()
    expect(mockUploadToR2).toHaveBeenCalledOnce()
    expect(mockPrismaExportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'export-123' },
        data: expect.objectContaining({ status: 'DONE' }),
      })
    )
  })

  // -----------------------------------------------------------------------
  // consume() called before PDF export
  // -----------------------------------------------------------------------
  it('should call consume() before processing a PDF export', async () => {
    // Arrange
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { exportId: 'export-123', format: 'PDF', userId: 'user-1' },
    })
    mockGeneratePdf.mockResolvedValue(Buffer.from('pdf-content'))

    await getExportWorker()

    // Act
    await capturedWorkerProcessFn!({
      id: 'job-2',
      data: { exportId: 'export-123', format: 'PDF', userId: 'user-1', signature: 'valid-sig' },
      attemptsMade: 0,
    })

    // Assert
    expect(mockConsume).toHaveBeenCalledWith('org-789', 'exportsPerMonth')
    expect(mockGeneratePdf).toHaveBeenCalledOnce()
  })

  // -----------------------------------------------------------------------
  // consume() called before DOCX export
  // -----------------------------------------------------------------------
  it('should call consume() before processing a DOCX export', async () => {
    // Arrange
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { exportId: 'export-123', format: 'DOCX', userId: 'user-1' },
    })
    mockGenerateDocx.mockResolvedValue(Buffer.from('docx-content'))

    await getExportWorker()

    // Act
    await capturedWorkerProcessFn!({
      id: 'job-3',
      data: { exportId: 'export-123', format: 'DOCX', userId: 'user-1', signature: 'valid-sig' },
      attemptsMade: 0,
    })

    // Assert
    expect(mockConsume).toHaveBeenCalledWith('org-789', 'exportsPerMonth')
    expect(mockGenerateDocx).toHaveBeenCalledOnce()
  })

  // -----------------------------------------------------------------------
  // consume() NOT called when job has invalid signature
  // -----------------------------------------------------------------------
  it('should NOT call consume() when job signature is invalid', async () => {
    // Arrange
    mockExtractSignedJobData.mockReturnValue({
      valid: false,
      cleanData: { exportId: 'export-123', format: 'PPTX', userId: 'user-1' },
    })

    await getExportWorker()

    // Act & Assert
    await expect(
      capturedWorkerProcessFn!({
        id: 'job-4',
        data: { exportId: 'export-123', format: 'PPTX', userId: 'user-1', signature: 'invalid' },
        attemptsMade: 0,
      })
    ).rejects.toThrow('Invalid job signature')

    expect(mockConsume).not.toHaveBeenCalled()
    expect(mockGeneratePptx).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // consume() NOT called when membership check fails
  // -----------------------------------------------------------------------
  it('should NOT call consume() when user is not a member of the org', async () => {
    // Arrange
    mockPrismaExportFindUniqueOrThrow.mockResolvedValue({
      ...mockExportRecord,
      report: {
        ...mockExportRecord.report,
        org: {
          ...mockExportRecord.report.org,
          members: [],
        },
      },
    })
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { exportId: 'export-123', format: 'PPTX', userId: 'unauthorized-user' },
    })

    await getExportWorker()

    // Act & Assert
    await expect(
      capturedWorkerProcessFn!({
        id: 'job-5',
        data: { exportId: 'export-123', format: 'PPTX', userId: 'unauthorized-user', signature: 'valid-sig' },
        attemptsMade: 0,
      })
    ).rejects.toThrow('not authorized')

    expect(mockConsume).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Should error export when quota is exhausted
  // -----------------------------------------------------------------------
  it('should set export to ERROR when quota is exhausted', async () => {
    // Arrange — consume throws LimitReachedError
    const limitError = new mockLimitReachedError('exportsPerMonth', 5, 5, new Date())
    mockConsume.mockRejectedValue(limitError)

    await getExportWorker()

    // Act & Assert
    await expect(
      capturedWorkerProcessFn!({
        id: 'job-6',
        data: { exportId: 'export-123', format: 'PPTX', userId: 'user-1', signature: 'valid-sig' },
        attemptsMade: 0,
      })
    ).rejects.toThrow('Export limit reached')

    // Should have updated export to ERROR
    expect(mockPrismaExportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'export-123' },
        data: expect.objectContaining({ status: 'ERROR' }),
      })
    )
    expect(mockGeneratePptx).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // consume() NOT called when exportId is missing
  // -----------------------------------------------------------------------
  it('should NOT call consume() when exportId is missing', async () => {
    // Arrange
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { exportId: null, format: 'PPTX', userId: 'user-1' },
    })

    await getExportWorker()

    // Act & Assert
    await expect(
      capturedWorkerProcessFn!({
        id: 'job-7',
        data: { exportId: null, format: 'PPTX', userId: 'user-1', signature: 'valid-sig' },
        attemptsMade: 0,
      })
    ).rejects.toThrow('missing exportId or userId')

    expect(mockConsume).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Export status is ERROR on generation failure
  // -----------------------------------------------------------------------
  it('should set export status to ERROR when generation fails', async () => {
    // Arrange
    mockGeneratePptx.mockRejectedValue(new Error('Generation failed'))

    await getExportWorker()

    // Act & Assert
    await expect(
      capturedWorkerProcessFn!({
        id: 'job-8',
        data: { exportId: 'export-123', format: 'PPTX', userId: 'user-1', signature: 'valid-sig' },
        attemptsMade: 0,
      })
    ).rejects.toThrow('Generation failed')

    // Export should be marked as ERROR
    expect(mockPrismaExportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'export-123' },
        data: expect.objectContaining({ status: 'ERROR' }),
      })
    )
  })

  // -----------------------------------------------------------------------
  // Unsupported format throws
  // -----------------------------------------------------------------------
  it('should throw for unsupported export format', async () => {
    // Arrange
    mockExtractSignedJobData.mockReturnValue({
      valid: true,
      cleanData: { exportId: 'export-123', format: 'SVG', userId: 'user-1' },
    })

    await getExportWorker()

    // Act & Assert
    await expect(
      capturedWorkerProcessFn!({
        id: 'job-9',
        data: { exportId: 'export-123', format: 'SVG', userId: 'user-1', signature: 'valid-sig' },
        attemptsMade: 0,
      })
    ).rejects.toThrow('Unsupported export format')
  })
})
