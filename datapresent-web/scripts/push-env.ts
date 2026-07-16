/**
 * Push environment variables from .env.production.local to Vercel
 * Run: npm run push:env
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Parse .env.production.local directly
const envFilePath = path.resolve(process.cwd(), ".env.production.local");
const envFile = fs.readFileSync(envFilePath, "utf-8");

const envVars: { key: string; value: string }[] = [];
envFile.split("\n").forEach((line) => {
  const trimmed = line.trim();
  // Skip comments and empty lines
  if (!trimmed || trimmed.startsWith("#")) return;

  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) return;

  const key = trimmed.substring(0, eqIndex).trim();
  const value = trimmed.substring(eqIndex + 1).trim();

  // Skip VERCEL_* vars
  if (key.startsWith("VERCEL_")) return;
  if (!value) return;

  envVars.push({ key, value });
});

console.log(`📤 Pushing ${envVars.length} environment variables to Vercel (production)...\n`);

for (const { key, value } of envVars) {
  try {
    const escapedValue = value.replace(/"/g, '\\"');
    const cmd = `vercel env add "${key}" production --value "${escapedValue}" --force --yes`;
    execSync(cmd, { stdio: "pipe" });
    console.log(`  ✅ ${key}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  ⚠️  ${key} - ${message.split("\n")[0] || "error"}`);
  }
}

console.log(`\n✅ Push complete!`);
