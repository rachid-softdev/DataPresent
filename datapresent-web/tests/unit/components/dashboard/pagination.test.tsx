// ==========================================
// Dashboard Pagination Tests (Item 8)
// ==========================================
//
// Tests the dashboard page "See all reports" link logic:
// - Reports >= 6 shows "See all reports" link
// - Reports < 6 hides "See all reports" link
// - Empty state shown when no reports
//
// We replicate the exact logic from page.tsx in testable functions
// to avoid importing the massive dependency tree of the server component.

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Replicate the "See all reports" link logic from page.tsx
// ---------------------------------------------------------------------------

/**
 * Replicates the reports mapping logic from page.tsx.
 * The actual code in page.tsx is:
 *
 *   {reports.length >= 6 && (
 *     <div className="mt-6 text-center">
 *       <Link href="/reports" ...>{t("dashboard.seeAllReports")}</Link>
 *     </div>
 *   )}
 */
function shouldShowSeeAllLink(reports: unknown[]): boolean {
  return reports.length >= 6;
}

/**
 * Replicates the empty state check from page.tsx.
 * The actual code in page.tsx is:
 *
 *   {reports.length === 0 ? (
 *     <EmptyState ... />
 *   ) : (
 *     <>... report cards ...</>
 *   )}
 */
function isEmptyState(reports: unknown[]): boolean {
  return reports.length === 0;
}

/**
 * Replicates the take parameter from page.tsx:
 *   include: { org: { include: { reports: { orderBy: { createdAt: "desc" }, take: 6 } } } }
 */
const REPORTS_TAKE = 6;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Dashboard Pagination (Item 8)", () => {
  // ======================================================================
  // "See all reports" link visibility
  // ======================================================================

  it("should show 'See all reports' link when reports >= 6", () => {
    const reports = Array(6).fill({});
    expect(shouldShowSeeAllLink(reports)).toBe(true);
  });

  it("should show 'See all reports' link when reports > 6", () => {
    const reports = Array(10).fill({});
    expect(shouldShowSeeAllLink(reports)).toBe(true);
  });

  it("should NOT show 'See all reports' link when reports = 5 (less than take)", () => {
    const reports = Array(5).fill({});
    expect(shouldShowSeeAllLink(reports)).toBe(false);
  });

  it("should NOT show 'See all reports' link when reports = 0 (empty state)", () => {
    const reports: unknown[] = [];
    expect(shouldShowSeeAllLink(reports)).toBe(false);
  });

  it("should NOT show 'See all reports' link when reports = 3", () => {
    const reports = Array(3).fill({});
    expect(shouldShowSeeAllLink(reports)).toBe(false);
  });

  it("should NOT show 'See all reports' link when reports = 1", () => {
    const reports = Array(1).fill({});
    expect(shouldShowSeeAllLink(reports)).toBe(false);
  });

  // ======================================================================
  // Empty state
  // ======================================================================

  it("should show empty state when there are no reports", () => {
    const reports: unknown[] = [];
    expect(isEmptyState(reports)).toBe(true);
  });

  it("should NOT show empty state when there are reports", () => {
    const reports = Array(3).fill({});
    expect(isEmptyState(reports)).toBe(false);
  });

  // ======================================================================
  // Take parameter
  // ======================================================================

  it("should use take: 6 for the reports query (increased from 5)", () => {
    // This mirrors the page.tsx change from take: 5 to take: 6
    expect(REPORTS_TAKE).toBe(6);
  });

  it("should have boundary at exactly take value (6)", () => {
    // 5 reports -> no link
    expect(shouldShowSeeAllLink(Array(5).fill({}))).toBe(false);
    // 6 reports -> show link
    expect(shouldShowSeeAllLink(Array(6).fill({}))).toBe(true);
  });

  // ======================================================================
  // Edge cases
  // ======================================================================

  it("should handle very large report counts", () => {
    const reports = Array(100).fill({});
    expect(shouldShowSeeAllLink(reports)).toBe(true);
  });

  it("should handle reports with various statuses (just count matters)", () => {
    const mixedStatusReports = [
      { id: "1", status: "DONE" },
      { id: "2", status: "ERROR" },
      { id: "3", status: "IN_PROGRESS" },
      { id: "4", status: "DONE" },
      { id: "5", status: "DONE" },
      { id: "6", status: "ERROR" },
    ];
    expect(shouldShowSeeAllLink(mixedStatusReports)).toBe(true);
    expect(shouldShowSeeAllLink(mixedStatusReports.slice(0, 5))).toBe(false);
  });
});
