import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { HydrationGuard } from "@/components/hooks/hydration-guard";
import {
  LandingHero,
  LandingFormats,
  LandingHowItWorks,
  LandingFeatures,
  LandingPricing,
  LandingCta,
  LandingFooter,
} from "@/components/landing";

export default async function RootPage() {
  const t = await getTranslations("landing");
  const nav = await getTranslations("nav");

  return (
    <HydrationGuard>
      {/* ─── Nav ─── */}
      <header className="landing-nav">
        <div className="landing-container">
          <div className="landing-nav-inner">
            <Link href="/" className="landing-logo">
              <div className="landing-logo-mark">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.5"
                >
                  <path d="M3 3v18h18" />
                  <path d="M7 16l4-8 4 4 4-6" />
                </svg>
              </div>
              <span className="landing-logo-text">DataPresent</span>
            </Link>
            <div className="landing-nav-actions">
              <ThemeToggle />
              <Link href="/login" className="landing-btn landing-btn-ghost landing-btn-sm">
                {nav("login")}
              </Link>
              <Link href="/signup" className="landing-btn landing-btn-primary landing-btn-sm">
                {nav("signup")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <LandingHero
        badge={t("hero.badge")}
        title={
          <>
            {t("hero.titleLine1")}
            <br />
            {t("hero.titleLine2")}
          </>
        }
        body={t("hero.body")}
        cta={t("hero.cta")}
        note={t("hero.note")}
      />

      {/* ─── Formats ─── */}
      <LandingFormats label={t("formats.label")} title={t("formats.title")} />

      {/* ─── How It Works ─── */}
      <LandingHowItWorks
        label={t("howItWorks.label")}
        title={t("howItWorks.title")}
        subtitle={t("howItWorks.subtitle")}
      />

      {/* ─── Features ─── */}
      <LandingFeatures label={t("features.label")} title={t("features.title")} />

      {/* ─── Pricing ─── */}
      <LandingPricing
        label={t("pricing.label")}
        title={t("pricing.title")}
        subtitle={t("pricing.subtitle")}
      />

      {/* ─── CTA ─── */}
      <LandingCta
        title={
          <>
            {t("cta.title")}
            <br />
            <em>{t("cta.titleEm")}</em>
          </>
        }
        body={t("cta.body")}
        button={t("cta.button")}
      />

      {/* ─── Footer ─── */}
      <LandingFooter description={t("footer.description")} copyright={t("footer.copyright")} />
    </HydrationGuard>
  );
}
