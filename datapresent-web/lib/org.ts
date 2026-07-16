import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function ensureUserHasOrganization(userId: string, email: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId },
  });

  if (membership) {
    return membership.orgId;
  }

  const nameFromEmail = email.split("@")[0];
  const baseSlug = nameFromEmail.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Atomic create with retry on unique constraint violation
  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const suffix = crypto.randomBytes(4).toString("base64url");
    const slug =
      attempt === 0 ? baseSlug.substring(0, 50) : `${baseSlug.substring(0, 40)}-${suffix}`;
    try {
      const org = await prisma.organization.create({
        data: {
          name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
          slug,
          members: {
            create: { userId, role: "OWNER" },
          },
        },
      });
      return org.id;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        if (attempt === MAX_RETRIES - 1) throw error;
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to create organization after multiple attempts");
}

export async function getUserOrganizations(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      org: {
        include: {
          subscription: true,
          _count: { select: { reports: true, members: true } },
        },
      },
    },
  });

  return memberships.map((m) => ({
    id: m.org.id,
    name: m.org.name,
    slug: m.org.slug,
    role: m.role,
    plan: m.org.subscription?.plan || "FREE",
    reportCount: m.org._count.reports,
    memberCount: m.org._count.members,
  }));
}
