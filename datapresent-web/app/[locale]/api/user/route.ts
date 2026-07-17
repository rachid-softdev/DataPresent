import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/errors";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { withCsrfProtection } from "@/lib/security";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      membership: {
        select: {
          orgId: true,
          role: true,
          org: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;

  const { confirm, password } = await req.json();

  // Check if user has a password set
  const storedPassword = await prisma.password.findUnique({
    where: { userId: session.user.id },
  });

  if (storedPassword) {
    // User has a password — require it for deletion
    if (!password) {
      return NextResponse.json(
        { error: "Password required for account deletion" },
        { status: 400 },
      );
    }
    const isValid = await verifyPassword(password, storedPassword.hash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 403 });
    }
  } else {
    // Magic Link only user — use existing confirmation
    if (!confirm) {
      return NextResponse.json(
        { error: "Confirmation required. Set confirm: true to delete your account." },
        { status: 400 },
      );
    }
  }

  await prisma.user.delete({
    where: { id: session.user.id },
  });

  return NextResponse.json({ success: true });
}
