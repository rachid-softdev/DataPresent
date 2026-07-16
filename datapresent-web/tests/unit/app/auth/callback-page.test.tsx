// ==========================================
// Auth Callback Page Tests (Item 12)
// ==========================================
//
// Tests the client-side callback page at /auth/callback/page.tsx:
// - Reads token from search params
// - POSTs to /api/auth/callback/email
// - Redirects to / on success
// - Redirects to /login on error
// - Shows error state on missing token

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockReplace = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
  useSearchParams: vi.fn(() => ({ get: mockGet })),
}));

// Mock the Spinner component
vi.mock("@/components/ui/spinner", () => ({
  Spinner: ({ className }: { className?: string }) => (
    <div data-testid="spinner" className={className} />
  ),
}));

describe("AuthCallbackPage", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ======================================================================
  // Success flow
  // ======================================================================

  it("should read token from search params and POST to callback API", async () => {
    mockGet.mockReturnValue("valid-magic-token");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { default: AuthCallbackPage } = await import("@/app/[locale]/auth/callback/page");
    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("token");
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/callback/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "valid-magic-token" }),
    });
  });

  it("should redirect to / on successful auth", async () => {
    mockGet.mockReturnValue("valid-token");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { default: AuthCallbackPage } = await import("@/app/[locale]/auth/callback/page");
    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("should show loading spinner while authenticating", async () => {
    // Delay the fetch resolution
    mockGet.mockReturnValue("valid-token");
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 1000),
        ),
    );

    const { default: AuthCallbackPage } = await import("@/app/[locale]/auth/callback/page");
    render(<AuthCallbackPage />);

    // Immediately after render, loading state should be shown
    expect(screen.getByTestId("spinner")).toBeDefined();
    expect(screen.getByText("Signing you in...")).toBeDefined();
  });

  // ======================================================================
  // Error flows
  // ======================================================================

  it("should redirect to login with error when token is missing", async () => {
    mockGet.mockReturnValue(null);

    const { default: AuthCallbackPage } = await import("@/app/[locale]/auth/callback/page");
    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?error=errors.auth.invalidToken");
    });
  });

  it("should show error state when token is missing", async () => {
    mockGet.mockReturnValue(null);

    const { default: AuthCallbackPage } = await import("@/app/[locale]/auth/callback/page");
    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Missing token")).toBeDefined();
    });
  });

  it("should redirect to login with error when API returns error", async () => {
    mockGet.mockReturnValue("invalid-token");
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "errors.auth.invalidToken" }),
    });

    const { default: AuthCallbackPage } = await import("@/app/[locale]/auth/callback/page");
    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?error=errors.auth.invalidToken");
    });
  });

  it("should show error message from API response", async () => {
    mockGet.mockReturnValue("invalid-token");
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "errors.auth.invalidToken" }),
    });

    const { default: AuthCallbackPage } = await import("@/app/[locale]/auth/callback/page");
    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("errors.auth.invalidToken")).toBeDefined();
    });
  });

  it("should handle API returning non-JSON error", async () => {
    mockGet.mockReturnValue("some-token");
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("Not JSON");
      },
    });

    const { default: AuthCallbackPage } = await import("@/app/[locale]/auth/callback/page");
    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?error=errors.auth.failed");
    });
  });

  it("should redirect to login on network error", async () => {
    mockGet.mockReturnValue("some-token");
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { default: AuthCallbackPage } = await import("@/app/[locale]/auth/callback/page");
    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?error=errors.auth.failed");
    });
  });

  it("should show 'Network error' on fetch rejection", async () => {
    mockGet.mockReturnValue("some-token");
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { default: AuthCallbackPage } = await import("@/app/[locale]/auth/callback/page");
    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeDefined();
    });
  });
});
