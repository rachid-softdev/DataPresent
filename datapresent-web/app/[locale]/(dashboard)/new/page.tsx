import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLimit } from "@/lib/entitlements/feature-gate";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import NewReportForm from "./NewReportForm";

export default async function NewReportPage() {
  const t = await getTranslations();
  const session = await auth();

  // Default max is 20 for unauthenticated users
  let maxSlides = 20;

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { membership: { take: 1, select: { orgId: true } } },
    });

    if (user?.membership?.[0]?.orgId) {
      const limit = await getLimit(user.membership[0].orgId, "maxSlides");
      // If limit is null (unlimited), use a reasonable upper bound
      maxSlides = limit ?? 50;
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>
        <h1 className="app-heading app-heading-xl">{t("reports.new")}</h1>
        <p className="app-page-desc mt-1">{t("upload.title")}</p>
      </div>

      <NewReportForm maxSlides={maxSlides} />
    </div>
  );
}
