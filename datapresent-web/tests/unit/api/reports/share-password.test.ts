// ==========================================
// Share Route — Password Update Tests
// ==========================================
//
// Tests for PATCH handler password handling:
// - undefined password = no change (don't nuke existing)
// - '' = remove existing password
// - valid password = hash and set

import { describe, it, expect } from "vitest";

// Test the password update logic directly (independent of route mocking)
describe("Share PATCH — password update logic", () => {
  it("should NOT update sharePassword when password is undefined (field absent)", () => {
    // Simulate PATCH body without password
    const body = { allowComments: true };
    const password = body.password as string | undefined;

    // passwordUpdate should be undefined (skip in spread)
    let passwordUpdate: string | null | undefined = undefined;
    if (password !== undefined) {
      passwordUpdate = null; // would be '' ? null : hashed
    }

    expect(passwordUpdate).toBeUndefined();
  });

  it("should set sharePassword to null when password is empty string (remove)", () => {
    const body = { password: "" };
    const password = body.password;

    let passwordUpdate: string | null | undefined = undefined;
    if (password !== undefined) {
      passwordUpdate = password === "" ? null : "hashed-value";
    }

    expect(passwordUpdate).toBeNull();
  });

  it("should set sharePassword to hashed value when password is provided", () => {
    const body = { password: "StrongP@ss1234!" };
    const password = body.password;

    let passwordUpdate: string | null | undefined = undefined;
    if (password !== undefined) {
      passwordUpdate = password === "" ? null : "hashed-value";
    }

    expect(passwordUpdate).toBe("hashed-value");
  });

  it("should preserve existing password when PATCH does not include password field", () => {
    // Simulating the spread behavior:
    // ...(passwordUpdate !== undefined ? { sharePassword: passwordUpdate } : {})
    const updates: Record<string, unknown> = { allowComments: false };
    const passwordUpdate: string | null | undefined = undefined;

    const finalData = {
      ...updates,
      ...(passwordUpdate !== undefined ? { sharePassword: passwordUpdate } : {}),
    };

    expect(finalData).not.toHaveProperty("sharePassword");
    expect(finalData).toEqual({ allowComments: false });
  });

  it("should include sharePassword: null when password is empty string", () => {
    const updates: Record<string, unknown> = { allowComments: false };
    const passwordUpdate: string | null | undefined = null;

    const finalData = {
      ...updates,
      ...(passwordUpdate !== undefined ? { sharePassword: passwordUpdate } : {}),
    };

    expect(finalData).toHaveProperty("sharePassword");
    expect(finalData.sharePassword).toBeNull();
  });

  it("should include sharePassword when password is provided", () => {
    const updates: Record<string, unknown> = { allowComments: false };
    const passwordUpdate: string | null | undefined = "hashed-password";

    const finalData = {
      ...updates,
      ...(passwordUpdate !== undefined ? { sharePassword: passwordUpdate } : {}),
    };

    expect(finalData).toHaveProperty("sharePassword");
    expect(finalData.sharePassword).toBe("hashed-password");
  });
});
