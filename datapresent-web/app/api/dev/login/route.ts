import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

/**
 * DEV-ONLY endpoint to obtain a real authenticated session cookie.
 *
 * Never active in production (guarded by NODE_ENV). Upserts a known dev user
 * and signs them in via the app's own Credentials provider (id: "password"),
 * producing a valid NextAuth session cookie that can be reused by E2E / Playwright flows.
 *
 * Usage (dev):  POST /api/dev/login  ->  capture the `Set-Cookie` response header.
 */
const DEV_EMAIL = "dev@local.dev";
const DEV_PASSWORD = "dev-password-123";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const passwordHash = await hashPassword(DEV_PASSWORD);

  await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    update: {},
    create: { email: DEV_EMAIL, name: "Dev User" },
  });

  // Password is stored in a dedicated `Password` model keyed by userId.
  const user = await prisma.user.findUnique({ where: { email: DEV_EMAIL } });
  if (user) {
    await prisma.password.upsert({
      where: { userId: user.id },
      update: { hash: passwordHash },
      create: { userId: user.id, hash: passwordHash },
    });
  }

  const result = await signIn("password", {
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
    redirect: false,
  });

  if (result?.error) {
    return NextResponse.json(
      { error: "Dev sign-in failed", detail: result.error },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true, email: DEV_EMAIL });
}
