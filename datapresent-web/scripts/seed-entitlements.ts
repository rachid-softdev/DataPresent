// ==========================================
// Seed Entitlements — Features & PlanFeatures
// ==========================================
// Populates the DB-backed entitlement system with the default feature
// catalog and per-plan limits/enables. Idempotent: safe to run multiple
// times. Mirrors the static values previously defined in
// lib/entitlements/compat.ts (PLANS + PLAN_FEATURES).
//
// Usage:
//   npx tsx scripts/seed-entitlements.ts        # upsert features + plan features
//   npx tsx scripts/seed-entitlements.ts --reset # delete all plan features first
// ==========================================

import path from "node:path";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load .env.local (Next.js convention) so DATABASE_URL resolves when the
// script is run outside `next dev` (Prisma CLI only reads .env).
const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, ".env") });
dotenv.config({ path: path.resolve(cwd, ".env.local") });

const prisma = new PrismaClient();

// ------------------------------------------------------------------
// Default feature catalog (key -> type + description)
// ------------------------------------------------------------------
const FEATURES: Array<{
  key: string;
  type: "BOOLEAN" | "LIMIT" | "EXPERIMENT";
  description: string;
}> = [
  { key: "reportsPerMonth", type: "LIMIT", description: "Rapports par mois" },
  { key: "maxSlides", type: "LIMIT", description: "Diapositives max par rapport" },
  { key: "maxOrganizations", type: "LIMIT", description: "Nombre d'organisations" },
  { key: "formatPPTX", type: "BOOLEAN", description: "Export PPTX" },
  { key: "formatPDF", type: "BOOLEAN", description: "Export PDF" },
  { key: "formatDOCX", type: "BOOLEAN", description: "Export DOCX" },
  { key: "collaboration", type: "BOOLEAN", description: "Collaboration équipe" },
  {
    key: "watermark",
    type: "BOOLEAN",
    description: "Watermark (présent sur les plans inférieurs)",
  },
  { key: "whiteLabel", type: "BOOLEAN", description: "White-label" },
  { key: "apiAccess", type: "BOOLEAN", description: "Accès API" },
  { key: "prioritySupport", type: "BOOLEAN", description: "Support prioritaire" },
  { key: "customDomain", type: "BOOLEAN", description: "Domaine personnalisé" },
];

// ------------------------------------------------------------------
// Per-plan defaults (kept in sync with lib/entitlements/compat.ts PLANS)
// -1 for a LIMIT means unlimited (stored as null limitValue)
// ------------------------------------------------------------------
const PLAN_DEFAULTS: Record<string, Record<string, boolean | number>> = {
  FREE: {
    reportsPerMonth: 3,
    maxSlides: 8,
    maxOrganizations: 1,
    formatPPTX: true,
    formatPDF: false,
    formatDOCX: false,
    collaboration: false,
    watermark: true,
    whiteLabel: false,
    apiAccess: false,
    prioritySupport: false,
    customDomain: false,
  },
  STARTER: {
    reportsPerMonth: 30,
    maxSlides: 20,
    maxOrganizations: 1,
    formatPPTX: true,
    formatPDF: true,
    formatDOCX: true,
    collaboration: false,
    watermark: false,
    whiteLabel: false,
    apiAccess: false,
    prioritySupport: false,
    customDomain: false,
  },
  PRO: {
    reportsPerMonth: -1,
    maxSlides: 30,
    maxOrganizations: -1,
    formatPPTX: true,
    formatPDF: true,
    formatDOCX: true,
    collaboration: true,
    watermark: false,
    whiteLabel: false,
    apiAccess: false,
    prioritySupport: false,
    customDomain: false,
  },
  ULTRA: {
    reportsPerMonth: -1,
    maxSlides: -1,
    maxOrganizations: -1,
    formatPPTX: true,
    formatPDF: true,
    formatDOCX: true,
    collaboration: true,
    watermark: false,
    whiteLabel: true,
    apiAccess: true,
    prioritySupport: true,
    customDomain: true,
  },
};

const LIMIT_KEYS = new Set(["reportsPerMonth", "maxSlides", "maxOrganizations"]);

async function main() {
  const reset = process.argv.includes("--reset");

  if (reset) {
    await prisma.planFeature.deleteMany();
    console.log("Cleared all PlanFeature rows");
  }

  // 1. Upsert features
  const featureIds: Record<string, string> = {};
  for (const f of FEATURES) {
    const upserted = await prisma.feature.upsert({
      where: { key: f.key },
      update: { type: f.type, description: f.description, isActive: true },
      create: {
        key: f.key,
        type: f.type,
        description: f.description,
        isActive: true,
      },
    });
    featureIds[f.key] = upserted.id;
  }
  console.log(`Upserted ${FEATURES.length} features`);

  // 2. Upsert plan features
  let count = 0;
  for (const [plan, values] of Object.entries(PLAN_DEFAULTS)) {
    for (const [key, value] of Object.entries(values)) {
      const featureId = featureIds[key];
      if (!featureId) {
        console.warn(`  ! Unknown feature key "${key}" for plan ${plan}, skipping`);
        continue;
      }
      const isLimit = LIMIT_KEYS.has(key);
      const limitValue = isLimit ? (value === -1 ? null : Number(value)) : null;
      const enabled = isLimit ? true : Boolean(value);

      await prisma.planFeature.upsert({
        where: {
          plan_featureId: {
            plan: plan as never,
            featureId,
          },
        },
        update: { enabled, limitValue, downgradeStrategy: "GRACEFUL" },
        create: {
          plan: plan as never,
          featureId,
          enabled,
          limitValue,
          downgradeStrategy: "GRACEFUL",
        },
      });
      count++;
    }
  }
  console.log(`Upserted ${count} plan features (${Object.keys(PLAN_DEFAULTS).length} plans)`);
  console.log("Entitlements seed complete");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
