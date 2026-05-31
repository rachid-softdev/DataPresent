import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { PLANS, PLAN_FEATURES } from '@/lib/entitlements/compat'
import { PricingPlanFeature } from '@/components/billing/PricingTable'
import { PlanSelector } from '@/components/billing/PlanSelector'

function formatValue(key: string, value: number | boolean): string | boolean {
  if (key === 'reportsPerMonth') {
    return value === -1 ? 'Illimité' : value
  }
  if (key === 'maxSlides') {
    return value === -1 ? 'Illimité' : value
  }
  if (key === 'maxOrganizations') {
    return value === -1 ? 'Illimité' : value
  }
  return value
}

function buildFeatures(planKey: string): PricingPlanFeature[] {
  const plan = PLANS[planKey as keyof typeof PLANS]
  const features: PricingPlanFeature[] = []

  // Reports & Slides
  for (const feature of PLAN_FEATURES.reports) {
    const value = plan[feature.key as keyof typeof plan]
    features.push({
      name: feature.name,
      category: 'reports',
      value: formatValue(feature.key, value as number | boolean),
    })
  }

  // Exports
  for (const feature of PLAN_FEATURES.exports) {
    const value = plan[feature.key as keyof typeof plan]
    features.push({
      name: feature.name,
      category: 'exports',
      value: value as boolean,
    })
  }

  // Collaboration
  for (const feature of PLAN_FEATURES.collaboration) {
    const value = plan[feature.key as keyof typeof plan]
    features.push({
      name: feature.name,
      category: 'collaboration',
      value: value as boolean,
    })
  }

  // Professional
  for (const feature of PLAN_FEATURES.professional) {
    const value = plan[feature.key as keyof typeof plan]
    const displayValue = feature.inverse ? !value : value
    features.push({
      name: feature.name,
      category: 'professional',
      value: displayValue as boolean,
    })
  }

  // Support
  for (const feature of PLAN_FEATURES.support) {
    const value = plan[feature.key as keyof typeof plan]
    features.push({
      name: feature.name,
      category: 'support',
      value: value as boolean,
    })
  }

  return features
}

export default async function BillingPage() {
  const t = await getTranslations('billing')
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { membership: { include: { org: { include: { subscription: true } } } } },
  })

  const subscription = user?.membership[0]?.org?.subscription

  const plans = (['FREE', 'PRO', 'TEAM', 'AGENCY'] as const).map((plan) => ({
    id: plan,
    name: PLANS[plan].name,
    price: PLANS[plan].price,
    period: PLANS[plan].price === -1 ? undefined : t('perMonth'),
    description:
      plan === 'AGENCY'
        ? 'Pour les agences et grandes organisations nécessitant des solutions personnalisées'
        : t(`plans.${plan.toLowerCase()}.description`),
    features: buildFeatures(plan),
    popular: plan === 'PRO',
    cta: plan === 'FREE' ? 'Plan actuel' : plan === 'AGENCY' ? 'Contacter les ventes' : 'Souscrire',
    currentPlan: subscription?.plan === plan,
    stripePriceId: PLANS[plan].stripePriceId || undefined,
  }))

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

      {subscription?.plan && subscription.plan !== 'FREE' && (
        <div className="mb-8 p-4 bg-muted rounded-lg">
          <p className="font-medium">
            {t('plan')}: {PLANS[subscription.plan as keyof typeof PLANS].name}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('plan')}: {subscription.status}
            {subscription.currentPeriodEnd && (
              <> | {new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}</>
            )}
          </p>
        </div>
      )}

      <PlanSelector plans={plans} />
    </div>
  )
}
