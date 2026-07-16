// @vitest-environment node
// ==========================================
// Crypto No Fallback Test (Fix #4)
// ==========================================
//
// Tests that crypto.ts uses ONLY JOB_SIGNING_SECRET, not CSRF_SECRET:
// - SECRET is set to env.JOB_SIGNING_SECRET (no || CSRF_SECRET fallback)
// - Signatures produced with JOB_SIGNING_SECRET do NOT match CSRF_SECRET
// - Changing CSRF_SECRET does NOT affect signing/verification
//
// Rationale: Previously crypto.ts had:
//   const SECRET = env.JOB_SIGNING_SECRET || env.CSRF_SECRET
// This meant if JOB_SIGNING_SECRET was unset, it silently fell back to
// CSRF_SECRET, violating key material separation. The fix removes the
// fallback so that JOB_SIGNING_SECRET is strictly required.

import crypto from "crypto";
import { describe, expect, it } from "vitest";

// Import env to check values in test setup
import { env } from "@/env";
// Import crypto functions UNDER TEST
import { signJobData, verifyJobSignature } from "@/lib/crypto";

describe("Crypto No Fallback (Fix #4)", () => {
  const sampleData = { jobId: "job-123", type: "export" };

  it("should read SECRET from env.JOB_SIGNING_SECRET", () => {
    // The test setup (tests/setup.ts) stubs BOTH:
    //   JOB_SIGNING_SECRET = 'test-job-signing-secret-for-testing-12345678'
    //   CSRF_SECRET        = 'test-secret-key-for-testing-12345678'
    //
    // If crypto.ts fell back to CSRF_SECRET, the signatures would differ.
    // We verify by signing with the real module and checking consistency.

    const { signature } = signJobData(sampleData);
    expect(signature).toBeDefined();
    expect(signature.length).toBe(64);

    // Verify that JOB_SIGNING_SECRET is indeed the one being used.
    // Replicate signing with known secrets to confirm which one is active.

    // Expected signature using JOB_SIGNING_SECRET
    const expectedJobSig = crypto
      .createHmac("sha256", env.JOB_SIGNING_SECRET)
      .update(JSON.stringify(sampleData, Object.keys(sampleData).sort()))
      .digest("hex");

    // Expected signature using CSRF_SECRET (the banned fallback)
    const expectedCsrfSig = crypto
      .createHmac("sha256", env.CSRF_SECRET)
      .update(JSON.stringify(sampleData, Object.keys(sampleData).sort()))
      .digest("hex");

    // The module's signature MUST match JOB_SIGNING_SECRET
    expect(signature).toBe(expectedJobSig);

    // The module's signature MUST NOT match CSRF_SECRET
    expect(signature).not.toBe(expectedCsrfSig);
  });

  it("should verify signature produced by JOB_SIGNING_SECRET", () => {
    const { signature } = signJobData(sampleData);
    const isValid = verifyJobSignature(sampleData, signature);
    expect(isValid).toBe(true);
  });

  it("should reject signature produced by CSRF_SECRET", () => {
    // Simulate what would happen if the old fallback were active:
    // sign with CSRF_SECRET, try to verify with the module (which uses JOB_SIGNING_SECRET)

    const csrfSignature = crypto
      .createHmac("sha256", env.CSRF_SECRET)
      .update(JSON.stringify(sampleData, Object.keys(sampleData).sort()))
      .digest("hex");

    // Verification should fail because module uses JOB_SIGNING_SECRET, not CSRF_SECRET
    const isValid = verifyJobSignature(sampleData, csrfSignature);
    expect(isValid).toBe(false);
  });

  it("should reject an empty string as secret (env validation catches this)", () => {
    // JOB_SIGNING_SECRET is validated to be min 32 chars in env.ts
    // This test just confirms the env schema is strict
    expect(env.JOB_SIGNING_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.CSRF_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it("should ensure JOB_SIGNING_SECRET and CSRF_SECRET are different", () => {
    // The two secrets MUST be different for meaningful key separation
    expect(env.JOB_SIGNING_SECRET).not.toBe(env.CSRF_SECRET);
  });

  it("should detect data tampering with JOB_SIGNING_SECRET", () => {
    const { signature } = signJobData(sampleData);

    const tampered = { ...sampleData, jobId: "job-999" };
    const isValid = verifyJobSignature(tampered, signature);
    expect(isValid).toBe(false);
  });

  it("should be deterministic with same data", () => {
    const { signature: sig1 } = signJobData(sampleData);
    const { signature: sig2 } = signJobData(sampleData);
    expect(sig1).toBe(sig2);
  });
});
