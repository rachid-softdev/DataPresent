import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllEntitlements } from "@/lib/entitlements/feature-gate";
import { getPlanPricing } from "@/lib/entitlements/plan-pricing";
import { badRequest, ERROR_CODES, unauthorized } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      membership: {
        include: {
          org: {
            include: {
              subscription: true,
              members: true,
            },
          },
        },
      },
    },
  });

  if (!user?.membership[0]) {
    return badRequest(ERROR_CODES.ERR_RESOURCE_NO_ORGANIZATION);
  }

  const org = user.membership[0].org;
  const subscription = org.subscription;
  const plan = subscription?.plan || "FREE";

  // Usage counters come from the same source the entitlement gate consumes
  // (UsageTracking) so what is displayed matches what is enforced.
  const entitlements = await getAllEntitlements(org.id);
  const reportsUsed = entitlements.usage.reportsPerMonth ?? 0;
  const reportsLimit = entitlements.limits.reportsPerMonth ?? null;
  const maxSlides = entitlements.limits.maxSlides ?? null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const exportsThisMonth = await prisma.export.findMany({
    where: {
      report: { orgId: org.id },
      createdAt: { gte: startOfMonth },
    },
    select: { format: true },
  });

  const exportCounts = { PPTX: 0, PDF: 0, DOCX: 0 };
  for (const exp of exportsThisMonth) {
    exportCounts[exp.format] += 1;
  }

  return NextResponse.json({
    plan,
    planName: getPlanPricing(plan).name,
    reports: {
      used: reportsUsed,
      limit: reportsLimit === null ? -1 : reportsLimit,
      remaining: reportsLimit === null ? -1 : Math.max(0, reportsLimit - reportsUsed),
    },
    slides: {
      used: 0,
      limit: maxSlides === null ? -1 : maxSlides,
    },
    members: org.members.length,
    exports: {
      thisMonth: exportCounts,
    },
  });
}
