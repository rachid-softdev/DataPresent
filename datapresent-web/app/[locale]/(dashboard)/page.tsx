import { ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { IntelligentEmptyState } from "@/components/onboarding/IntelligentEmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { ensureUserHasOrganization } from "@/lib/org";
import { prisma } from "@/lib/prisma";

const UsageCard = dynamic(
  () => import("@/components/usage/UsageCard").then((m) => ({ default: m.UsageCard })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  },
);

export default async function DashboardPage() {
  const t = await getTranslations();
  const session = await auth();

  if (!session?.user?.id) redirect("/login");

  await ensureUserHasOrganization(session.user.id, session.user.email || "");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      membership: {
        include: {
          org: {
            include: {
              reports: { orderBy: { createdAt: "desc" }, take: 6 },
              _count: { select: { reports: true } },
            },
          },
        },
      },
    },
  });

  // Best-effort report data
  const org = user?.membership[0]?.org;
  const reports =
    (org?.reports as Array<{
      id: string;
      title: string;
      sector: string;
      status: string;
      createdAt: Date;
    }>) || [];

  // Compute quick stats from full count + fetched subset
  const totalReports = org?._count?.reports ?? reports.length;
  const reportsThisMonth = reports.filter(
    (r) => r.createdAt && new Date(r.createdAt).getMonth() === new Date().getMonth(),
  ).length;
  const doneCount = reports.filter((r) => r.status === "DONE").length;
  const timeSavedEstimate = doneCount * 0.8; // ~47 seconds per report saved vs manual

  return (
    <div>
      <div className="app-page-header">
        <div>
          <h1 className="app-heading app-heading-xl">{t("dashboard.recentReports")}</h1>
        </div>
        <Link href="/new">
          <Button data-onboarding="new-report">{t("dashboard.newReport")}</Button>
        </Link>
      </div>

      {/* Quick stats strip — recessive, no icon boxes, compact */}
      {reports.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-8 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground font-semibold">{totalReports}</strong>{" "}
            {t("dashboard.statsTotal")}
          </span>
          <span aria-hidden="true" className="text-border">
            ·
          </span>
          <span>
            <strong className="text-foreground font-semibold">{reportsThisMonth}</strong>{" "}
            {t("dashboard.statsMonth")}
          </span>
          {reports.length > 0 && (
            <>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <span>
                <strong className="text-foreground font-semibold">
                  {Math.round((doneCount / reports.length) * 100)}%
                </strong>{" "}
                {t("dashboard.statsSuccessRate")}
              </span>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <span>
                <strong className="text-foreground font-semibold">~{timeSavedEstimate}h</strong>{" "}
                {t("dashboard.statsTimeSaved")}
              </span>
            </>
          )}
        </div>
      )}

      {reports.length === 0 ? (
        <IntelligentEmptyState />
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
              >
                <Card className="group hover:shadow-md hover:border-primary transition-all duration-200 cursor-pointer h-full relative">
                  <CardHeader>
                    <CardTitle className="text-lg pr-6">{report.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
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
                      <span className="text-sm text-muted-foreground">{report.sector}</span>
                    </div>
                  </CardContent>
                  <ChevronRight className="absolute top-4 right-4 w-5 h-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Card>
              </Link>
            ))}
          </div>

          {reports.length >= 6 && (
            <div className="text-center mb-8">
              <Link
                href="/reports"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {t("dashboard.seeAllReports")} &rarr;
              </Link>
            </div>
          )}

          {/* Usage — below the fold, not competing with primary content */}
          <div className="max-w-md">
            <UsageCard />
          </div>
        </>
      )}
    </div>
  );
}
