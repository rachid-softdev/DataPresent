-- ==========================================
-- Rename Plan tiers: FREE/PRO/TEAM/AGENCY -> FREE/STARTER/PRO/ULTRA
-- ==========================================
-- Final DB state (single-step, no intermediate renames):
--   FREE   (0€)   -> FREE
--   PRO    (19€)  -> STARTER
--   TEAM   (49€)  -> PRO
--   AGENCY (199€) -> ULTRA
--
-- NOTE: This migration must NOT be applied until a database is reachable.
-- It is prepared but intentionally unexecuted (see AGENTS.md).
-- Apply with: prisma migrate deploy (once DB is available).
-- ==========================================

-- 1. Create the new enum type with the final values
CREATE TYPE "Plan_new" AS ENUM ('FREE', 'STARTER', 'PRO', 'ULTRA');

-- 2. Re-map Subscription.plan (drop default first, restore after)
ALTER TABLE "Subscription" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "plan" TYPE "Plan_new"
  USING (CASE "plan"::text
    WHEN 'FREE'   THEN 'FREE'
    WHEN 'PRO'    THEN 'STARTER'
    WHEN 'TEAM'   THEN 'PRO'
    WHEN 'AGENCY' THEN 'ULTRA'
  END)::"Plan_new";
ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'FREE';

-- 3. Re-map PlanFeature.plan
ALTER TABLE "PlanFeature" ALTER COLUMN "plan" TYPE "Plan_new"
  USING (CASE "plan"::text
    WHEN 'FREE'   THEN 'FREE'
    WHEN 'PRO'    THEN 'STARTER'
    WHEN 'TEAM'   THEN 'PRO'
    WHEN 'AGENCY' THEN 'ULTRA'
  END)::"Plan_new";

-- 4. Swap enum types
DROP TYPE "Plan";
ALTER TYPE "Plan_new" RENAME TO "Plan";