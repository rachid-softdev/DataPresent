// ==========================================
// Staging: Setup Neon database branch
// Usage: npx tsx scripts/staging/setup-db.ts
// ==========================================
//
// This script creates a staging database branch using Neon's branching API
// or falls back to running Prisma migrations against the DATABASE_URL.
//
// Prerequisites:
//   - DATABASE_URL env var pointing to the Neon primary database
//   - (Optional) NEON_API_KEY for automatic branch creation
//
// Outputs:
//   - The new staging database URL

import { execSync } from "node:child_process";

interface SetupResult {
  success: boolean;
  databaseUrl: string;
  branchName: string;
  message: string;
}

async function main(): Promise<void> {
  const primaryUrl = process.env.DATABASE_URL;

  if (!primaryUrl) {
    console.error("FATAL: DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  const branchName = `staging-${new Date().toISOString().slice(0, 10)}`;
  const neonApiKey = process.env.NEON_API_KEY;

  let result: SetupResult;

  if (neonApiKey) {
    // Attempt to create a Neon branch via API
    try {
      const projectId = extractNeonProjectId(primaryUrl);

      if (!projectId) {
        throw new Error("Could not extract Neon project ID from DATABASE_URL");
      }

      console.log(`Creating Neon branch '${branchName}' for project ${projectId}...`);

      const response = await fetch(
        `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${neonApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            branch: { name: branchName },
            endpoint: { type: "read_write" },
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Neon API error (${response.status}): ${errorBody}`);
      }

      const data = (await response.json()) as {
        branch: { id: string };
        endpoints: Array<{ host: string; id: string }>;
      };

      // Build new database URL from the branch endpoint
      const endpoint = data.endpoints[0];
      const baseUrl = new URL(primaryUrl);
      baseUrl.hostname = endpoint.host;
      const newUrl = baseUrl.toString();

      console.log(`Running migrations on staging branch...`);
      execSync("npx prisma migrate deploy", {
        env: { ...process.env, DATABASE_URL: newUrl },
        stdio: "inherit",
      });

      result = {
        success: true,
        databaseUrl: newUrl,
        branchName,
        message: `Neon branch '${branchName}' created and migrations applied.`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Neon branch creation failed: ${message}`);
      console.log("Falling back to direct migration on DATABASE_URL...");
      result = await runLocalMigration(primaryUrl, branchName);
    }
  } else {
    console.log("NEON_API_KEY not set. Running migrations directly on DATABASE_URL...");
    result = await runLocalMigration(primaryUrl, branchName);
  }

  console.log("\n=== Setup Result ===");
  // Mask password before logging
  const safeResult = { ...result, databaseUrl: maskPassword(result.databaseUrl) };
  console.log(JSON.stringify(safeResult, null, 2));

  if (result.success) {
    const safeUrl = maskPassword(result.databaseUrl);
    console.log(`\nStaging database URL:\n${safeUrl}`);
    process.exit(0);
  } else {
    console.error("\nStaging database setup failed.");
    process.exit(1);
  }
}

async function runLocalMigration(databaseUrl: string, branchName: string): Promise<SetupResult> {
  try {
    console.log("Running Prisma migrations...");
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    });

    return {
      success: true,
      databaseUrl,
      branchName,
      message: "Migrations applied directly on the database URL.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      databaseUrl,
      branchName,
      message: `Migration failed: ${message}`,
    };
  }
}

/**
 * Extract the Neon project ID from a DATABASE_URL.
 * Neon URLs look like: postgresql://user:pass@ep-xx-xx.us-east-2.aws.neon.tech/neondb
 * The project ID is the part after 'ep-' in the hostname.
 */
/** Mask the password portion of a database connection URL for safe logging */
function maskPassword(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    if (url.password) {
      url.password = "****";
    }
    return url.toString();
  } catch {
    return databaseUrl.replace(/:[^:@]+@/, ":****@");
  }
}

function extractNeonProjectId(databaseUrl: string): string | null {
  // Allow explicit override via NEON_PROJECT_ID env var
  if (process.env.NEON_PROJECT_ID) return process.env.NEON_PROJECT_ID;
  try {
    const url = new URL(databaseUrl);
    const hostParts = url.hostname.split(".");
    const epPart = hostParts[0]; // e.g. "ep-silent-rain-123456"
    return epPart || null;
  } catch {
    return null;
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
