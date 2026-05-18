'use client'

import { OnboardingProvider, DEFAULT_ONBOARDING_STEPS } from '@/components/onboarding/OnboardingTour'
import { DashboardNav } from '@/components/org/DashboardNav'

export function DashboardWithOnboarding({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider steps={DEFAULT_ONBOARDING_STEPS} storageKey="datapresent_onboarding">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:no-underline">
        Aller au contenu principal
      </a>
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main id="main-content" className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </OnboardingProvider>
  )
}