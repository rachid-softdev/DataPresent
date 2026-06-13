import "../landing.css";

import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { HydrationGuard } from "@/components/hooks/hydration-guard";
import { Reveal } from "@/components/landing/Reveal";
import { LandingFaq } from "@/components/landing/landing-faq";
import {
  LandingHero,
  LandingFormats,
  LandingHowItWorks,
  LandingFeatures,
  LandingPricing,
  LandingTestimonials,
  LandingCta,
  LandingFooter,
} from "@/components/landing";

export default async function RootPage() {
  const t = await getTranslations("landing");
  const nav = await getTranslations("nav");

  return (
    <HydrationGuard>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "DataPresent",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: "Transformez vos données en présentations professionnelles avec l'IA",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
            },
          }),
        }}
      />

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

      {/* ─── Pain anchor ─── */}
      <div className="landing-pain-band anim-up-1">
        <p className="landing-pain-text">
          <span className="landing-pain-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </span>
          {t("hero.painText")}
        </p>
      </div>

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
        cta="Générez votre présentation en 30s"
        note="Gratuit · 3 rapports · Sans carte bancaire"
      />

      {/* ─── Formats ─── */}
      <Reveal>
        <LandingFormats title={t("formats.title")} id="formats" />
      </Reveal>

      {/* ─── How It Works ─── */}
      <Reveal delay={0.05}>
        <LandingHowItWorks title={t("howItWorks.title")} subtitle={t("howItWorks.subtitle")} />
      </Reveal>

      {/* ─── Features ─── */}
      <Reveal delay={0.05}>
        <LandingFeatures title={t("features.title")} />
      </Reveal>

      {/* ─── Pricing ─── */}
      <Reveal delay={0.05}>
        <LandingPricing title={t("pricing.title")} subtitle={t("pricing.subtitle")} />
      </Reveal>

      {/* ─── Testimonials ─── */}
      <Reveal>
        <LandingTestimonials title={t("testimonials.title")} />
      </Reveal>

      {/* ─── FAQ ─── */}
      <Reveal>
        <LandingFaq />
      </Reveal>

      {/* ─── CTA ─── */}
      <Reveal>
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
      </Reveal>

      {/* ─── Footer ─── */}
      <LandingFooter description={t("footer.description")} copyright={t("footer.copyright")} />
    </HydrationGuard>
  );
}
