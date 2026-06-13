import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserHasOrganization } from "@/lib/org";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IntelligentEmptyState } from "@/components/onboarding/IntelligentEmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, BarChart3, Clock, CheckCircle2, Sparkles } from "lucide-react";

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
  const successRate = reports.length > 0 ? Math.round((doneCount / reports.length) * 100) : 0;
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

      {/* Quick stats strip */}
      {reports.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalReports}</p>
                <p className="text-xs text-muted-foreground">{t("dashboard.statsTotal")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reportsThisMonth}</p>
                <p className="text-xs text-muted-foreground">{t("dashboard.statsMonth")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{successRate}%</p>
                <p className="text-xs text-muted-foreground">{t("dashboard.statsSuccessRate")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">~{timeSavedEstimate}h</p>
                <p className="text-xs text-muted-foreground">{t("dashboard.statsTimeSaved")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-3">
          {reports.length === 0 ? (
            <IntelligentEmptyState />
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div className="mt-6 text-center">
                  <Link
                    href="/reports"
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {t("dashboard.seeAllReports")} &rarr;
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
        <div>
          <UsageCard />
        </div>
      </div>
    </div>
  );
}
