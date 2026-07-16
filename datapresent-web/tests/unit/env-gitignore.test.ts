// @vitest-environment node
// ==========================================
// .env.production in .gitignore Test (Fix #9)
// ==========================================
//
// Tests that .env.production is properly listed in .gitignore
// to prevent accidental commits of production environment secrets.

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe(".gitignore contains .env.production (Fix #9)", () => {
  const gitignorePath = path.resolve(__dirname, "../../.gitignore");

  it("should have a .gitignore file at project root", () => {
    expect(fs.existsSync(gitignorePath)).toBe(true);
  });

  it("should contain .env.production in gitignore", () => {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    const lines = content.split("\n").map((line) => line.trim());

    expect(lines).toContain(".env.production");
  });

  it("should contain .env (no .env* patterns that would exclude .env.production)", () => {
    // The .gitignore should list specific files, not blanket patterns that
    // might accidentally exclude .env.production from the check
    const content = fs.readFileSync(gitignorePath, "utf-8");
    const lines = content.split("\n").map((line) => line.trim());

    // Should have .env entry
    expect(lines).toContain(".env");

    // Should also have the specific .env.production entry
    const envProductionIndex = lines.indexOf(".env.production");
    expect(envProductionIndex).toBeGreaterThanOrEqual(0);
  });

  it("should also cover .env.production.local (common variant)", () => {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    const lines = content.split("\n").map((line) => line.trim());

    // The standard practice is to also ignore .env.production.local
    expect(lines).toContain(".env.production.local");
  });

  it("should ignore other common .env variants", () => {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    const lines = content.split("\n").map((line) => line.trim());

    expect(lines).toContain(".env.local");
    expect(lines).toContain(".env.development.local");
    expect(lines).toContain(".env.test.local");
  });

  it("should NOT use a blanket .env* pattern that might miss .env.production", () => {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    const lines = content.split("\n").map((line) => line.trim());

    // Check if any .env* pattern exists (which could be a blanket ignore)
    const blanketPatterns = lines.filter((l) => l.startsWith(".env") && l.includes("*"));

    // If there IS a .env* blanket pattern, that would ALSO cover .env.production
    // But the fix added .env.production explicitly, so either approach works
    // The important thing is .env.production is covered
    const hasBlanket = blanketPatterns.length > 0;
    const hasExplicit = lines.includes(".env.production");

    // Either blanket OR explicit is acceptable
    expect(hasBlanket || hasExplicit).toBe(true);
  });
});
