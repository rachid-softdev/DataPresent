// `OnboardingTour.tsx` exports the tour as `OnboardingProvider`; re-export it
// under the barrel name `OnboardingTour` so consumers get the tour entrypoint.

export { DashboardWithOnboarding } from "./DashboardWithOnboarding";
export { IntelligentEmptyState } from "./IntelligentEmptyState";
export { OnboardingProvider as OnboardingTour } from "./OnboardingTour";
export { OnboardingWrapper } from "./OnboardingWrapper";
export { StartChecklist } from "./StartChecklist";
export { WelcomeScreen } from "./WelcomeScreen";
