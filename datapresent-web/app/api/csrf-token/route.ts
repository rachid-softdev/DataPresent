import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCsrfToken } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const token = generateCsrfToken(session?.user?.id);

    return NextResponse.json({ token });
  } catch (error) {
    console.error("[csrf-token] Error:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
