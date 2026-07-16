import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { withCsrfProtection } from "@/lib/security";

/**
 * POST /api/reports/batch/delete
 * Delete multiple reports at once.
 * Body: { ids: string[] }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;

  const { ids } = (await req.json()) as { ids: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Aucun rapport sélectionné" }, { status: 400 });
  }

  if (ids.length > 50) {
    return NextResponse.json({ error: "Maximum 50 rapports par opération" }, { status: 400 });
  }

  // Verify all reports belong to the user's org
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { membership: { include: { org: { include: { members: true } } } } },
  });

  const org = user?.membership[0]?.org;
  if (!org) {
    return NextResponse.json({ error: "Aucune organisation trouvée" }, { status: 400 });
  }

  const isMember = org.members.some((m) => m.userId === session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Verify ownership — only delete reports belonging to this org
  const count = await prisma.report.count({
    where: {
      id: { in: ids },
      orgId: org.id,
    },
  });

  if (count !== ids.length) {
    return NextResponse.json(
      { error: "Certains rapports n'existent pas ou ne vous appartiennent pas" },
      { status: 403 },
    );
  }

  // Batch delete
  await prisma.report.deleteMany({
    where: {
      id: { in: ids },
      orgId: org.id,
    },
  });

  return NextResponse.json({ deleted: ids.length });
}
