"use client";

import { Check, X, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PricingPlanFeature {
  name: string;
  category: "reports" | "exports" | "collaboration" | "professional" | "support";
  value: string | boolean | number;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period?: string;
  description: string;
  features: PricingPlanFeature[];
  popular?: boolean;
  cta: string;
  currentPlan?: boolean;
  stripePriceId?: string;
}

interface PricingTableProps {
  plans: PricingPlan[];
  onSelectPlan: (planId: string) => Promise<void>;
  loadingPlanId?: string | null;
}

export function PricingTable({ plans, onSelectPlan, loadingPlanId = null }: PricingTableProps) {
  return (
    <div className="grid md:grid-cols-4 gap-6">
      {plans.map((plan) => (
        <PricingCard
          key={plan.id}
          plan={plan}
          onSelect={onSelectPlan}
          isLoading={loadingPlanId === plan.id}
        />
      ))}
    </div>
  );
}

interface PricingCardProps {
  plan: PricingPlan;
  onSelect: (planId: string) => Promise<void>;
  isLoading: boolean;
}

function PricingCard({ plan, onSelect, isLoading }: PricingCardProps) {
  return (
    <Card
      className={cn(
        "relative flex flex-col",
        plan.popular && "border-primary shadow-lg scale-105 z-10",
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
            {plan.price === -1 ? "Sur mesure" : plan.price === 0 ? "Gratuit" : `${plan.price}€`}
          </span>
          {plan.price > 0 && plan.period && (
            <span className="text-muted-foreground">/{plan.period}</span>
          )}
        </div>

        {/* Reports & Slides */}
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
            Rapports & Slides
          </p>
          {plan.features
            .filter((f) => f.category === "reports")
            .map((f, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span>{f.name}</span>
                <span className="font-medium">{String(f.value)}</span>
              </div>
            ))}
        </div>

        {/* Exports */}
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
            Formats d&rsquo;export
          </p>
          {plan.features
            .filter((f) => f.category === "exports")
            .map((f, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span>{f.name}</span>
                {f.value === true ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <X className="w-4 h-4 text-muted-foreground/40" />
                )}
              </div>
            ))}
        </div>

        {/* Collaboration */}
        {plan.features.some((f) => f.category === "collaboration") && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
              Collaboration
            </p>
            {plan.features
              .filter((f) => f.category === "collaboration")
              .map((f, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span>{f.name}</span>
                  {f.value === true ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/40" />
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Professional */}
        {plan.features.some((f) => f.category === "professional") && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Options pro</p>
            {plan.features
              .filter((f) => f.category === "professional")
              .map((f, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="flex items-center">
                    {f.name}
                    {f.name === "Watermark" && (
                      <Tooltip
                        content="Retire le logo DataPresent des diapositives exportées"
                        side="top"
                      >
                        <span className="inline-flex items-center cursor-help ml-1">
                          <HelpCircle className="w-3 h-3 text-muted-foreground/50" />
                        </span>
                      </Tooltip>
                    )}
                    {f.name === "White-label" && (
                      <Tooltip
                        content="Personnalisez les rapports avec votre propre marque (logo, couleurs, nom de domaine)"
                        side="top"
                      >
                        <span className="inline-flex items-center cursor-help ml-1">
                          <HelpCircle className="w-3 h-3 text-muted-foreground/50" />
                        </span>
                      </Tooltip>
                    )}
                  </span>
                  {f.value === true ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/40" />
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Support */}
        {plan.features.some((f) => f.category === "support") && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Support</p>
            {plan.features
              .filter((f) => f.category === "support")
              .map((f, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span>{f.name}</span>
                  {f.value === true ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/40" />
                  )}
                </div>
              ))}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={plan.currentPlan ? "outline" : plan.popular ? "default" : "outline"}
          disabled={plan.currentPlan || isLoading}
          onClick={() => onSelect(plan.id)}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {plan.currentPlan ? "Plan actuel" : plan.cta}
        </Button>
      </CardFooter>
    </Card>
  );
}
