'use client'

import { useTheme } from '@/components/theme-provider'

interface LandingHowItWorksProps {
  label: string
  title: string
  subtitle: string
}

const STEPS = [
  {
    num: '01',
    label: 'Import',
    title: 'Importez vos données',
    body: 'Glissez-déposez un fichier ou connectez Google Sheets. Formats multiples supportés sans configuration.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" color="var(--primary)">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    num: '02',
    label: 'Analyse IA',
    title: "L'IA analyse & structure",
    body: 'Détection automatique des KPIs, tendances et corrélations. Structure de slides créée intelligemment.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" color="var(--primary)">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    ),
  },
  {
    num: '03',
    label: 'Export',
    title: 'Exportez en un clic',
    body: 'PowerPoint, PDF ou lien interactif partageable. Prêt à présenter en quelques secondes.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" color="var(--primary)">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
]

export function LandingHowItWorks({ label, title, subtitle }: LandingHowItWorksProps) {
  useTheme()

  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="landing-section-header">
          <span className="landing-label">{label}</span>
          <h2 className="landing-heading-lg">{title}</h2>
          <p className="landing-body-md" style={{ maxWidth: 480, margin: '12px auto 0' }}>
            {subtitle}
          </p>
        </div>
        <div className="landing-steps-grid">
          {STEPS.map((step) => (
            <div key={step.num} className="landing-step">
              <div className="landing-step-num-wrap">
                <div className="landing-step-ring">{step.icon}</div>
                <div className="landing-step-num">{step.num}</div>
              </div>
              <span className="landing-label" style={{ display: 'block', marginBottom: 8 }}>
                {step.label}
              </span>
              <h3 className="landing-heading-md" style={{ marginBottom: 10 }}>
                {step.title}
              </h3>
              <p className="landing-body-md">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
