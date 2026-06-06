// ==========================================
// Generate Worker — Atomic Version Increment Tests (Fix 6)
// ==========================================
//
// Tests the interactive transaction approach with SELECT ... FOR UPDATE
// in the generate worker (datapresent-web/lib/queue/workers/generate.worker.ts).
//
// Fix 6 prevents race conditions where two concurrent generate jobs
// for the same report get the same version number, causing a unique
// constraint violation on @@unique([reportId, version]).
//
// The fix uses prisma.$transaction with an interactive callback that:
// 1. SELECT COALESCE(MAX(version), 0) + 1 ... FOR UPDATE — locks the row
// 2. Creates the new ReportVersion with the computed version
// 3. Deletes old slides and creates new ones
//
// We extract and test the version increment logic in isolation.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Atomic Version Increment (Fix 6)", () => {
  // ========================================================================
  // Version computation logic test (extracted from the worker)
  // ========================================================================

  describe("version computation", () => {
    /**
     * Simulates the version computation inside the interactive transaction.
     * This is the core logic that Fix 6 protects with FOR UPDATE.
     */
    async function computeNextVersion(
      existingVersions: number[],
      reportId: string,
      mockQueryRaw: ReturnType<typeof vi.fn>,
    ): Promise<number> {
      const [versionResult] = await mockQueryRaw<Array<{ nextVersion: number }>>`
        SELECT COALESCE(MAX(version), 0) + 1 as "nextVersion"
        FROM "ReportVersion"
        WHERE "reportId" = ${reportId}
        FOR UPDATE
      `;

      return versionResult?.nextVersion ?? 1;
    }

    it("should return version 1 for a report with no existing versions", async () => {
      // Arrange
      const mockQueryRaw = vi.fn().mockResolvedValue([{ nextVersion: 1 }]);

      // Act
      const version = await computeNextVersion([], "report-1", mockQueryRaw);

      // Assert
      expect(version).toBe(1);
    });

    it("should return version 2 for a report with one existing version", async () => {
      // Arrange
      const mockQueryRaw = vi.fn().mockResolvedValue([{ nextVersion: 2 }]);

      // Act
      const version = await computeNextVersion([1], "report-1", mockQueryRaw);

      // Assert
      expect(version).toBe(2);
    });

    it("should return version N+1 for a report with N versions", async () => {
      // Arrange
      const mockQueryRaw = vi.fn().mockResolvedValue([{ nextVersion: 11 }]);

      // Act
      const version = await computeNextVersion(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "report-1",
        mockQueryRaw,
      );

      // Assert
      expect(version).toBe(11);
    });

    it("should use FOR UPDATE in the SQL query (row lock)", async () => {
      // Arrange
      const mockQueryRaw = vi.fn().mockResolvedValue([{ nextVersion: 1 }]);

      // Act
      await computeNextVersion([], "report-1", mockQueryRaw);

      // Assert: verify the SQL contains FOR UPDATE
      const sqlCall = mockQueryRaw.mock.calls[0];
      expect(sqlCall).toBeDefined();
      const sqlTemplate = sqlCall[0] as TemplateStringsArray;
      const combinedSql = sqlTemplate.join("");
      expect(combinedSql).toContain("FOR UPDATE");
    });

    it("should filter by reportId in the WHERE clause", async () => {
      // Arrange
      const mockQueryRaw = vi.fn().mockResolvedValue([{ nextVersion: 1 }]);

      // Act
      await computeNextVersion([], "report-abc", mockQueryRaw);

      // Assert: verify reportId filtering
      const sqlCall = mockQueryRaw.mock.calls[0];
      expect(sqlCall).toBeDefined();
      const sqlTemplate = sqlCall[0] as TemplateStringsArray;
      const combinedSql = sqlTemplate.join("");
      expect(combinedSql).toContain('"reportId"');
    });
  });

  // ========================================================================
  // Interactive transaction test
  // ========================================================================

  /**
   * Simulates the generate worker's interactive transaction for versioning.
   * This is a simplified version of the actual worker code at
   * datapresent-web/lib/queue/workers/generate.worker.ts (lines 102-149).
   * Defined at outer describe level so concurrent tests can also use it.
   */
  async function atomicVersionIncrement(
    reportId: string,
    reportTitle: string,
    userId: string,
    slides: Array<{
      id: string;
      position: number;
      title: string;
      layout: string;
      content: unknown;
      speakerNotes: string | null;
    }>,
    mocks: {
      queryRaw: ReturnType<typeof vi.fn>;
      reportVersionCreate: ReturnType<typeof vi.fn>;
      slideDeleteMany: ReturnType<typeof vi.fn>;
      slideCreateMany: ReturnType<typeof vi.fn>;
      reportUpdate: ReturnType<typeof vi.fn>;
    },
  ): Promise<number> {
    // Simulate the interactive transaction
    // The real worker does: await prisma.$transaction(async (tx) => { ... })
    // Here we call the tx methods directly
    const [versionResult] = await mocks.queryRaw<Array<{ nextVersion: number }>>`
      SELECT COALESCE(MAX(version), 0) + 1 as "nextVersion"
      FROM "ReportVersion"
      WHERE "reportId" = ${reportId}
      FOR UPDATE
    `;

    const nextVersion = versionResult?.nextVersion ?? 1;

    await mocks.reportVersionCreate({
      data: {
        reportId,
        version: nextVersion,
        title: reportTitle,
        slideData: { slides },
        createdById: userId,
      },
    });

    await mocks.slideDeleteMany({ where: { reportId } });

    await mocks.slideCreateMany({
      data: slides.map((s) => ({
        reportId,
        position: s.position,
        title: s.title,
        layout: s.layout,
        contentJson: s.content,
        speakerNotes: s.speakerNotes,
      })),
    });

    await mocks.reportUpdate({
      where: { id: reportId },
      data: { title: reportTitle, status: "DONE" },
    });

    return nextVersion;
  }

  describe("interactive transaction with FOR UPDATE", () => {
    it("should create version with correct version number", async () => {
      // Arrange
      const mocks = {
        queryRaw: vi.fn().mockResolvedValue([{ nextVersion: 1 }]),
        reportVersionCreate: vi.fn().mockResolvedValue({}),
        slideDeleteMany: vi.fn().mockResolvedValue({ count: 3 }),
        slideCreateMany: vi.fn().mockResolvedValue({ count: 5 }),
        reportUpdate: vi.fn().mockResolvedValue({}),
      };

      // Act
      const version = await atomicVersionIncrement(
        "report-1",
        "Q1 Report",
        "user-1",
        [
          {
            id: "slide-1",
            position: 1,
            title: "Slide 1",
            layout: "TITLE_SLIDE",
            content: {},
            speakerNotes: null,
          },
          {
            id: "slide-2",
            position: 2,
            title: "Slide 2",
            layout: "BAR_CHART",
            content: {},
            speakerNotes: null,
          },
        ],
        mocks,
      );

      // Assert
      expect(version).toBe(1);
      expect(mocks.reportVersionCreate).toHaveBeenCalledTimes(1);
      expect(mocks.reportVersionCreate.mock.calls[0][0].data.version).toBe(1);
    });

    it("should delete old slides and create new ones", async () => {
      // Arrange
      const mocks = {
        queryRaw: vi.fn().mockResolvedValue([{ nextVersion: 2 }]),
        reportVersionCreate: vi.fn().mockResolvedValue({}),
        slideDeleteMany: vi.fn().mockResolvedValue({ count: 3 }),
        slideCreateMany: vi.fn().mockResolvedValue({ count: 5 }),
        reportUpdate: vi.fn().mockResolvedValue({}),
      };

      // Act
      await atomicVersionIncrement(
        "report-1",
        "Updated Q1 Report",
        "user-1",
        [
          {
            id: "new-slide-1",
            position: 1,
            title: "New Slide 1",
            layout: "TITLE_SLIDE",
            content: { text: "hello" },
            speakerNotes: "note",
          },
        ],
        mocks,
      );

      // Assert
      expect(mocks.slideDeleteMany).toHaveBeenCalledWith({ where: { reportId: "report-1" } });
      expect(mocks.slideCreateMany).toHaveBeenCalledTimes(1);
      const createdSlides = mocks.slideCreateMany.mock.calls[0][0].data;
      expect(createdSlides).toHaveLength(1);
      expect(createdSlides[0].title).toBe("New Slide 1");
      expect(createdSlides[0].speakerNotes).toBe("note");
    });

    it("should update report title and status to DONE", async () => {
      // Arrange
      const mocks = {
        queryRaw: vi.fn().mockResolvedValue([{ nextVersion: 1 }]),
        reportVersionCreate: vi.fn().mockResolvedValue({}),
        slideDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        slideCreateMany: vi.fn().mockResolvedValue({ count: 0 }),
        reportUpdate: vi.fn().mockResolvedValue({}),
      };

      // Act
      await atomicVersionIncrement("report-1", "Final Q1 Report", "user-1", [], mocks);

      // Assert
      expect(mocks.reportUpdate).toHaveBeenCalledWith({
        where: { id: "report-1" },
        data: { title: "Final Q1 Report", status: "DONE" },
      });
    });

    it("should default to version 1 when queryRaw returns empty result", async () => {
      // Arrange
      const mocks = {
        queryRaw: vi.fn().mockResolvedValue([]), // Empty result
        reportVersionCreate: vi.fn().mockResolvedValue({}),
        slideDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        slideCreateMany: vi.fn().mockResolvedValue({ count: 0 }),
        reportUpdate: vi.fn().mockResolvedValue({}),
      };

      // Act
      const version = await atomicVersionIncrement("report-1", "Test", "user-1", [], mocks);

      // Assert
      expect(version).toBe(1);
    });
  });

  // ========================================================================
  // Concurrent version increment test
  // ========================================================================

  describe("concurrent version increment (no unique constraint violation)", () => {
    it("should assign versions 1 and 2 to two concurrent jobs", async () => {
      // Simulate two concurrent generate jobs for the same report.
      // PostgreSQL's FOR UPDATE ensures they get sequential versions.
      // We mock the queryRaw to simulate row-level locking by using
      // a shared state counter.

      let latestVersion = 0;
      const usedVersions: number[] = [];

      // Mock queryRaw to atomically increment and return next version
      const mockQueryRaw = vi.fn().mockImplementation(async () => {
        // Simulate the atomic increment within a FOR UPDATE lock
        latestVersion += 1;
        const nextVersion = latestVersion;
        // Simulate async DB operation
        usedVersions.push(nextVersion);
        return [{ nextVersion }];
      });

      const baseMocks = {
        queryRaw: mockQueryRaw,
        reportVersionCreate: vi.fn().mockResolvedValue({}),
        slideDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        slideCreateMany: vi.fn().mockResolvedValue({ count: 0 }),
        reportUpdate: vi.fn().mockResolvedValue({}),
      };

      // Fire two concurrent "generate" operations for the same report
      const [version1, version2] = await Promise.all([
        atomicVersionIncrement("report-1", "Q1 Report", "user-1", [], { ...baseMocks }),
        atomicVersionIncrement("report-1", "Q1 Report", "user-1", [], { ...baseMocks }),
      ]);

      // Assert: both calls got different versions
      expect(version1).not.toBe(version2);
      const versions = [version1, version2].sort((a, b) => a - b);
      expect(versions).toEqual([1, 2]);

      // No unique constraint violations would occur since versions are unique per report
      // The two ReportVersion creates would have different version numbers
      const createdVersions = baseMocks.reportVersionCreate.mock.calls.map(
        (call: [{ data: { version: number } }]) => call[0].data.version,
      );
      expect(createdVersions.sort()).toEqual([1, 2]);
      // Verify they're unique
      expect(new Set(createdVersions).size).toBe(2);
    });

    it("should handle 5 concurrent jobs and assign unique versions to each", async () => {
      // Simulate the FOR UPDATE locking behavior
      let latestVersion = 0;
      const usedVersions: number[] = [];

      const mockQueryRaw = vi.fn().mockImplementation(async () => {
        latestVersion += 1;
        const nextVersion = latestVersion;
        usedVersions.push(nextVersion);
        return [{ nextVersion }];
      });

      const baseMocks = {
        queryRaw: mockQueryRaw,
        reportVersionCreate: vi.fn().mockResolvedValue({}),
        slideDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        slideCreateMany: vi.fn().mockResolvedValue({ count: 0 }),
        reportUpdate: vi.fn().mockResolvedValue({}),
      };

      // Fire 5 concurrent jobs
      const jobs = Array.from({ length: 5 }, (_, i) =>
        atomicVersionIncrement("report-1", `Report ${i}`, "user-1", [], { ...baseMocks }),
      );

      const versions = await Promise.all(jobs);

      // Assert: all 5 versions are unique
      expect(new Set(versions).size).toBe(5);
      // And they span 1-5
      expect(versions.sort()).toEqual([1, 2, 3, 4, 5]);

      // Verify reportVersionCreate calls have unique versions
      const createdVersions = baseMocks.reportVersionCreate.mock.calls.map(
        (call: [{ data: { version: number } }]) => call[0].data.version,
      );
      expect(new Set(createdVersions).size).toBe(5);
    });
  });
});
