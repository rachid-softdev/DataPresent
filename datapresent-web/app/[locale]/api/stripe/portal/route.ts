import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import { badRequest, ERROR_CODES, unauthorized } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { withCsrfProtection } from "@/lib/security";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { membership: { include: { org: { include: { subscription: true } } } } },
  });

  const org = user?.membership[0]?.org;
  if (!org?.subscription?.stripeCustomerId) {
    return badRequest(ERROR_CODES.ERR_RESOURCE_NO_SUBSCRIPTION);
  }

  const portalUrl = await getStripe().billingPortal.sessions.create({
    customer: org.subscription.stripeCustomerId,
    return_url: `${env.NEXTAUTH_URL}/settings/billing`,
  });

  return NextResponse.json({ url: portalUrl.url });
}
