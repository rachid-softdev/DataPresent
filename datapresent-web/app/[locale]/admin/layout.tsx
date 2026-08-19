import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AdminNav } from "@/components/admin/AdminNav";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Admin pages must never be indexed
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Role check on the user record itself (not the org membership)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <div className="min-h-screen">
        <AdminNav />
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
