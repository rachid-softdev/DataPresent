"use client";

import { useEffect, useState } from "react";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";
import {
  DEFAULT_ONBOARDING_STEPS,
  OnboardingProvider,
} from "@/components/onboarding/OnboardingTour";
import { StartChecklist } from "@/components/onboarding/StartChecklist";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { DashboardNav } from "@/components/org/DashboardNav";

export function DashboardWithOnboarding({ children }: { children: React.ReactNode }) {
  // Default to NOT showing the welcome screen so the server render matches the
  // client render (reading localStorage during render caused hydration
  // mismatches). The welcome screen is shown after hydration only for users
  // who have never completed it.
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("datapresent-welcome-seen");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required: read localStorage on mount, set state for client-only render
    if (!seen) setShowWelcome(true);
  }, []);

  const handleWelcomeComplete = () => {
    localStorage.setItem("datapresent-welcome-seen", "true");
    setShowWelcome(false);
  };

  if (showWelcome) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  return (
    <OnboardingProvider steps={DEFAULT_ONBOARDING_STEPS} storageKey="datapresent_onboarding">
      <KeyboardShortcuts>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:no-underline"
        >
          Aller au contenu principal
        </a>
        <div className="min-h-screen bg-background">
          <DashboardNav />
          <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {children}
            <div className="mt-8">
              <StartChecklist />
            </div>
          </main>
        </div>
      </KeyboardShortcuts>
    </OnboardingProvider>
  );
}
