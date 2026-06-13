import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import Link from "next/link";
import { Check, Minus, HelpCircle } from "lucide-react";

interface PricingPageProps {
  params: Promise<{ locale: string }>;
}

// ── Plan definitions ──────────────────────────────────────────────

interface Plan {
  key: string;
  price: string;
  href: string;
  btnVariant: "primary" | "outline";
  popular: boolean;
  features: Record<string, string | boolean>;
}

const PLANS: Plan[] = [
  {
    key: "free",
    price: "0€",
    href: "/signup",
    btnVariant: "outline",
    popular: false,
    features: {
      reports: "3",
      exportPDF: true,
      exportPPTX: false,
      exportWord: false,
      noWatermark: false,
      aiBasic: true,
      aiAdvanced: false,
      premiumTemplates: false,
      teamCollaboration: false,
      sharedSpaces: false,
      customRoles: false,
      apiAccess: false,
      apiFull: false,
      whiteLabel: false,
      supportEmail: true,
      supportPriority: false,
      supportDedicated: false,
      accountManager: false,
      sla: false,
    },
  },
  {
    key: "pro",
    price: "29€",
    href: "/signup?plan=pro",
    btnVariant: "primary",
    popular: true,
    features: {
      reports: "30",
      exportPDF: true,
      exportPPTX: true,
      exportWord: true,
      noWatermark: true,
      aiBasic: true,
      aiAdvanced: true,
      premiumTemplates: true,
      teamCollaboration: false,
      sharedSpaces: false,
      customRoles: false,
      apiAccess: false,
      apiFull: false,
      whiteLabel: false,
      supportEmail: true,
      supportPriority: true,
      supportDedicated: false,
      accountManager: false,
      sla: false,
    },
  },
  {
    key: "team",
    price: "79€",
    href: "/signup?plan=team",
    btnVariant: "outline",
    popular: false,
    features: {
      reports: "100",
      exportPDF: true,
      exportPPTX: true,
      exportWord: true,
      noWatermark: true,
      aiBasic: true,
      aiAdvanced: true,
      premiumTemplates: true,
      teamCollaboration: true,
      sharedSpaces: true,
      customRoles: true,
      apiAccess: true,
      apiFull: false,
      whiteLabel: false,
      supportEmail: true,
      supportPriority: true,
      supportDedicated: true,
      accountManager: false,
      sla: false,
    },
  },
];

// ── Feature matrix for comparison table ──────────────────────────

interface FeatureRow {
  categoryKey: string;
  rows: {
    featureKey: string;
    getValue: (plan: Plan) => string | boolean;
  }[];
}

function buildFeatureMatrix(
  t: (key: string, values?: Record<string, unknown>) => string,
): FeatureRow[] {
  return [
    {
      categoryKey: "pricing.features.reports",
      rows: [
        {
          featureKey: "pricing.features.reportsPerMonth",
          getValue: (plan) => {
            if (plan.features.reports === "unlimited") return t("pricing.features.unlimited");
            return t("pricing.features.reportsLimit", { count: plan.features.reports as string });
          },
        },
      ],
    },
    {
      categoryKey: "pricing.features.export",
      rows: [
        { featureKey: "pricing.features.exportPDF", getValue: (plan) => plan.features.exportPDF },
        { featureKey: "pricing.features.exportPPTX", getValue: (plan) => plan.features.exportPPTX },
        { featureKey: "pricing.features.exportWord", getValue: (plan) => plan.features.exportWord },
        {
          featureKey: "pricing.features.noWatermark",
          getValue: (plan) => plan.features.noWatermark,
        },
      ],
    },
    {
      categoryKey: "pricing.features.collaboration",
      rows: [
        {
          featureKey: "pricing.features.teamCollaboration",
          getValue: (plan) => plan.features.teamCollaboration,
        },
        {
          featureKey: "pricing.features.sharedSpaces",
          getValue: (plan) => plan.features.sharedSpaces,
        },
        {
          featureKey: "pricing.features.customRoles",
          getValue: (plan) => plan.features.customRoles,
        },
      ],
    },
    {
      categoryKey: "pricing.features.support",
      rows: [
        {
          featureKey: "pricing.features.supportEmail",
          getValue: (plan) => plan.features.supportEmail,
        },
        {
          featureKey: "pricing.features.supportPriority",
          getValue: (plan) => plan.features.supportPriority,
        },
        {
          featureKey: "pricing.features.supportDedicated",
          getValue: (plan) => plan.features.supportDedicated,
        },
        {
          featureKey: "pricing.features.accountManager",
          getValue: (plan) => plan.features.accountManager,
        },
        { featureKey: "pricing.features.sla", getValue: (plan) => plan.features.sla },
      ],
    },
    {
      categoryKey: "pricing.features.apiAccess",
      rows: [
        { featureKey: "pricing.features.apiAccess", getValue: (plan) => plan.features.apiAccess },
        { featureKey: "pricing.features.apiFull", getValue: (plan) => plan.features.apiFull },
      ],
    },
    {
      categoryKey: "pricing.features.whiteLabel",
      rows: [
        { featureKey: "pricing.features.whiteLabel", getValue: (plan) => plan.features.whiteLabel },
      ],
    },
  ];
}

// ── Metadata ──────────────────────────────────────────────────────

export async function generateMetadata({ params }: PricingPageProps): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    fr: "Tarifs - DataPresent",
    en: "Pricing - DataPresent",
  };

  const descriptions: Record<string, string> = {
    fr: "Découvrez nos forfaits pour générer des présentations professionnelles avec l'IA. Gratuit, Pro, Team ou Agency — trouvez le plan adapté à vos besoins.",
    en: "Explore our plans to generate AI-powered professional presentations. Free, Pro, Team, or Agency — find the right plan for your needs.",
  };

  return {
    title: titles[locale] || titles.fr,
    description: descriptions[locale] || descriptions.fr,
    openGraph: {
      title: titles[locale] || titles.fr,
      description: descriptions[locale] || descriptions.fr,
      type: "website",
      locale: locale === "fr" ? "fr_FR" : "en_US",
      alternateLocale: locale === "fr" ? "en_US" : "fr_FR",
      url: `/${locale === "fr" ? "" : "en"}/pricing`,
      siteName: "DataPresent",
    },
    twitter: {
      card: "summary_large_image",
    },
    alternates: {
      languages: {
        fr: "/pricing",
        en: "/en/pricing",
      },
    },
  };
}

// ── FAQ data helper ───────────────────────────────────────────────

interface FaqItem {
  q: string;
  a: string;
}

function getFaqItems(locale: string): FaqItem[] {
  if (locale === "en") {
    return [
      {
        q: "Can I change my plan at any time?",
        a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and you are billed pro-rata for the current month.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept credit cards (Visa, Mastercard), SEPA transfers, and invoice payment for Team and Agency plans.",
      },
      {
        q: "Is there a minimum commitment?",
        a: "No commitment required. All plans are monthly and you can cancel anytime. Discounts are available for annual subscriptions.",
      },
      {
        q: "What happens if I exceed my report quota?",
        a: "You will be notified when you reach 80% of your quota. If you exceed it, you can upgrade your plan or wait until the next month when your quota resets.",
      },
    ];
  }

  return [
    {
      q: "Puis-je changer de plan à tout moment ?",
      a: "Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment. Le changement est immédiat et vous êtes facturé au prorata du mois en cours.",
    },
    {
      q: "Quels modes de paiement acceptez-vous ?",
      a: "Nous acceptons les cartes bancaires (Visa, Mastercard), les virements SEPA, et le paiement par facture pour les plans Team et Agency.",
    },
    {
      q: "Y a-t-il un engagement de durée ?",
      a: "Aucun engagement. Tous nos forfaits sont mensuels et vous pouvez résilier à tout moment. Des remises sont disponibles pour les abonnements annuels.",
    },
    {
      q: "Que se passe-t-il si je dépasse mon quota de rapports ?",
      a: "Vous serez notifié lorsque vous atteignez 80 % de votre quota. Si vous le dépassez, vous pouvez passer au plan supérieur ou attendre le mois suivant pour que le quota soit réinitialisé.",
    },
  ];
}

// ── Page component ────────────────────────────────────────────────

export default async function PricingPage({ params }: PricingPageProps) {
  const { locale } = await params;
  const t = await getTranslations();

  const featureMatrix = buildFeatureMatrix(
    t as (key: string, values?: Record<string, unknown>) => string,
  );
  const faqItems = getFaqItems(locale);

  // ── JSON-LD ──────────────────────────────────────────────────────

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: t("pricing.jsonld.name"),
    description: t("pricing.jsonld.description"),
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: t(`pricing.plans.${plan.key}.name`),
      description: t(`pricing.plans.${plan.key}.description`),
      price: plan.price,
      priceCurrency: t("pricing.jsonld.priceCurrency"),
      availability: "https://schema.org/InStock",
      url: `https://datapresent.com${plan.href}`,
    })),
    // Agency plan available on request
    brand: {
      "@type": "Brand",
      name: "DataPresent",
    },
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-background">
        {/* ── Hero ────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden px-6 pt-20 pb-16 md:pt-28 md:pb-20"
          style={{
            background: "linear-gradient(180deg, var(--background) 0%, #ffffff 100%)",
          }}
        >
          {/* Decorative ambient glow */}
          <div
            className="pointer-events-none absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-4xl text-center">
            <h1 className="app-heading app-heading-xl mb-4">{t("pricing.page.title")}</h1>
            <p className="app-page-desc mx-auto max-w-xl text-lg">{t("pricing.page.subtitle")}</p>
          </div>
        </section>

        {/* ── Plan cards ──────────────────────────────────────── */}
        <section className="px-6 pb-8">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PLANS.map((plan) => {
                const planName = t(`pricing.plans.${plan.key}.name`);
                const planDesc = t(`pricing.plans.${plan.key}.description`);
                const ctaText = t(`pricing.plans.${plan.key}.cta`);
                const badgeLocaleKey = locale === "en" ? "Most popular" : "Populaire";
                const showBadge = plan.popular;

                return (
                  <div
                    key={plan.key}
                    className={
                      "app-card relative flex flex-col transition-all duration-300 hover:-translate-y-1 " +
                      (plan.popular ? "border-primary ring-1 ring-primary" : "")
                    }
                  >
                    {/* Badge */}
                    {showBadge && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                        {badgeLocaleKey}
                      </span>
                    )}

                    <div className="app-card-header flex-1">
                      {/* Plan name */}
                      <h3 className="app-heading app-heading-lg mb-1">{planName}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{planDesc}</p>

                      {/* Price */}
                      <div className="mb-4 flex items-baseline gap-1">
                        <span
                          className="font-semibold tracking-tight"
                          style={{
                            fontFamily: "var(--font-fraunces), Fraunces, Georgia, serif",
                            fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
                            lineHeight: 1,
                          }}
                        >
                          {plan.price}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {t("pricing.perMonth")}
                        </span>
                      </div>

                      {/* Feature list */}
                      <ul className="space-y-2.5">
                        {(
                          [
                            { key: "exportPDF", label: t("pricing.features.exportPDF") },
                            { key: "exportPPTX", label: t("pricing.features.exportPPTX") },
                            { key: "exportWord", label: t("pricing.features.exportWord") },
                            { key: "noWatermark", label: t("pricing.features.noWatermark") },
                            { key: "aiBasic", label: t("pricing.features.aiBasic") },
                            { key: "aiAdvanced", label: t("pricing.features.aiAdvanced") },
                            {
                              key: "premiumTemplates",
                              label: t("pricing.features.premiumTemplates"),
                            },
                            {
                              key: "teamCollaboration",
                              label: t("pricing.features.teamCollaboration"),
                            },
                            { key: "apiAccess", label: t("pricing.features.apiAccess") },
                            { key: "whiteLabel", label: t("pricing.features.whiteLabel") },
                            {
                              key: "supportPriority",
                              label: t("pricing.features.supportPriority"),
                            },
                            {
                              key: "supportDedicated",
                              label: t("pricing.features.supportDedicated"),
                            },
                            { key: "accountManager", label: t("pricing.features.accountManager") },
                          ] as const
                        )
                          .filter((feat) => plan.features[feat.key] === true)
                          .slice(0, 6)
                          .map((feat) => (
                            <li key={feat.key} className="flex items-start gap-2.5 text-sm">
                              <Check
                                className="mt-0.5 h-4 w-4 flex-shrink-0"
                                style={{ color: "var(--accent)" }}
                                aria-hidden="true"
                              />
                              <span>{feat.label}</span>
                            </li>
                          ))}
                      </ul>
                    </div>

                    {/* CTA */}
                    <div className="app-card-footer">
                      <Link
                        href={plan.href}
                        className={`w-full text-center ${
                          plan.btnVariant === "primary"
                            ? "app-btn app-btn-primary"
                            : "app-btn app-btn-outline"
                        }`}
                      >
                        {ctaText}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Agency upsell ─────────────────────────────────── */}
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {locale === "en"
                  ? "Need more for your agency or enterprise?"
                  : "Besoin de plus pour votre agence ou entreprise ?"}
              </p>
              <Link href="/contact" className="app-btn app-btn-outline">
                {locale === "en" ? "Contact our team" : "Contacter notre équipe"}
              </Link>
            </div>
          </div>
        </section>

        {/* ── Comparison table ────────────────────────────────── */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <h2 className="app-heading app-heading-xl mb-2">{t("pricing.table.title")}</h2>
              <p className="app-page-desc">{t("pricing.table.subtitle")}</p>
            </div>

            {/* Scrollable wrapper — override app-table-wrap overflow */}
            <div className="app-table-wrap" style={{ overflow: "auto" }}>
              <table className="app-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-muted" style={{ minWidth: 180 }}>
                      {t("pricing.table.feature")}
                    </th>
                    {PLANS.map((plan) => {
                      const planName = t(`pricing.plans.${plan.key}.name`);
                      return (
                        <th
                          key={plan.key}
                          className={
                            "text-center " +
                            (plan.popular ? "bg-primary text-primary-foreground" : "")
                          }
                          style={{ minWidth: 120 }}
                        >
                          {planName}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {featureMatrix.flatMap((category, ci) => {
                    // Category header row
                    const categoryRow = (
                      <tr key={`cat-${ci}`}>
                        <td
                          className="sticky left-0 z-10 bg-surface font-semibold text-foreground"
                          colSpan={PLANS.length + 1}
                          style={{ fontSize: "0.8rem" }}
                        >
                          {t(category.categoryKey)}
                        </td>
                      </tr>
                    );

                    // Feature rows for this category
                    const featureRows = category.rows.map((row, ri) => {
                      const featureName = t(row.featureKey);
                      return (
                        <tr key={`row-${ci}-${ri}`}>
                          <td className="sticky left-0 z-10 bg-surface text-sm">{featureName}</td>
                          {PLANS.map((plan) => {
                            const val = row.getValue(plan);
                            const isPopular = plan.popular;

                            if (typeof val === "boolean") {
                              return (
                                <td
                                  key={plan.key}
                                  className={
                                    "text-center " + (isPopular ? "bg-primary/[0.03]" : "")
                                  }
                                >
                                  {val ? (
                                    <span
                                      className="inline-flex items-center justify-center"
                                      title={t("pricing.table.included")}
                                    >
                                      <Check
                                        className="h-4 w-4"
                                        style={{ color: "var(--accent)" }}
                                        aria-hidden="true"
                                      />
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center justify-center"
                                      title={t("pricing.table.notIncluded")}
                                    >
                                      <Minus
                                        className="h-4 w-4"
                                        style={{ color: "var(--muted-foreground)", opacity: 0.4 }}
                                        aria-hidden="true"
                                      />
                                    </span>
                                  )}
                                </td>
                              );
                            }

                            return (
                              <td
                                key={plan.key}
                                className={
                                  "text-center text-sm " + (isPopular ? "bg-primary/[0.03]" : "")
                                }
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });

                    return [categoryRow, ...featureRows];
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <section className="bg-surface px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <h2 className="app-heading app-heading-xl mb-2">{t("pricing.faq.title")}</h2>
            </div>

            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <details key={index} className="app-card group cursor-pointer">
                  <summary className="app-card-body flex items-start justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start gap-3">
                      <HelpCircle
                        className="mt-0.5 h-5 w-5 flex-shrink-0"
                        style={{ color: "var(--accent)" }}
                        aria-hidden="true"
                      />
                      <span>{item.q}</span>
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="px-6 pb-5">
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
