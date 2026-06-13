import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <KeyboardShortcuts>{children}</KeyboardShortcuts>
    </NextIntlClientProvider>
  );
}
