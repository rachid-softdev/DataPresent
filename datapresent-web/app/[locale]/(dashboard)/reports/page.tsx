import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReportsPoller } from "@/components/reports/ReportsPoller";
import { ReportsFilter } from "@/components/reports/ReportsFilter";

const PAGE_SIZE = 20;

interface ReportsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const t = await getTranslations();
  const { page: pageParam } = await searchParams;
  const page = parseInt(pageParam || "1", 10);
  const skip = (page - 1) * PAGE_SIZE;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Get user with org and reports
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      membership: {
        include: {
          org: {
            include: {
              reports: {
                orderBy: { createdAt: "desc" },
                take: PAGE_SIZE,
                skip: skip,
              },
            },
          },
        },
      },
    },
  });

  const org = user?.membership[0]?.org;
  const reports: Array<{
    id: string;
    status: string;
    title: string;
    sector: string;
    createdAt: Date;
  }> =
    (org?.reports as Array<{
      id: string;
      title: string;
      sector: string;
      status: string;
      createdAt: Date;
    }>) || [];

  // Get total count for pagination
  const totalReports = await prisma.report.count({
    where: { orgId: org?.id },
  });

  const totalPages = Math.ceil(totalReports / PAGE_SIZE);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <div>
      <ReportsPoller reports={reports.map((r) => ({ id: r.id, status: r.status }))} />
      <div className="app-page-header">
        <div>
          <h1 className="app-heading app-heading-xl">{t("reports.title")}</h1>
        </div>
        <Link href="/new">
          <Button>{t("reports.new")}</Button>
        </Link>
      </div>

      <ReportsFilter
        reports={reports.map((r) => ({
          id: r.id,
          title: r.title,
          sector: r.sector,
          status: r.status,
          createdAt: r.createdAt,
        }))}
        page={page}
        totalPages={totalPages}
        totalReports={totalReports}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
      />
    </div>
  );
}
