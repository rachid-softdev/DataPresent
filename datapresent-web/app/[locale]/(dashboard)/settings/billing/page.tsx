import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { PLAN_PRICING, getPlanPricing } from "@/lib/entitlements/plan-pricing";
import { getAllEntitlements } from "@/lib/entitlements/feature-gate";
import { PricingPlanFeature } from "@/components/billing/PricingTable";
import { PlanSelector } from "@/components/billing/PlanSelector";

async function buildFeatures(planKey: string, orgId?: string): Promise<PricingPlanFeature[]> {
  const features: PricingPlanFeature[] = [];

  // If we have an orgId, fetch entitlement data from DB; otherwise use defaults
  let entitlements = null;
  if (orgId) {
    entitlements = await getAllEntitlements(orgId);
  }

  // Helper to get a feature value
  const getValue = (key: string, defaultValue: number | boolean): number | boolean => {
    if (entitlements) {
      if (key in entitlements.limits && entitlements.limits[key] !== null) {
        return entitlements.limits[key]!;
      }
      if (key in entitlements.features) {
        return entitlements.features[key];
      }
    }
    return defaultValue;
  };

  // Reports & Slides
  type ReportKey = "reportsPerMonth" | "maxSlides" | "maxOrganizations";
  const reportKeys: { name: string; key: ReportKey }[] = [
    { name: "Rapports/mois", key: "reportsPerMonth" },
    { name: "Diapositives max", key: "maxSlides" },
    { name: "Organisations", key: "maxOrganizations" },
  ];
  for (const f of reportKeys) {
    const v = getValue(f.key, 0);
    features.push({
      name: f.name,
      category: "reports",
      value: v === -1 || v === true ? "Illimité" : v,
    });
  }

  // Exports
  type ExportKey = "formatPPTX" | "formatPDF" | "formatDOCX";
  const exportKeys: { name: string; key: ExportKey }[] = [
    { name: "PPTX", key: "formatPPTX" },
    { name: "PDF", key: "formatPDF" },
    { name: "DOCX", key: "formatDOCX" },
  ];
  for (const f of exportKeys) {
    features.push({
      name: f.name,
      category: "exports",
      value: Boolean(getValue(f.key, false)),
    });
  }

  // Collaboration
  features.push({
    name: "Collaboration équipe",
    category: "collaboration",
    value: Boolean(getValue("collaboration", false)),
  });

  // Professional
  const profKeys: { name: string; key: string; inverse?: boolean }[] = [
    { name: "Watermark", key: "watermark", inverse: true },
    { name: "White-label", key: "whiteLabel" },
    { name: "Domaine personnalisé", key: "customDomain" },
    { name: "Accès API", key: "apiAccess" },
  ];
  for (const f of profKeys) {
    const raw = Boolean(getValue(f.key, false));
    features.push({
      name: f.name,
      category: "professional",
      value: f.inverse ? !raw : raw,
    });
  }

  // Support
  features.push({
    name: "Support prioritaire",
    category: "support",
    value: Boolean(getValue("prioritySupport", false)),
  });

  return features;
}

export default async function BillingPage() {
  const t = await getTranslations("billing");
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { membership: { include: { org: { include: { subscription: true } } } } },
  });

  const org = user?.membership[0]?.org;
  const subscription = org?.subscription;
  const orgId = org?.id;

  const plans = (["FREE", "STARTER", "PRO", "ULTRA"] as const).map(async (plan) => {
    const pricing = getPlanPricing(plan);
    return {
      id: plan,
      name: pricing.name,
      price: pricing.price,
      period: pricing.price === -1 ? undefined : t("perMonth"),
      description:
        plan === "ULTRA"
          ? "Pour les agences et grandes organisations nécessitant des solutions personnalisées"
          : t(`plans.${plan.toLowerCase()}.description`),
      features: await buildFeatures(plan, orgId),
      popular: plan === "STARTER",
      cta:
        plan === "FREE" ? "Plan actuel" : plan === "ULTRA" ? "Contacter les ventes" : "Souscrire",
      currentPlan: subscription?.plan === plan,
      stripePriceId: pricing.stripePriceId || undefined,
    };
  });

  const resolvedPlans = await Promise.all(plans);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>

      {subscription?.plan && subscription.plan !== "FREE" && (
        <div className="mb-8 p-4 bg-muted rounded-lg">
          <p className="font-medium">
            {t("plan")}: {getPlanPricing(subscription.plan).name}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("plan")}: {subscription.status}
            {subscription.currentPeriodEnd && (
              <> | {new Date(subscription.currentPeriodEnd).toLocaleDateString("fr-FR")}</>
            )}
          </p>
        </div>
      )}

      <PlanSelector plans={resolvedPlans} />
    </div>
  );
}
