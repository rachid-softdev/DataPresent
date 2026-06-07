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
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle } from "lucide-react";

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
        include: { org: { include: { reports: { orderBy: { createdAt: "desc" }, take: 6 } } } },
      },
    },
  });

  const reports = user?.membership[0]?.org?.reports || [];

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

      <div className="grid lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-3">
          {reports.length === 0 ? (
            <EmptyState
              icon={PlusCircle}
              title={t("dashboard.noReports")}
              description={t("dashboard.noReportsDesc")}
              action={{ label: t("dashboard.newReport"), href: "/new" }}
            />
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                  <Link key={report.id} href={`/reports/${report.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardHeader>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
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
