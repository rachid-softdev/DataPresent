import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLimit } from "@/lib/entitlements/feature-gate";
import { badRequest, ERROR_CODES, unauthorized } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { withCsrfProtection } from "@/lib/security";

export async function GET(req: NextRequest) {
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
              _count: { select: { reports: true, members: true } },
            },
          },
        },
      },
    },
  });

  const organizations =
    user?.membership.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      slug: m.org.slug,
      role: m.role,
      reportCount: m.org._count.reports,
      memberCount: m.org._count.members,
      plan: m.org.subscription?.plan || "FREE",
    })) || [];

  return NextResponse.json({ organizations });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;

  const { name, slug } = await req.json();

  if (!name || !slug) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_SLUG_REQUIRED);
  }

  const existingSlug = await prisma.organization.findUnique({
    where: { slug },
  });

  if (existingSlug) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_SLUG_TAKEN);
  }

  // Enforce maxOrganizations limit (FREE/STARTER = 1 org)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { membership: { select: { orgId: true } } },
  });

  const currentOrgCount = user?.membership.length ?? 0;
  const primaryOrgId = user?.membership[0]?.orgId;

  if (primaryOrgId) {
    const maxOrgs = await getLimit(primaryOrgId, "maxOrganizations");
    // null limit = unlimited (PRO/ULTRA)
    if (maxOrgs !== null && currentOrgCount >= maxOrgs) {
      return NextResponse.json(
        {
          error: ERROR_CODES.ERR_RESOURCE_FORBIDDEN,
          upgrade: true,
          feature: "maxOrganizations",
          limit: maxOrgs,
          used: currentOrgCount,
        },
        { status: 403 },
      );
    }
  }

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
    },
    include: {
      members: true,
    },
  });

  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: "OWNER",
    },
  });
}
