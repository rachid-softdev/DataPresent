// ==========================================
// Circuit Breaker Tests (Sprint 6, Item 1)
// ==========================================
//
// Tests for lib/circuit-breaker.ts:
// - CircuitBreaker state transitions (CLOSED → OPEN → HALF_OPEN → CLOSED)
// - Failure counting and threshold
// - Timeout-based recovery (OPEN → HALF_OPEN)
// - Half-open request limiting and success threshold
// - CircuitBreakerRegistry singleton behavior
// - withCircuitBreaker() higher-order function
// - Error types (CircuitBreakerOpenError)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// We test the raw classes directly since they have no side-effect imports
// that depend on env.ts validation at module load time.
describe("CircuitBreaker (lib/circuit-breaker.ts)", () => {
  // ======================================================================
  // Basic initialization
  // ======================================================================

  it("should create a CircuitBreaker with default config", async () => {
    const { CircuitBreaker } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("test-service");
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.getServiceName()).toBe("test-service");
  });

  it("should create a CircuitBreaker with custom config", async () => {
    const { CircuitBreaker } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("custom-service", {
      failureThreshold: 2,
      resetTimeoutMs: 5_000,
      halfOpenMaxRequests: 1,
      halfOpenSuccessThreshold: 1,
    });
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.getServiceName()).toBe("custom-service");
  });

  it("should initialize in CLOSED state", async () => {
    const { CircuitBreaker } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("svc");
    expect(cb.getState()).toBe("CLOSED");
  });

  // ======================================================================
  // CLOSED state: normal operation
  // ======================================================================

  it("should call the function and return result when CLOSED", async () => {
    const { CircuitBreaker } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("svc");
    const result = await cb.call(() => Promise.resolve("success"));
    expect(result).toBe("success");
    expect(cb.getState()).toBe("CLOSED");
  });

  it("should reset failureCount on success when CLOSED", async () => {
    const { CircuitBreaker } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("svc", { failureThreshold: 3 });

    // Two failures
    await cb.call(() => Promise.reject(new Error("fail"))).catch(() => {});
    await cb.call(() => Promise.reject(new Error("fail"))).catch(() => {});
    // Then success — should reset failure count
    await cb.call(() => Promise.resolve("ok"));
    expect(cb.getState()).toBe("CLOSED");
  });

  it("should increment failureCount and stay CLOSED when below threshold", async () => {
    const { CircuitBreaker } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("svc", { failureThreshold: 3 });

    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(cb.getState()).toBe("CLOSED");

    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(cb.getState()).toBe("CLOSED");
  });

  it("should transition to OPEN when failures reach threshold", async () => {
    const { CircuitBreaker } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("svc", { failureThreshold: 2 });

    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(cb.getState()).toBe("CLOSED");

    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(cb.getState()).toBe("OPEN");
  });

  // ======================================================================
  // OPEN state: fast-fail
  // ======================================================================

  it("should throw CircuitBreakerOpenError when calling in OPEN state", async () => {
    const { CircuitBreaker, CircuitBreakerOpenError } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("svc", { failureThreshold: 1 });

    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(cb.getState()).toBe("OPEN");

    await expect(cb.call(() => Promise.resolve("ok"))).rejects.toThrow(CircuitBreakerOpenError);
  });

  it("should include service name in CircuitBreakerOpenError", async () => {
    const { CircuitBreaker, CircuitBreakerOpenError } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("my-api", { failureThreshold: 1 });

    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});

    try {
      await cb.call(() => Promise.resolve("ok"));
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(CircuitBreakerOpenError);
      expect((e as CircuitBreakerOpenError)._serviceName).toBe("my-api");
      expect((e as CircuitBreakerOpenError).code).toBeDefined();
    }
  });

  // ======================================================================
  // OPEN → HALF_OPEN transition (timeout-based)
  // ======================================================================

  // ======================================================================
  // reset() method
  // ======================================================================

  it("should reset to CLOSED state", async () => {
    const { CircuitBreaker } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("svc", { failureThreshold: 1 });

    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(cb.getState()).toBe("OPEN");

    cb.reset();
    expect(cb.getState()).toBe("CLOSED");
  });

  it("should clear failure count on reset", async () => {
    const { CircuitBreaker } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("svc", { failureThreshold: 1 });

    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    cb.reset();

    // Should be able to call successfully again
    const result = await cb.call(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
    expect(cb.getState()).toBe("CLOSED");
  });

  // ======================================================================
  // CircuitBreakerRegistry
  // ======================================================================

  it("should create and reuse breakers via registry", async () => {
    const { circuitBreakerRegistry } = await import("@/lib/circuit-breaker");

    const cb1 = circuitBreakerRegistry.getOrCreate("svc-a");
    const cb2 = circuitBreakerRegistry.getOrCreate("svc-a");

    expect(cb1).toBe(cb2); // Same instance
    expect(cb1.getServiceName()).toBe("svc-a");
  });

  it("should create separate breakers for different services", async () => {
    const { circuitBreakerRegistry } = await import("@/lib/circuit-breaker");

    const cb1 = circuitBreakerRegistry.getOrCreate("svc-a");
    const cb2 = circuitBreakerRegistry.getOrCreate("svc-b");

    expect(cb1).not.toBe(cb2);
  });

  it("should get existing breaker by name", async () => {
    const { circuitBreakerRegistry } = await import("@/lib/circuit-breaker");

    circuitBreakerRegistry.getOrCreate("svc-a");
    const retrieved = circuitBreakerRegistry.get("svc-a");
    expect(retrieved).toBeDefined();
    expect(retrieved!.getServiceName()).toBe("svc-a");
  });

  it("should return undefined for unknown service", async () => {
    const { circuitBreakerRegistry } = await import("@/lib/circuit-breaker");

    const retrieved = circuitBreakerRegistry.get("nonexistent");
    expect(retrieved).toBeUndefined();
  });

  it("should return all breakers via getAll", async () => {
    const { circuitBreakerRegistry } = await import("@/lib/circuit-breaker");

    circuitBreakerRegistry.getOrCreate("svc-a");
    circuitBreakerRegistry.getOrCreate("svc-b");

    const all = circuitBreakerRegistry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.map((b) => b.getServiceName())).toContain("svc-a");
    expect(all.map((b) => b.getServiceName())).toContain("svc-b");
  });

  it("should reset all breakers via resetAll", async () => {
    const { circuitBreakerRegistry } = await import("@/lib/circuit-breaker");

    // Use unique names to avoid cross-test pollution (registry persists across tests)
    const cb1 = circuitBreakerRegistry.getOrCreate("reset-a", { failureThreshold: 1 });
    const cb2 = circuitBreakerRegistry.getOrCreate("reset-b", { failureThreshold: 1 });

    // Open both (need 5 failures each because default threshold is 5,
    // but with our config threshold=1, a single failure should do it)
    await cb1.call(() => Promise.reject(new Error("err"))).catch(() => {});
    await cb2.call(() => Promise.reject(new Error("err"))).catch(() => {});

    expect(cb1.getState()).toBe("OPEN");
    expect(cb2.getState()).toBe("OPEN");

    circuitBreakerRegistry.resetAll();

    expect(cb1.getState()).toBe("CLOSED");
    expect(cb2.getState()).toBe("CLOSED");
  });

  it("should pass config to new breaker on first getOrCreate", async () => {
    const { circuitBreakerRegistry } = await import("@/lib/circuit-breaker");

    const cb = circuitBreakerRegistry.getOrCreate("custom-cfg", { failureThreshold: 3 });
    expect(cb.getState()).toBe("CLOSED");

    // Failure threshold should be 3
    // Two failures should keep it CLOSED
    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(cb.getState()).toBe("CLOSED");

    // Third failure opens it
    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(cb.getState()).toBe("OPEN");
  });

  // ======================================================================
  // withCircuitBreaker() higher-order function
  // ======================================================================

  it("should execute function via withCircuitBreaker", async () => {
    const { withCircuitBreaker } = await import("@/lib/circuit-breaker");

    const result = await withCircuitBreaker("test-ho", () => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it("should throw CircuitBreakerOpenError when circuit is open via withCircuitBreaker", async () => {
    const { withCircuitBreaker, circuitBreakerRegistry, CircuitBreakerOpenError } = await import(
      "@/lib/circuit-breaker"
    );

    // Create breaker with 1-failure threshold and trip it
    const breaker = circuitBreakerRegistry.getOrCreate("test-ho-fail", {
      failureThreshold: 1,
      resetTimeoutMs: 10000,
    });

    await breaker.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(breaker.getState()).toBe("OPEN");

    // Now withCircuitBreaker should throw
    await expect(withCircuitBreaker("test-ho-fail", () => Promise.resolve("nope"))).rejects.toThrow(
      CircuitBreakerOpenError,
    );
  });
});

describe("CircuitBreaker — state transitions with fake timers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should transition OPEN → HALF_OPEN after reset timeout", async () => {
    const { CircuitBreaker } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("svc", {
      failureThreshold: 1,
      resetTimeoutMs: 5000,
    });

    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(cb.getState()).toBe("OPEN");

    // Advance time past the timeout
    vi.advanceTimersByTime(5000);

    // The next call should trigger HALF_OPEN transition
    const result = await cb.call(() => Promise.resolve("recovered"));
    expect(result).toBe("recovered");
    expect(cb.getState()).toBe("HALF_OPEN");
  });

  it("should transition HALF_OPEN → CLOSED after success threshold met", async () => {
    const { CircuitBreaker } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("svc", {
      failureThreshold: 1,
      resetTimeoutMs: 5000,
      halfOpenSuccessThreshold: 2,
      halfOpenMaxRequests: 3,
    });

    // Trip to OPEN
    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(cb.getState()).toBe("OPEN");

    // Advance time to allow HALF_OPEN
    vi.advanceTimersByTime(5000);

    // First success in HALF_OPEN
    await cb.call(() => Promise.resolve("ok1"));
    expect(cb.getState()).toBe("HALF_OPEN");

    // Second success should close
    await cb.call(() => Promise.resolve("ok2"));
    expect(cb.getState()).toBe("CLOSED");
  });

  it("should limit concurrent requests in HALF_OPEN state", async () => {
    const { CircuitBreaker } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("svc", {
      failureThreshold: 1,
      resetTimeoutMs: 5000,
      halfOpenMaxRequests: 1,
      halfOpenSuccessThreshold: 1,
    });

    // Trip to OPEN
    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(cb.getState()).toBe("OPEN");

    // Advance time
    vi.advanceTimersByTime(5000);

    // First call occupies the single HALF_OPEN slot (promise keeps pending)
    void cb.call(
      () => new Promise<string>(() => {}), // never resolves
    );

    // Second call should be rejected immediately
    await expect(cb.call(() => Promise.resolve("nope"))).rejects.toThrow(
      "External service temporarily unavailable",
    );
  });

  it("should transition HALF_OPEN → OPEN on failure", async () => {
    const { CircuitBreaker } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("svc", {
      failureThreshold: 1,
      resetTimeoutMs: 5000,
      halfOpenSuccessThreshold: 2,
    });

    // Trip to OPEN
    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(cb.getState()).toBe("OPEN");

    // Advance time
    vi.advanceTimersByTime(5000);

    // Fail in HALF_OPEN — should go back to OPEN
    await cb.call(() => Promise.reject(new Error("still broken"))).catch(() => {});
    expect(cb.getState()).toBe("OPEN");
  });

  it("should not open if still within timeout period from last failure", async () => {
    const { CircuitBreaker, CircuitBreakerOpenError } = await import("@/lib/circuit-breaker");
    const cb = new CircuitBreaker("svc", {
      failureThreshold: 1,
      resetTimeoutMs: 30000, // 30 seconds
    });

    await cb.call(() => Promise.reject(new Error("err"))).catch(() => {});
    expect(cb.getState()).toBe("OPEN");

    // Advance only 5 seconds (not enough)
    vi.advanceTimersByTime(5000);

    await expect(cb.call(() => Promise.resolve("nope"))).rejects.toThrow(CircuitBreakerOpenError);
    expect(cb.getState()).toBe("OPEN");
  });
});
