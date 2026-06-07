import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMagicLinkEmail } from "@/lib/email";
import { authRateLimit } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/email-normalize";
import { generateToken, hashToken, extractTokenPrefix } from "@/lib/crypto";
import { extractClientIP } from "@/lib/client-ip";
import { withCsrfProtection } from "@/lib/security/csrf-middleware";
import { ERROR_CODES, SUCCESS_CODES, badRequest, apiSuccess } from "@/lib/errors";
import { env } from "@/env";

const TOKEN_EXPIRY = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  const csrfResponse = await withCsrfProtection(req);
  if (csrfResponse) return csrfResponse;

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return badRequest(ERROR_CODES.ERR_VALIDATION_EMAIL_REQUIRED);
    }

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
      return badRequest(ERROR_CODES.ERR_VALIDATION_EMAIL_INVALID);
    }

    const hasRateLimit = await authRateLimit(normalizedEmail, extractClientIP(req) ?? undefined);

    if (!hasRateLimit) {
      return NextResponse.json({ error: ERROR_CODES.ERR_VALIDATION_RATE_LIMIT }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Clean up old tokens
    await prisma.magicLinkToken.deleteMany({
      where: {
        email: normalizedEmail,
        used: false,
        expires: { lt: new Date() },
      },
    });

    // Create new token and send email (even if user doesn't exist, for security)
    const rawToken = generateToken();
    const hashedToken = await hashToken(rawToken);
    const expires = new Date(Date.now() + TOKEN_EXPIRY);

    await prisma.magicLinkToken.create({
      data: {
        email: normalizedEmail,
        token: hashedToken,
        tokenPrefix: extractTokenPrefix(rawToken),
        expires,
        used: false,
      },
    });

    const magicLink = `${env.NEXTAUTH_URL}/auth/callback?token=${rawToken}`;

    try {
      await sendMagicLinkEmail(normalizedEmail, magicLink);
    } catch (emailError) {
      console.error(
        "Failed to send email:",
        emailError instanceof Error ? emailError.message : String(emailError),
      );
      return NextResponse.json({ error: ERROR_CODES.ERR_AUTH_FAILED }, { status: 500 });
    }

    return apiSuccess(SUCCESS_CODES.MSG_AUTH_MAGIC_SENT);
  } catch (error) {
    console.error("Magic link error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: ERROR_CODES.ERR_AUTH_FAILED }, { status: 500 });
  }
}
