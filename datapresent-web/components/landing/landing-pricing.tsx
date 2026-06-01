import Link from "next/link";

interface LandingPricingProps {
  label: string;
  title: string;
  subtitle: string;
}

const PLANS = [
  {
    name: "Gratuit",
    desc: "Pour découvrir",
    price: "0€",
    per: "/mois",
    popular: false,
    features: [
      "3 rapports / mois",
      "8 slides maximum",
      "Export PPTX",
      "Analyse IA de base",
      "Watermark DataPresent",
    ],
    cta: "Démarrer gratuitement",
    href: "/signup",
    btnVariant: "outline" as const,
  },
  {
    name: "Pro",
    desc: "Pour les professionnels",
    price: "19€",
    per: "/mois",
    popular: true,
    badge: "Le plus populaire",
    features: [
      "30 rapports / mois",
      "20 slides maximum",
      "PPTX, PDF, DOCX",
      "Analyse IA avancée",
      "Sans watermark",
      "Support email prioritaire",
    ],
    cta: "Essayer Pro",
    href: "/signup",
    btnVariant: "primary" as const,
  },
  {
    name: "Team",
    desc: "Pour les équipes",
    price: "49€",
    per: "/mois",
    popular: false,
    features: [
      "Rapports illimités",
      "30 slides maximum",
      "Tous les formats",
      "Collaboration temps réel",
      "Support prioritaire 24/7",
      "API & webhooks",
    ],
    cta: "Contacter l'équipe",
    href: "/contact",
    btnVariant: "outline" as const,
  },
];

export function LandingPricing({ label, title, subtitle }: LandingPricingProps) {
  return (
    <section id="pricing" className="landing-section">
      <div className="landing-container-sm">
        <div className="landing-section-header">
          <span className="landing-label">{label}</span>
          <h2 className="landing-heading-lg">{title}</h2>
          <p className="landing-body-md" style={{ maxWidth: 400, margin: "12px auto 0" }}>
            {subtitle}
          </p>
        </div>
        <div className="landing-pricing-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`landing-price-card ${plan.popular ? "landing-featured" : ""}`}
            >
              {plan.popular && plan.badge && (
                <div className="landing-price-badge">{plan.badge}</div>
              )}
              <div className="landing-price-name">{plan.name}</div>
              <div className="landing-price-desc">{plan.desc}</div>
              <div className="landing-price-amount">
                <span className="landing-price-num">{plan.price}</span>
                <span className="landing-price-per">{plan.per}</span>
              </div>
              <hr className="landing-price-divider" />
              {plan.features.map((feat) => (
                <div key={feat} className="landing-price-feature">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {feat}
                </div>
              ))}
              <Link
                href={plan.href}
                className={`landing-btn landing-btn-md ${plan.btnVariant === "primary" ? "landing-btn-primary" : "landing-btn-outline"}`}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "1.75rem",
                  textAlign: "center",
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
