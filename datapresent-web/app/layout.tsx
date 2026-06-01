import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Fraunces, DM_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: "DataPresent - Transformez vos données en présentations",
  description:
    "Générez des présentations professionnelles à partir de vos fichiers Excel, CSV, PDF ou Google Sheets",
  keywords: [
    "Excel",
    "présentation",
    "IA",
    "graphiques",
    "PowerPoint",
    "PDF",
    "rapport",
    "données",
  ],
  authors: [{ name: "DataPresent" }],
  creator: "DataPresent",
  publisher: "DataPresent",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://datapresent.com",
    siteName: "DataPresent",
    title: "DataPresent - Transformez vos données en présentations professionnelles",
    description:
      "Générez des présentations professionnelles à partir de vos fichiers Excel, CSV, PDF ou Google Sheets grâce à l'IA",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DataPresent - Générateur de présentations IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DataPresent - Transformez vos données en présentations",
    description: "Générez des présentations professionnelles grâce à l'IA",
    images: ["/og-image.png"],
    creator: "@datapresent",
  },
  alternates: {
    canonical: "https://datapresent.com",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read theme from cookie (set by client-side toggle) — server-side
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value ?? "light";

  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value ?? "fr";

  return (
    <html lang={localeCookie} suppressHydrationWarning data-theme={themeCookie}>
      <body className={`${fraunces.variable} ${dmSans.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
