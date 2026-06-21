import { Metadata } from "next";

interface ContactMetadataProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ContactMetadataProps): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    fr: "Contact - DataPresent | Contactez notre équipe",
    en: "Contact - DataPresent | Get in touch with our team",
  };

  const descriptions: Record<string, string> = {
    fr: "Contactez l'équipe DataPresent. Formulaire de contact, support technique, facturation et demandes de partenariat.",
    en: "Contact the DataPresent team. Contact form, technical support, billing and partnership inquiries.",
  };

  return {
    title: titles[locale] || titles.fr,
    description: descriptions[locale] || descriptions.fr,
    openGraph: {
      title: titles[locale] || titles.fr,
      description: descriptions[locale] || descriptions.fr,
      type: "website",
      locale: locale === "fr" ? "fr_FR" : "en_US",
      url: `/${locale}/contact`,
      siteName: "DataPresent",
    },
    alternates: {
      languages: {
        fr: "/fr/contact",
        en: "/en/contact",
      },
    },
  };
}
