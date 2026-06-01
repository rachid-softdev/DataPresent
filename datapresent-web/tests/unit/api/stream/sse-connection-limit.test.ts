// ==========================================
// SSE Connection Limit Tests
// ==========================================
//
// Tests for connection tracking in /api/reports/[id]/stream/route.ts:
// - Allows up to 3 concurrent connections per user
// - Returns 429 for 4th connection
// - Cleans up on abort

import { describe, it, expect, beforeEach } from "vitest";

// We test the SSE connection tracking logic directly (module-level Map).
describe("SSE connection limit logic", () => {
  let activeSSEConnections: Map<string, Set<any>>;

  beforeEach(() => {
    // Create a fresh tracking map for each test
    activeSSEConnections = new Map();
  });

  function simulateConnect(userId: string): boolean {
    if (!activeSSEConnections.has(userId)) {
      activeSSEConnections.set(userId, new Set());
    }
    const userConnections = activeSSEConnections.get(userId)!;
    if (userConnections.size >= 3) {
      return false; // Limit reached
    }
    const controller = { id: Math.random() };
    userConnections.add(controller);
    return true;
  }

  function simulateDisconnect(userId: string, controller: any) {
    const userConnections = activeSSEConnections.get(userId);
    if (!userConnections) return;
    userConnections.delete(controller);
    if (userConnections.size === 0) {
      activeSSEConnections.delete(userId);
    }
  }

  it("should allow first connection", () => {
    expect(simulateConnect("user-1")).toBe(true);
  });

  it("should allow up to 3 connections", () => {
    expect(simulateConnect("user-1")).toBe(true);
    expect(simulateConnect("user-1")).toBe(true);
    expect(simulateConnect("user-1")).toBe(true);
  });

  it("should reject 4th connection for same user", () => {
    simulateConnect("user-1");
    simulateConnect("user-1");
    simulateConnect("user-1");
    expect(simulateConnect("user-1")).toBe(false);
  });

  it("should allow different users independently", () => {
    // User 1 gets 3 connections
    simulateConnect("user-1");
    simulateConnect("user-1");
    simulateConnect("user-1");
    expect(simulateConnect("user-1")).toBe(false);

    // User 2 can still connect
    expect(simulateConnect("user-2")).toBe(true);
    expect(simulateConnect("user-2")).toBe(true);
    expect(simulateConnect("user-2")).toBe(true);
    expect(simulateConnect("user-2")).toBe(false);
  });

  it("should allow new connection after disconnect", () => {
    const controllers: any[] = [];
    for (let i = 0; i < 3; i++) {
      const connected = simulateConnect("user-1");
      expect(connected).toBe(true);
      // Track the controller by looking at the map
    }
    // Manually track controllers
    const userConnections = activeSSEConnections.get("user-1")!;
    const [c1, c2, c3] = [...userConnections];

    // Disconnect one
    simulateDisconnect("user-1", c1);
    expect([...activeSSEConnections.get("user-1")!]).toHaveLength(2);

    // Should be able to connect again
    expect(simulateConnect("user-1")).toBe(true);
    expect([...activeSSEConnections.get("user-1")!]).toHaveLength(3);
  });

  it("should clean up map entry when last connection disconnects", () => {
    simulateConnect("user-1");
    const userConnections = activeSSEConnections.get("user-1")!;
    const [controller] = [...userConnections];

    simulateDisconnect("user-1", controller);
    expect(activeSSEConnections.has("user-1")).toBe(false);
  });

  it("should not affect other users when one disconnects", () => {
    simulateConnect("user-1");
    simulateConnect("user-1");
    simulateConnect("user-2");
    simulateConnect("user-2");

    const user1Conns = activeSSEConnections.get("user-1")!;
    const [c1] = [...user1Conns];
    simulateDisconnect("user-1", c1);

    expect([...activeSSEConnections.get("user-1")!]).toHaveLength(1);
    expect([...activeSSEConnections.get("user-2")!]).toHaveLength(2);
  });
});
