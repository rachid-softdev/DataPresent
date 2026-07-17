"use client";

import { useState } from "react";
import { type PricingPlan, PricingTable } from "@/components/billing/PricingTable";

interface PlanSelectorProps {
  plans: PricingPlan[];
}

export function PlanSelector({ plans }: PlanSelectorProps) {
  const handleSelectPlan = async (planId: string) => {
    if (planId === "FREE") return;
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        console.error("Stripe checkout error:", err);
      }
    } catch (err) {
      console.error("Failed to create checkout session:", err);
    }
  };

  return <PricingTable plans={plans} onSelectPlan={handleSelectPlan} />;
}
