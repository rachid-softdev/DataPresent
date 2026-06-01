import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { SlideViewer } from "@/components/slides/SlideViewer";
import { ReportActions } from "@/components/reports/ReportActions";
import { ReportDetailPoller } from "@/components/reports/ReportDetailPoller";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations();
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const report = await prisma.report.findFirst({
    where: {
      id,
      org: { members: { some: { userId: session.user.id } } },
    },
    include: {
      slides: { orderBy: { position: "asc" } },
      sourceFile: true,
    },
  });

  if (!report) {
    notFound();
  }

  const isProcessing = report.status === "PENDING" || report.status === "PROCESSING";

  return (
    <div>
      <div className="app-page-header">
        <div>
          <h1 className="app-heading app-heading-xl">{report.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge
              variant={
                report.status === "DONE"
                  ? "success"
                  : report.status === "ERROR"
                    ? "error"
                    : "warning"
              }
            >
              {t(`reports.status.${report.status.toLowerCase()}`)}
            </Badge>
            <span className="text-muted-foreground">{report.sector}</span>
          </div>
        </div>

        <ReportActions reportId={report.id} status={report.status} />
      </div>

      {isProcessing ? (
        <div className="text-center py-20">
          <ReportDetailPoller reportId={id} status={report.status} />
          <Spinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">{t("reports.status.generating")}</p>
        </div>
      ) : (
        <SlideViewer slides={report.slides} reportId={report.id} />
      )}
    </div>
  );
}
