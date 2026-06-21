import { test, expect } from "@playwright/test";

const REQUIRED_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "REDIS_URL",
  "CSRF_SECRET",
  "JOB_SIGNING_SECRET",
] as const;

test.describe("Environment sanity", () => {
  for (const v of REQUIRED_VARS) {
    test(`${v} is defined`, () => {
      expect(process.env[v], `${v} must be defined`).toBeDefined();
    });
  }

  test("DATABASE_URL points to localhost test DB", () => {
    expect(process.env.DATABASE_URL).toContain("localhost");
    expect(process.env.DATABASE_URL).toContain("datapresent_test");
  });
});
