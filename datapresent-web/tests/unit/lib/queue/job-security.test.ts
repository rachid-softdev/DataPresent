// ==========================================
// Job Security Tests
// ==========================================

import { describe, it, expect, vi } from "vitest";

// Mock crypto.randomBytes for consistent testing
vi.mock("crypto", async () => {
  const actual = await vi.importActual("crypto");
  return {
    ...actual,
  };
});

import { signJobData, verifyJobSignature, extractSignedJobData } from "@/lib/queue/job-security";

describe("job-security", () => {
  describe("signJobData", () => {
    it("should sign job data and return signature", () => {
      const data = { jobId: "job-123", type: "export", userId: "user-1" };
      const result = signJobData(data);

      expect(result.signature).toBeDefined();
      expect(result.signature.length).toBe(64); // SHA256 hex = 64 chars
    });

    it("should include original data in result", () => {
      const data = { jobId: "job-123", type: "export" };
      const result = signJobData(data);

      expect(result.data.jobId).toBe("job-123");
      expect(result.data.type).toBe("export");
    });

    it("should produce consistent signature for same data", () => {
      const data = { jobId: "job-123", type: "export" };

      const result1 = signJobData(data);
      const result2 = signJobData(data);

      expect(result1.signature).toBe(result2.signature);
    });
  });

  describe("verifyJobSignature", () => {
    it("should return true for valid signature", () => {
      const data = { jobId: "job-123", type: "export" };
      const { signature } = signJobData(data);

      const isValid = verifyJobSignature(data, signature);
      expect(isValid).toBe(true);
    });

    it("should return false for invalid signature", () => {
      const data = { jobId: "job-123", type: "export" };
      const invalidSignature = "a".repeat(64);

      const isValid = verifyJobSignature(data, invalidSignature);
      expect(isValid).toBe(false);
    });

    it("should return false for tampered data", () => {
      const data = { jobId: "job-123", type: "export" };
      const { signature } = signJobData(data);

      // Tamper with data
      const tamperedData = { jobId: "job-999", type: "export" };

      const isValid = verifyJobSignature(tamperedData, signature);
      expect(isValid).toBe(false);
    });

    it("should reject data that includes a signature field (must strip before verify)", () => {
      const data = { jobId: "job-123", type: "export" };
      const { signature } = signJobData(data);

      // verifyJobSignature hashes ALL keys in data, including 'signature'
      // Since signJobData did NOT include 'signature' in its hash, this will differ
      const dataWithSignature = { jobId: "job-123", type: "export", signature };

      const isValid = verifyJobSignature(dataWithSignature as any, signature);
      expect(isValid).toBe(false);
    });

    it("should verify correctly via extractSignedJobData (which strips signature first)", () => {
      const data = { jobId: "job-123", type: "export" };
      const { signature } = signJobData(data);

      const result = extractSignedJobData({ ...data, signature });

      expect(result.valid).toBe(true);
      expect(result.cleanData.signature).toBeUndefined();
    });
  });

  describe("extractSignedJobData", () => {
    it("should return valid=true and clean data when signature is valid", () => {
      const data = { jobId: "job-123", type: "export" };
      const { signature } = signJobData(data);

      const result = extractSignedJobData({ ...data, signature });

      expect(result.valid).toBe(true);
      expect(result.cleanData.jobId).toBe("job-123");
      expect(result.cleanData.signature).toBeUndefined();
    });

    it("should return valid=false when signature is missing", () => {
      const data = { jobId: "job-123", type: "export" };

      const result = extractSignedJobData(data);

      expect(result.valid).toBe(false);
      expect(result.cleanData.jobId).toBe("job-123");
    });

    it("should return valid=false when signature is invalid", () => {
      const data = { jobId: "job-123", type: "export", signature: "invalid" };

      const result = extractSignedJobData(data as any);

      expect(result.valid).toBe(false);
    });
  });
});
