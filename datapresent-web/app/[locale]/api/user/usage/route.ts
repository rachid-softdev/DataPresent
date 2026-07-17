import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLimit } from "@/lib/entitlements/feature-gate";
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

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const reportsCount = await prisma.report.count({
    where: {
      orgId: org.id,
      createdAt: { gte: startOfMonth },
    },
  });

  const reportsLimit = await getLimit(org.id, "reportsPerMonth");

  return NextResponse.json({
    plan,
    planName: getPlanPricing(plan).name,
    reports: {
      used: reportsCount,
      limit: reportsLimit === null ? -1 : reportsLimit,
      remaining: reportsLimit === null ? -1 : Math.max(0, reportsLimit - reportsCount),
    },
    members: org.members.length,
    exports: {
      thisMonth: {
        PPTX: 0,
        PDF: 0,
        DOCX: 0,
      },
    },
  });
}
