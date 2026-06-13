interface LandingFeaturesProps {
  title: string;
}

const FEATURES = [
  {
    title: "Analyse IA intelligente",
    desc: "Détection automatique des tendances, KPIs et insights pertinents dans vos données. L'IA comprend le contexte de vos données pour produire des analyses actionnables.",
    wide: true,
    bg: true,
    iconVariant: "primary",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16l-6.4 4.8L8 14l-6-4.8h7.6z" />
      </svg>
    ),
  },
  {
    title: "Visualisations automatiques",
    desc: "Graphiques, tableaux et diagrammes générés automatiquement selon le type de vos données.",
    wide: false,
    bg: false,
    iconVariant: "accent",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 4-6" />
      </svg>
    ),
  },
  {
    title: "Mise en page optimisée",
    desc: "Slides structurées avec titres, graphiques et commentaires contextuels parfaitement équilibrés.",
    wide: false,
    bg: true,
    iconVariant: "sage",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    title: "Ultra-rapide",
    desc: "Présentations complètes générées en moins de 30 secondes, pas en heures.",
    wide: false,
    bg: false,
    iconVariant: "accent",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    title: "Données sécurisées",
    desc: "Stockage chiffré, vos données restent confidentielles et ne sont jamais partagées.",
    wide: false,
    bg: true,
    iconVariant: "muted",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    title: "Collaboration équipe",
    desc: "Partagez, commentez et collaborez en temps réel avec votre équipe (plan Team).",
    wide: false,
    bg: false,
    iconVariant: "primary",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

const ICON_CLASSES: Record<string, string> = {
  primary: "landing-feature-icon-primary",
  accent: "landing-feature-icon-accent",
  sage: "landing-feature-icon-sage",
  muted: "landing-feature-icon-muted",
};

export function LandingFeatures({ title }: LandingFeaturesProps) {
  return (
    <section id="features" className="landing-section landing-section-alt">
      <div className="landing-container">
        <div className="landing-section-header">
          <h2 className="landing-heading-lg">{title}</h2>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className={`landing-feature-card${feat.wide ? " landing-feature-card-wide" : ""}${feat.bg ? " landing-feature-card-bg" : ""}`}
            >
              <div
                className={`landing-feature-icon ${ICON_CLASSES[feat.iconVariant] ?? "landing-feature-icon-primary"}`}
              >
                {feat.icon}
              </div>
              <h3 className="landing-feature-title">{feat.title}</h3>
              <p className="landing-body-md">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
