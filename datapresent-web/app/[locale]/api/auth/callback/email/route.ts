import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { verifyToken, extractTokenPrefix } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "errors.auth.invalidToken" }, { status: 400 });
    }

    const signInResult = await signIn("credentials", {
      token,
      redirect: false,
    });

    if (signInResult && typeof signInResult === "object" && "error" in signInResult) {
      return NextResponse.json(
        { error: signInResult.error || "errors.auth.failed" },
        { status: 401 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Email callback POST error:",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json({ error: "errors.auth.failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=errors.auth.invalidToken", req.url));
  }

  try {
    const tokenPrefix = extractTokenPrefix(token);

    // Find candidate tokens by tokenPrefix and verify
    const candidates = await prisma.magicLinkToken.findMany({
      where: {
        tokenPrefix,
        used: false,
        expires: { gt: new Date() },
      },
    });

    let magicLinkToken = null;
    for (const candidate of candidates) {
      if (await verifyToken(token, candidate.token)) {
        magicLinkToken = candidate;
        break;
      }
    }

    if (!magicLinkToken) {
      return NextResponse.redirect(new URL("/login?error=errors.auth.invalidToken", req.url));
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: magicLinkToken.email },
    });

    const isNewUser = !existingUser;

    const user =
      existingUser ||
      (await prisma.user.create({
        data: {
          email: magicLinkToken.email,
          name: magicLinkToken.email.split("@")[0],
        },
      }));

    if (isNewUser) {
      // Generate a unique slug: use timestamp + random to avoid collision
      const slug = `org-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
      await prisma.organization.create({
        data: {
          name: "Mon Entreprise",
          slug,
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
          subscription: {
            create: {
              stripeCustomerId: `cus_free_${Date.now()}`,
              plan: "FREE",
              status: "ACTIVE",
            },
          },
        },
      });
    }

    // Create a session via the credentials provider
    // NextAuth v5 sets session cookies via cookies() API which are
    // automatically applied to the final response
    const signInResult = await signIn("credentials", {
      token,
      redirect: false,
    });

    if (!signInResult || signInResult.error) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(signInResult?.error || "errors.auth.failed")}`,
          req.url,
        ),
      );
    }

    // Success: cookies are set, redirect to the URL from signIn or home
    const redirectUrl = signInResult.url || "/";
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  } catch (error) {
    console.error("Email callback error:", error instanceof Error ? error.message : String(error));
    return NextResponse.redirect(new URL("/login?error=errors.auth.failed", req.url));
  }
}
