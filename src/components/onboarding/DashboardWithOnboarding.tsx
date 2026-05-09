'use client'

import { OnboardingProvider, DEFAULT_ONBOARDING_STEPS } from '@/components/onboarding/OnboardingTour'
import { DashboardNav } from '@/components/org/DashboardNav'

export function DashboardWithOnboarding({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider steps={DEFAULT_ONBOARDING_STEPS} storageKey="datapresent_onboarding">
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </OnboardingProvider>
  )
}