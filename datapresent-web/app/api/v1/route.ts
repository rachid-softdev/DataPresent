// ==========================================
// GET|OPTIONS /api/v1 — API version info
// ==========================================

import { NextResponse } from "next/server";
import { API_VERSION, V1_ENDPOINTS } from "@/lib/api-versioning";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return NextResponse.json({
    version: API_VERSION,
    status: "stable",
    endpoints: V1_ENDPOINTS.map((ep) => ({
      path: ep.path,
      methods: ep.methods,
      description: ep.description,
    })),
  });
}
