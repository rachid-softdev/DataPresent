// ==========================================
// New Report Page — Dynamic slideCount Tests (Fix 2)
// ==========================================
//
// Tests the data-fetching logic from page.tsx (the New Report page):
//   app/[locale]/(dashboard)/new/page.tsx
//
// Fix 2 adds dynamic slideCount slider by fetching maxSlides limit from
// entitlements/feature-gate. The page:
// - Fetches maxSlides limit from getLimit(orgId, 'maxSlides')
// - Passes it to NewReportForm as maxSlides prop
// - Defaults to 20 for unauthenticated users
// - Defaults to 50 when limit is null (unlimited)
//
// We replicate the exact logic from page.tsx in a testable function
// to avoid importing the page module's massive dependency tree
// (which includes several components with pre-existing parse errors).

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockGetLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("@/lib/entitlements/feature-gate", () => ({
  getLimit: mockGetLimit,
}));

// ---------------------------------------------------------------------------
// Replicate the exact data-fetching logic from page.tsx lines 7-25
// ---------------------------------------------------------------------------

/**
 * Replicates the maxSlides computation from page.tsx for testing in isolation.
 * The actual page.tsx code is:
 *
 *   const session = await auth();
 *   let maxSlides = 20;
 *   if (session?.user?.id) {
 *     const user = await prisma.user.findUnique({...});
 *     if (user?.membership?.[0]?.orgId) {
 *       const limit = await getLimit(user.membership[0].orgId, "maxSlides");
 *       maxSlides = limit ?? 50;
 *     }
 *   }
 *   return <NewReportForm maxSlides={maxSlides} />;
 */
import { prisma } from "@/lib/prisma";
import { getLimit } from "@/lib/entitlements/feature-gate";

async function computeMaxSlides(session: { user?: { id?: string } } | null): Promise<number> {
  let maxSlides = 20;

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { membership: { take: 1, select: { orgId: true } } },
    });

    if (user?.membership?.[0]?.orgId) {
      const limit = await getLimit(user.membership[0].orgId, "maxSlides");
      maxSlides = limit ?? 50;
    }
  }

  return maxSlides;
}

describe("New Report Page — Dynamic slideCount (Fix 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ======================================================================
  // Unauthenticated user
  // ======================================================================

  it("should default to 20 maxSlides for unauthenticated users (null session)", async () => {
    // Act
    const maxSlides = await computeMaxSlides(null);

    // Assert
    expect(maxSlides).toBe(20);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockGetLimit).not.toHaveBeenCalled();
  });

  it("should default to 20 maxSlides when session exists but user is undefined", async () => {
    // Arrange
    const session = {
      /* no user */
    };

    // Act
    const maxSlides = await computeMaxSlides(session);

    // Assert
    expect(maxSlides).toBe(20);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockGetLimit).not.toHaveBeenCalled();
  });

  it("should default to 20 maxSlides when user.id is undefined", async () => {
    // Arrange
    const session = {
      user: {
        /* no id */
      },
    };

    // Act
    const maxSlides = await computeMaxSlides(session);

    // Assert
    expect(maxSlides).toBe(20);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockGetLimit).not.toHaveBeenCalled();
  });

  // ======================================================================
  // Authenticated user with membership
  // ======================================================================

  it("should query DB and call getLimit for authenticated users with membership", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: "user-123",
      membership: [{ orgId: "org-456" }],
    });
    mockGetLimit.mockResolvedValue(30);

    // Act
    const maxSlides = await computeMaxSlides({ user: { id: "user-123" } });

    // Assert
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "user-123" },
      include: { membership: { take: 1, select: { orgId: true } } },
    });
    expect(mockGetLimit).toHaveBeenCalledWith("org-456", "maxSlides");
    expect(maxSlides).toBe(30);
  });

  it("should pass maxSlides=50 when getLimit returns null (unlimited plan)", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: "user-123",
      membership: [{ orgId: "org-456" }],
    });
    mockGetLimit.mockResolvedValue(null); // Unlimited

    // Act
    const maxSlides = await computeMaxSlides({ user: { id: "user-123" } });

    // Assert
    expect(maxSlides).toBe(50);
  });

  it("should pass the correct numeric value when getLimit returns a number", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: "user-123",
      membership: [{ orgId: "org-456" }],
    });
    mockGetLimit.mockResolvedValue(15);

    // Act
    const maxSlides = await computeMaxSlides({ user: { id: "user-123" } });

    // Assert
    expect(maxSlides).toBe(15);
  });

  it("should use getLimit with the first org when user has multiple memberships", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: "user-123",
      membership: [{ orgId: "first-org" }, { orgId: "second-org" }],
    });
    mockGetLimit.mockResolvedValue(25);

    // Act
    const maxSlides = await computeMaxSlides({ user: { id: "user-123" } });

    // Assert
    expect(mockGetLimit).toHaveBeenCalledWith("first-org", "maxSlides");
    expect(maxSlides).toBe(25);
  });

  // ======================================================================
  // Edge cases
  // ======================================================================

  it("should default to 20 when user has no memberships", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: "user-123",
      membership: [], // No org membership
    });

    // Act
    const maxSlides = await computeMaxSlides({ user: { id: "user-123" } });

    // Assert
    expect(maxSlides).toBe(20);
    expect(mockGetLimit).not.toHaveBeenCalled();
  });

  it("should default to 20 when user is found but membership is undefined", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: "user-123",
      // membership is undefined
    });

    // Act
    const maxSlides = await computeMaxSlides({ user: { id: "user-123" } });

    // Assert
    expect(maxSlides).toBe(20);
    expect(mockGetLimit).not.toHaveBeenCalled();
  });

  it("should default to 20 when prisma returns null user", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue(null);

    // Act
    const maxSlides = await computeMaxSlides({ user: { id: "user-123" } });

    // Assert
    expect(maxSlides).toBe(20);
    expect(mockGetLimit).not.toHaveBeenCalled();
  });
});
