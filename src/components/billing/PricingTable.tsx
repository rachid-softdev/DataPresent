'use client'

import { Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface PricingPlanFeature {
  name: string
  category: 'reports' | 'exports' | 'collaboration' | 'professional' | 'support'
  value: string | boolean | number
}

export interface PricingPlan {
  id: string
  name: string
  price: number
  period?: string
  description: string
  features: PricingPlanFeature[]
  popular?: boolean
  cta: string
  currentPlan?: boolean
  stripePriceId?: string
}

interface PricingTableProps {
  plans: PricingPlan[]
  onSelectPlan: (planId: string) => Promise<void>
  loadingPlanId?: string | null
}

const CATEGORY_LABELS: Record<PricingPlanFeature['category'], string> = {
  reports: 'Rapports & Slides',
  exports: "Formats d'export",
  collaboration: 'Collaboration',
  professional: 'Options pro',
  support: 'Support',
}

export function PricingTable({ plans, onSelectPlan, loadingPlanId = null }: PricingTableProps) {
  // Group features by category
  const categories = ['reports', 'exports', 'collaboration', 'professional', 'support'] as const

  return (
    <div className="grid md:grid-cols-4 gap-6">
      {plans.map((plan) => (
        <PricingCard
          key={plan.id}
          plan={plan}
          categories={categories}
          onSelect={onSelectPlan}
          isLoading={loadingPlanId === plan.id}
        />
      ))}
    </div>
  )
}

interface PricingCardProps {
  plan: PricingPlan
  categories: readonly ('reports' | 'exports' | 'collaboration' | 'professional' | 'support')[]
  onSelect: (planId: string) => Promise<void>
  isLoading: boolean
}

function PricingCard({ plan, categories, onSelect, isLoading }: PricingCardProps) {
  const renderFeatureValue = (feature: PricingPlanFeature) => {
    if (typeof feature.value === 'boolean') {
      return feature.value ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <X className="w-4 h-4 text-muted-foreground/40" />
      )
    }
    return <span className="text-sm">{feature.value}</span>
  }

  const getFeaturesByCategory = (category: string) => {
    return plan.features.filter((f) => f.category === category)
  }

  return (
    <Card
      className={cn(
        'relative flex flex-col',
        plan.popular && 'border-primary shadow-lg scale-105 z-10'
      )}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
          Populaire
        </div>
      )}

      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-6 text-center">
          <span className="text-4xl font-bold">
            {plan.price === -1 ? 'Sur mesure' : plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
          </span>
          {plan.price > 0 && plan.period && (
            <span className="text-muted-foreground">/{plan.period}</span>
          )}
        </div>

        <div className="space-y-4">
          {categories.map((category) => {
            const categoryFeatures = getFeaturesByCategory(category)
            if (categoryFeatures.length === 0) return null

            return (
              <div key={category}>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  {CATEGORY_LABELS[category]}
                </p>
                <ul className="space-y-2">
                  {categoryFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center justify-between gap-2">
                      <span className="text-sm">{feature.name}</span>
                      <div className="flex-shrink-0">{renderFeatureValue(feature)}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={plan.currentPlan ? 'outline' : plan.popular ? 'default' : 'outline'}
          disabled={plan.currentPlan || isLoading}
          onClick={() => onSelect(plan.id)}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {plan.currentPlan ? 'Plan actuel' : plan.cta}
        </Button>
      </CardFooter>
    </Card>
  )
}
