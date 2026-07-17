import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { badRequest, ERROR_CODES, forbidden, notFound, unauthorized } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { withCsrfProtection } from "@/lib/security";

interface MembershipWithUser {
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const { id } = await params;

  const membership = await prisma.membership.findFirst({
    where: { orgId: id, userId: session.user.id },
  });

  if (!membership) {
    return forbidden();
  }

  const members = await prisma.membership.findMany({
    where: { orgId: id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { role: "asc" },
  });

  return NextResponse.json({
    members: (members as MembershipWithUser[]).map((m: MembershipWithUser) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;

  const membership = await prisma.membership.findFirst({
    where: { orgId: id, userId: session.user.id },
  });

  if (!membership || membership.role === "MEMBER") {
    return forbidden();
  }

  const { email, role = "MEMBER" } = await req.json();

  if (!email) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_REQUIRED);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return notFound(ERROR_CODES.ERR_RESOURCE_MEMBER_NOT_FOUND);
  }

  const existingMember = await prisma.membership.findFirst({
    where: { orgId: id, userId: user.id },
  });

  if (existingMember) {
    return badRequest(ERROR_CODES.ERR_RESOURCE_ALREADY_MEMBER);
  }

  await prisma.membership.create({
    data: {
      userId: user.id,
      orgId: id,
      role: role as "ADMIN" | "MEMBER",
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;
  const { userId } = await req.json();

  const membership = await prisma.membership.findFirst({
    where: { orgId: id, userId: session.user.id },
  });

  if (!membership || membership.role === "MEMBER") {
    return forbidden();
  }

  const targetMembership = await prisma.membership.findFirst({
    where: { orgId: id, userId },
  });

  if (!targetMembership) {
    return notFound(ERROR_CODES.ERR_RESOURCE_MEMBER_NOT_FOUND);
  }

  if (targetMembership.role === "OWNER") {
    return badRequest(ERROR_CODES.ERR_RESOURCE_OWNER_DELETE);
  }

  await prisma.membership.delete({
    where: { id: targetMembership.id },
  });

  return NextResponse.json({ success: true });
}
