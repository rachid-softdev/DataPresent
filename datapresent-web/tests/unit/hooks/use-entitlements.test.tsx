// ==========================================
// use-entitlements Hook Tests
// ==========================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, renderHook, waitFor } from "@testing-library/react";
import React, { type ReactNode } from "react";

// Mock fetch globally
global.fetch = vi.fn();

describe("useEntitlements hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should export hook", async () => {
    const entitlementsModule = await import("@/hooks/use-entitlements");
    expect(entitlementsModule.useEntitlements).toBeDefined();
  });

  it("should export EntitlementsProvider", async () => {
    const entitlementsModule = await import("@/hooks/use-entitlements");
    expect(entitlementsModule.EntitlementsProvider).toBeDefined();
  });

  it("should fetch entitlements on mount", async () => {
    const mockEntitlements = {
      plan: "PRO",
      features: { EXPORT_PDF: true, EXPORT_PPTX: true },
      limits: { REPORTS_PER_MONTH: 30 },
      usage: { REPORTS_PER_MONTH: 5 },
      resetAt: { REPORTS_PER_MONTH: "2024-01-01" },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEntitlements,
    });

    const { useEntitlements, EntitlementsProvider } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useEntitlements(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <EntitlementsProvider>{children}</EntitlementsProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.entitlements).toEqual(mockEntitlements);
    });
  });

  it("should set loading state initially", async () => {
    const mockEntitlements = {
      plan: "FREE",
      features: {},
      limits: {},
      usage: {},
      resetAt: {},
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEntitlements,
    });

    const { useEntitlements, EntitlementsProvider } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useEntitlements(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <EntitlementsProvider>{children}</EntitlementsProvider>
      ),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("should set error on failed fetch", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { useEntitlements } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useEntitlements());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });

  it("should provide refetch function", async () => {
    const mockEntitlements = {
      plan: "PRO",
      features: {},
      limits: {},
      usage: {},
      resetAt: {},
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntitlements,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockEntitlements, plan: "PRO" }),
      });

    const { useEntitlements, EntitlementsProvider } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useEntitlements(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <EntitlementsProvider>{children}</EntitlementsProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.entitlements).not.toBeNull();
    });

    await result.current.refetch();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe("useFeature", () => {
  const mockEntitlements = {
    plan: "PRO",
    features: {
      EXPORT_PDF: true,
      EXPORT_PPTX: false,
      ANALYTICS: true,
    },
    limits: {},
    usage: {},
    resetAt: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockEntitlements,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return true for enabled feature", async () => {
    const { useFeature, EntitlementsProvider } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useFeature("EXPORT_PDF"), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <EntitlementsProvider>{children}</EntitlementsProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasFeature).toBe(true);
  });

  it("should return false for disabled feature", async () => {
    const { useFeature } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useFeature("EXPORT_PPTX"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasFeature).toBe(false);
  });

  it("should return false for non-existent feature", async () => {
    const { useFeature } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useFeature("NONEXISTENT"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasFeature).toBe(false);
  });

  it("should return loading state while fetching", async () => {
    // Make fetch never resolve so loading persists
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { useFeature, EntitlementsProvider } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useFeature("EXPORT_PDF"), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <EntitlementsProvider>{children}</EntitlementsProvider>
      ),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasFeature).toBe(false);
  });
});

describe("useLimit", () => {
  const mockEntitlements = {
    plan: "PRO",
    features: {},
    limits: {
      REPORTS_PER_MONTH: 30,
      EXPORTS_PER_MONTH: 10,
      UNLIMITED_FEATURE: null,
    },
    usage: {
      REPORTS_PER_MONTH: 5,
      EXPORTS_PER_MONTH: 10,
    },
    resetAt: {
      REPORTS_PER_MONTH: "2024-02-01T00:00:00Z",
      EXPORTS_PER_MONTH: null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockEntitlements,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return correct limit and usage values", async () => {
    const { useLimit, EntitlementsProvider } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useLimit("REPORTS_PER_MONTH"), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <EntitlementsProvider>{children}</EntitlementsProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.limit).toBe(30);
    expect(result.current.used).toBe(5);
    expect(result.current.remaining).toBe(25);
    expect(result.current.resetAt).toBe("2024-02-01T00:00:00Z");
  });

  it("should return 0 remaining when at limit", async () => {
    const { useLimit, EntitlementsProvider } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useLimit("EXPORTS_PER_MONTH"), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <EntitlementsProvider>{children}</EntitlementsProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.limit).toBe(10);
    expect(result.current.used).toBe(10);
    expect(result.current.remaining).toBe(0);
  });

  it("should return null remaining for unlimited feature", async () => {
    const { useLimit } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useLimit("UNLIMITED_FEATURE"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.limit).toBeNull();
    expect(result.current.used).toBe(0);
    expect(result.current.remaining).toBeNull();
  });

  it("should return 0 for non-existent limit key", async () => {
    const { useLimit } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useLimit("NONEXISTENT"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.limit).toBeNull();
    expect(result.current.used).toBe(0);
    expect(result.current.remaining).toBeNull();
  });
});

describe("EntitlementsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        plan: "FREE",
        features: {},
        limits: {},
        usage: {},
        resetAt: {},
      }),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("wraps children without crashing", async () => {
    const { EntitlementsProvider } = await import("@/hooks/use-entitlements");

    const { container } = render(
      <EntitlementsProvider>
        <div data-testid="child">Child</div>
      </EntitlementsProvider>,
    );

    expect(container.querySelector('[data-testid="child"]')).toBeInTheDocument();
  });

  it("provides context to child hooks", async () => {
    const { EntitlementsProvider, useEntitlements } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useEntitlements(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <EntitlementsProvider>{children}</EntitlementsProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.entitlements).not.toBeNull();
    });
  });

  it("handles errors gracefully within provider", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network failure"));

    const { EntitlementsProvider, useEntitlements } = await import("@/hooks/use-entitlements");

    const { result } = renderHook(() => useEntitlements(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <EntitlementsProvider>{children}</EntitlementsProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe("Network failure");
    expect(result.current.entitlements).toBeNull();
  });
});
