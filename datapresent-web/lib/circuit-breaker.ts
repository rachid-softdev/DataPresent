import { ERROR_CODES } from "@/lib/errors";

// ==========================================
// Circuit Breaker Types
// ==========================================

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxRequests: number;
  halfOpenSuccessThreshold: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxRequests: 3,
  halfOpenSuccessThreshold: 2,
};

// ==========================================
// CircuitBreakerOpenError
// ==========================================

export class CircuitBreakerOpenError extends Error {
  public readonly code: string;
  /** @internal Service name — not exposed in error message */
  public readonly _serviceName: string;

  constructor(serviceName: string) {
    super("External service temporarily unavailable");
    this.name = "CircuitBreakerOpenError";
    this.code = ERROR_CODES.ERR_CIRCUIT_OPEN;
    this._serviceName = serviceName;
  }
}

// ==========================================
// CircuitBreaker
// ==========================================

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenSuccesses = 0;
  private halfOpenRequestsInFlight = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxRequests: number;
  private readonly halfOpenSuccessThreshold: number;

  constructor(
    private readonly serviceName: string,
    config?: Partial<CircuitBreakerConfig>,
  ) {
    const merged = { ...DEFAULT_CONFIG, ...config };
    this.failureThreshold = merged.failureThreshold;
    this.resetTimeoutMs = merged.resetTimeoutMs;
    this.halfOpenMaxRequests = merged.halfOpenMaxRequests;
    this.halfOpenSuccessThreshold = merged.halfOpenSuccessThreshold;
  }

  getState(): CircuitState {
    return this.state;
  }

  getServiceName(): string {
    return this.serviceName;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    // CLOSED: normal operation
    if (this.state === "CLOSED") {
      try {
        const result = await fn();
        this.failureCount = 0;
        return result;
      } catch (error) {
        this.failureCount++;
        if (this.failureCount >= this.failureThreshold) {
          this.transitionTo("OPEN");
          this.lastFailureTime = Date.now();
        }
        throw error;
      }
    }

    // OPEN: check if reset timeout elapsed
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.resetTimeoutMs) {
        this.transitionTo("HALF_OPEN");
        this.halfOpenSuccesses = 0;
        this.halfOpenRequestsInFlight = 0;
        return this.callHalfOpen(fn);
      }
      throw new CircuitBreakerOpenError(this.serviceName);
    }

    // HALF_OPEN: allow limited requests
    return this.callHalfOpen(fn);
  }

  private async callHalfOpen<T>(fn: () => Promise<T>): Promise<T> {
    if (this.halfOpenRequestsInFlight >= this.halfOpenMaxRequests) {
      throw new CircuitBreakerOpenError(this.serviceName);
    }

    this.halfOpenRequestsInFlight++;

    try {
      const result = await fn();
      this.halfOpenSuccesses++;
      this.halfOpenRequestsInFlight--;

      if (this.halfOpenSuccesses >= this.halfOpenSuccessThreshold) {
        this.transitionTo("CLOSED");
        this.failureCount = 0;
      }
      return result;
    } catch (error) {
      this.transitionTo("OPEN");
      this.lastFailureTime = Date.now();
      this.halfOpenRequestsInFlight--;
      throw error;
    }
  }

  private transitionTo(newState: CircuitState): void {
    const previous = this.state;
    this.state = newState;

    if (previous !== newState) {
      if (newState === "CLOSED") {
        this.failureCount = 0;
        this.halfOpenSuccesses = 0;
        this.halfOpenRequestsInFlight = 0;
      }
    }
  }

  /** Reset the breaker to CLOSED (for manual intervention/testing) */
  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenSuccesses = 0;
    this.halfOpenRequestsInFlight = 0;
  }
}

// ==========================================
// CircuitBreakerRegistry (singleton)
// ==========================================

class CircuitBreakerRegistryImpl {
  private breakers = new Map<string, CircuitBreaker>();

  getOrCreate(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    const existing = this.breakers.get(serviceName);
    if (existing) return existing;

    const breaker = new CircuitBreaker(serviceName, config);
    this.breakers.set(serviceName, breaker);
    return breaker;
  }

  get(serviceName: string): CircuitBreaker | undefined {
    return this.breakers.get(serviceName);
  }

  getAll(): CircuitBreaker[] {
    return Array.from(this.breakers.values());
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistryImpl();

// ==========================================
// Higher-order function: withCircuitBreaker
// ==========================================

export function withCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  options?: Partial<CircuitBreakerConfig>,
): Promise<T> {
  const breaker = circuitBreakerRegistry.getOrCreate(serviceName, options);
  return breaker.call(fn);
}
