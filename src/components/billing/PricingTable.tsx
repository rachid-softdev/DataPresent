'use client'

import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface PricingPlan {
  id: string
  name: string
  price: number
  period?: string
  description: string
  features: string[]
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

export function PricingTable({ plans, onSelectPlan, loadingPlanId = null }: PricingTableProps) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <PricingCard
          key={plan.id}
          plan={plan}
          onSelect={onSelectPlan}
          isLoading={loadingPlanId === plan.id}
        />
      ))}
    </div>
  )
}

interface PricingCardProps {
  plan: PricingPlan
  onSelect: (planId: string) => Promise<void>
  isLoading: boolean
}

function PricingCard({ plan, onSelect, isLoading }: PricingCardProps) {
  return (
    <Card className={cn(
      'relative flex flex-col',
      plan.popular && 'border-primary shadow-lg scale-105'
    )}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
          Populaire
        </div>
      )}

      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-6">
          <span className="text-4xl font-bold">{plan.price}</span>
          {plan.period && (
            <span className="text-muted-foreground">/{plan.period}</span>
          )}
        </div>

        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
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