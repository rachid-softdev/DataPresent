export interface ReportDTO {
  id: string;
  title: string;
  sector: string;
  status: string;
  orgId: string;
  slideCount: number;
  language: string;
  isPublic: boolean;
  allowComments: boolean;
  allowEmbed: boolean;
  shareToken: string | null;
  shareExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert a Prisma Report model (with optional relations) to a ReportDTO.
 * Strips internal fields like sharePassword.
 */
export function toReportDTO(report: {
  id: string;
  title: string;
  sector: string;
  status: string;
  orgId: string;
  slideCount: number;
  language: string;
  isPublic: boolean;
  allowComments: boolean;
  allowEmbed: boolean;
  shareToken: string | null;
  shareExpiresAt: Date | null;
  sharePassword?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ReportDTO {
  return {
    id: report.id,
    title: report.title,
    sector: report.sector,
    status: report.status,
    orgId: report.orgId,
    slideCount: report.slideCount,
    language: report.language,
    isPublic: report.isPublic,
    allowComments: report.allowComments,
    allowEmbed: report.allowEmbed,
    shareToken: report.shareToken,
    shareExpiresAt: report.shareExpiresAt?.toISOString() ?? null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}
