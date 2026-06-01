// ==========================================
// Toast Tests
// ==========================================

import { describe, it, expect, vi } from "vitest";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Toast", () => {
  it("should export showToast function", async () => {
    const { showToast } = await import("@/lib/toast");
    expect(showToast).toBeDefined();
  });

  it("should export toastSuccess function", async () => {
    const { toastSuccess } = await import("@/lib/toast");
    expect(toastSuccess).toBeDefined();
  });

  it("should export toastError function", async () => {
    const { toastError } = await import("@/lib/toast");
    expect(toastError).toBeDefined();
  });

  it("should export toastWarning function", async () => {
    const { toastWarning } = await import("@/lib/toast");
    expect(toastWarning).toBeDefined();
  });

  it("should export toastInfo function", async () => {
    const { toastInfo } = await import("@/lib/toast");
    expect(toastInfo).toBeDefined();
  });
});
