import { NextRequest, NextResponse } from "next/server";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api-keys";
import { auth } from "@/lib/auth";
import { hasFeature } from "@/lib/entitlements/feature-gate";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/security";

async function getOrgId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { membership: { include: { org: true } } },
  });
  return user?.membership[0]?.org?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Only Agency plan has API access
    const hasApiAccess = await hasFeature(orgId, "apiAccess");
    if (!hasApiAccess) {
      return NextResponse.json({ error: "API access not available on your plan" }, { status: 403 });
    }

    const keys = await listApiKeys(orgId);

    return NextResponse.json({
      keys,
      hasApiAccess,
    });
  } catch (error) {
    console.error("Failed to list API keys:", error);
    return NextResponse.json({ error: "Failed to list API keys" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;

  try {
    const orgId = await getOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Only Agency plan has API access
    const hasApiAccess = await hasFeature(orgId, "apiAccess");
    if (!hasApiAccess) {
      return NextResponse.json({ error: "API access not available on your plan" }, { status: 403 });
    }

    // Rate limit: 10 API key creations per hour per org
    const rateLimitAllowed = await checkRateLimit(`api-key-create:${orgId}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateLimitAllowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez plus tard." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { name, expiresInDays } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: "Name must be less than 100 characters" }, { status: 400 });
    }

    const result = await createApiKey({
      orgId,
      name: name.trim(),
      expiresInDays: expiresInDays ? parseInt(expiresInDays) : 365,
    });

    return NextResponse.json({
      key: result.key, // Only returned once!
      apiKey: result.apiKey,
    });
  } catch (error) {
    console.error("Failed to create API key:", error);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;

  try {
    const orgId = await getOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const hasApiAccess = await hasFeature(orgId, "apiAccess");
    if (!hasApiAccess) {
      return NextResponse.json({ error: "API access not available on your plan" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "Key ID is required" }, { status: 400 });
    }

    const success = await revokeApiKey(keyId, orgId);

    if (!success) {
      return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to revoke API key:", error);
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }
}
