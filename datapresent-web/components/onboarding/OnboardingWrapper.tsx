"use client";

import { DEFAULT_ONBOARDING_STEPS, OnboardingProvider } from "./OnboardingTour";

export function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider steps={DEFAULT_ONBOARDING_STEPS} storageKey="datapresent_onboarding">
      {children}
    </OnboardingProvider>
  );
}
