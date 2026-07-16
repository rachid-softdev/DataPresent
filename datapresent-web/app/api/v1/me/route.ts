// ==========================================
// GET /api/v1/me — Current user profile (DTO)
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toUserDTO } from "@/lib/dto";
import { ERROR_CODES, notFound, unauthorized } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return notFound(ERROR_CODES.ERR_RESOURCE_NOT_FOUND);
    }

    return NextResponse.json(toUserDTO(user));
  } catch (error) {
    console.error("[api/v1/me] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
