import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractClientIP } from "@/lib/client-ip";

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403,
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

/**
 * Require the current user to be an admin.
 * Returns the userId if authorized.
 * Throws AdminAuthError if not.
 */
export async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AdminAuthError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    throw new AdminAuthError("Forbidden", 403);
  }

  return session.user.id;
}

interface AdminOptions {
  rateLimit?: {
    limit?: number;
    windowMs?: number;
  };
}

type Handler<T = unknown> = (
  req: NextRequest,
  context: {
    params: Promise<Record<string, string>>;
    session: { user: { id: string } };
    user: { role: string };
  },
) => Promise<NextResponse<T>>;

/**
 * Wrapper for admin API routes - handles auth, optional rate limiting, and error responses.
 * Usage: export const GET = withAdmin(handler, { rateLimit: { limit: 30, windowMs: 60 * 1000 } })
 */
export function withAdmin(handler: Handler, options?: AdminOptions) {
  return async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Optional rate limiting
      if (options?.rateLimit) {
        const ip = extractClientIP(req) ?? "unknown";
        const key = `admin:${session.user.id}:${ip}`;
        const allowed = await checkRateLimit(key, options.rateLimit);
        if (!allowed) {
          return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return handler(req, { ...context, session, user });
    } catch (error) {
      console.error("[admin] Error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
