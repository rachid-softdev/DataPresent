// ==========================================
// GET /api/v1/me — Current user profile (DTO)
// With an API key, returns the owning organization instead (DTO).
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { auth } from "@/lib/auth";
import { toOrgDTO, toUserDTO } from "@/lib/dto";
import { ERROR_CODES, notFound, unauthorized } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Session auth: return the user profile
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user) {
        return notFound(ERROR_CODES.ERR_RESOURCE_NOT_FOUND);
      }

      return NextResponse.json(toUserDTO(user));
    }

    // Fallback: API key auth (identifies the organization)
    const apiKey = await authenticateApiKey(request);
    if (!apiKey) {
      return unauthorized();
    }

    const org = await prisma.organization.findUnique({
      where: { id: apiKey.orgId },
    });

    if (!org) {
      return notFound(ERROR_CODES.ERR_RESOURCE_NOT_FOUND);
    }

    return NextResponse.json({ organization: toOrgDTO(org) });
  } catch (error) {
    console.error("[api/v1/me] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
