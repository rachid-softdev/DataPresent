import { NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/health-check";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await runHealthChecks();

  const statusCode = result.status === "ok" ? 200 : 503;

  return NextResponse.json(result, { status: statusCode });
}
