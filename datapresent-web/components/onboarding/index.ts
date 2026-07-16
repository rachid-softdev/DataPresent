// `OnboardingTour.tsx` exports the tour as `OnboardingProvider`; re-export it
// under the barrel name `OnboardingTour` so consumers get the tour entrypoint.
export { OnboardingProvider as OnboardingTour } from "./OnboardingTour";
export { OnboardingWrapper } from "./OnboardingWrapper";
export { DashboardWithOnboarding } from "./DashboardWithOnboarding";
export { WelcomeScreen } from "./WelcomeScreen";
export { StartChecklist } from "./StartChecklist";
export { IntelligentEmptyState } from "./IntelligentEmptyState";
