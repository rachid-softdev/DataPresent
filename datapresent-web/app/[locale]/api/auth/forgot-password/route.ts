import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authRateLimit } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/email-normalize";
import { extractClientIP } from "@/lib/client-ip";
import { withCsrfProtection } from "@/lib/security/csrf-middleware";
import { logApiError } from "@/lib/security";
import { ERROR_CODES } from "@/lib/errors";
import { generateToken, hashToken, extractTokenPrefix } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const csrfResponse = await withCsrfProtection(req);
  if (csrfResponse) return csrfResponse;

  try {
    const { email: rawEmail } = await req.json();
    const email = normalizeEmail(rawEmail);

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Rate limiting: 3 requests per minute per email (Redis-based auth limiter)
    const rateLimitAllowed = await authRateLimit(email, extractClientIP(req) ?? undefined);
    if (!rateLimitAllowed) {
      return NextResponse.json({ error: ERROR_CODES.ERR_VALIDATION_RATE_LIMIT }, { status: 429 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    // Even if user doesn't exist, we don't reveal it

    if (!user) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset email has been sent.",
      });
    }

    // Delete any existing reset tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    // Generate reset token
    const rawToken = generateToken();
    const hashedToken = await hashToken(rawToken);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        email,
        token: hashedToken,
        tokenPrefix: extractTokenPrefix(rawToken),
        expires,
      },
    });

    // TODO: Send email with reset link
    // In production, you would send an email here using Resend or similar:
    // await sendPasswordResetEmail(email, rawToken)
    console.log(`[Password Reset] initiated for email: ${email}`);
    // NB: Le token ne doit pas apparaître dans les logs

    // In production, you would send an email here using Resend or similar:
    // await sendPasswordResetEmail(email, resetToken)

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset email has been sent.",
    });
  } catch (error) {
    await logApiError(error as Error, { path: "/api/auth/forgot-password", method: "POST" });
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
