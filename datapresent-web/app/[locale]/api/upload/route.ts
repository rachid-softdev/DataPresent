import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2";
import { isValidSector, VALID_SECTORS } from "@/lib/sector";
import { getGenerateQueue } from "@/lib/queue";
import { canCreateReport } from "@/lib/entitlements/compat";
import { getLimit } from "@/lib/entitlements/feature-gate";
import { checkRateLimit } from "@/lib/rate-limit";
import { signJobData } from "@/lib/queue/job-security";
import { ERROR_CODES, unauthorized, badRequest } from "@/lib/errors";
import { withCsrfProtection } from "@/lib/security/csrf-middleware";
import { logApiError } from "@/lib/security/error-logger";
import { validateMagicBytes } from "@/lib/upload-validation";
import { FileType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorized();
  }

  const csrfResponse = await withCsrfProtection(req, session.user.id);
  if (csrfResponse) return csrfResponse;

  try {
    // Rate limiting: 20 uploads per hour per user
    const rateLimitAllowed = await checkRateLimit(`upload:${session.user.id}`, {
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateLimitAllowed) {
      return NextResponse.json({ error: ERROR_CODES.ERR_VALIDATION_RATE_LIMIT }, { status: 429 });
    }

    const { allowed, upgrade } = await canCreateReport(session.user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: ERROR_CODES.ERR_RESOURCE_NOT_FOUND, upgrade },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const sector = formData.get("sector") as string;
    const slideCount = parseInt(formData.get("slideCount") as string) || 10;
    const language = (formData.get("language") as string) || "fr";

    if (!file || !sector) {
      return badRequest(ERROR_CODES.ERR_VALIDATION_FILE_REQUIRED);
    }

    // Validate sector against allowed enum values
    if (!isValidSector(sector)) {
      return NextResponse.json(
        { error: `Secteur invalide. Valeurs autorisées: ${VALID_SECTORS.join(", ")}` },
        { status: 400 },
      );
    }

    // Validate file MIME type
    const allowedMimeTypes = [
      "text/csv",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: ERROR_CODES.ERR_VALIDATION_FILE_REQUIRED },
        { status: 400 },
      );
    }

    // Validate file size (max 50 MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 50 MB)" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { membership: { include: { org: true } } },
    });

    const org = user?.membership[0]?.org;
    if (!org) {
      return badRequest(ERROR_CODES.ERR_RESOURCE_NO_ORGANIZATION);
    }

    // Validate slide count against plan
    const maxSlides = await getLimit(org.id, "maxSlides");
    if (maxSlides !== null && slideCount > maxSlides) {
      return NextResponse.json(
        { error: `Limite de ${maxSlides} slides atteinte pour ce rapport.` },
        { status: 403 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase();

    // Validate file content matches extension (magic bytes)
    if (!validateMagicBytes(buffer, ext || "")) {
      return NextResponse.json(
        { error: "Le fichier ne correspond pas au format attendu" },
        { status: 400 },
      );
    }

    const fileTypeMap: Record<string, FileType> = {
      csv: FileType.CSV,
      pdf: FileType.PDF,
      xlsx: FileType.XLSX,
      xls: FileType.XLSX,
      gsheet: FileType.GSHEET,
    };
    const fileType = fileTypeMap[ext || ""] ?? FileType.XLSX;

    const r2Key = `uploads/${org.id}/${Date.now()}-${file.name}`;
    await uploadToR2(r2Key, buffer, file.type);

    const report = await prisma.report.create({
      data: {
        title: file.name.replace(/\.[^/.]+$/, ""),
        sector,
        orgId: org.id,
        slideCount,
        language,
        sourceFile: {
          create: {
            filename: file.name,
            fileType,
            r2Key,
            sizeBytes: file.size,
          },
        },
      },
    });

    // SECURITY: Sign job data with userId for worker authorization
    const signedJob = signJobData({
      reportId: report.id,
      slideCount,
      language,
      userId: session.user.id,
    });
    const generateQueue = await getGenerateQueue();
    await generateQueue.add("generate", signedJob);

    return NextResponse.json({ reportId: report.id });
  } catch (error) {
    await logApiError(error as Error, {
      path: "/api/upload",
      method: "POST",
      userId: session.user.id,
    });
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
