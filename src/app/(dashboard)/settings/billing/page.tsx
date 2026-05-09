import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { PLANS } from '@/lib/plans'
import { PricingTable, PricingPlan } from '@/components/billing/PricingTable'

export default async function BillingPage() {
  const t = await getTranslations('billing')
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { membership: { include: { org: { include: { subscription: true } } } } },
  })

  const subscription = user?.membership[0]?.org?.subscription

  const plans: PricingPlan[] = (['FREE', 'PRO', 'TEAM'] as const).map((plan) => ({
    id: plan,
    name: t(`plans.${plan.toLowerCase()}.name`),
    price: PLANS[plan].price,
    period: t('perMonth'),
    description: t(`plans.${plan.toLowerCase()}.description`),
    features: [
      PLANS[plan].reportsPerMonth === -1 
        ? t('features.reports')
        : `${PLANS[plan].reportsPerMonth} ${t('features.reports')}`,
      `${PLANS[plan].maxSlides} ${t('features.slides')}`,
      ...PLANS[plan].formats.map(f => `${t('features.export')} ${f}`),
      ...(PLANS[plan].collaboration ? [t('features.reports'), t('features.reports')] : []),
    ],
    popular: plan === 'PRO',
    cta: plan === 'FREE' ? t('plans.free.name') : t('getStarted'),
    currentPlan: subscription?.plan === plan,
    stripePriceId: PLANS[plan].stripePriceId || undefined,
  }))

  const handleSelectPlan = async (planId: string) => {
    'use server'
    if (planId === 'FREE' || !PLANS[planId as keyof typeof PLANS].stripePriceId) {
      return
    }

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: planId }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    }
  }

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

      <PricingTable
        plans={plans}
        onSelectPlan={handleSelectPlan}
      />
    </div>
  )
}