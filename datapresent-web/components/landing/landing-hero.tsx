import Link from 'next/link'

interface Stat {
  value: string
  label: string
}

interface LandingHeroProps {
  badge: string
  title: React.ReactNode
  body: string
  cta: string
  note: string
  stats?: Stat[]
}

const DEFAULT_STATS: Stat[] = [
  { value: '10K+', label: 'Présentations générées' },
  { value: '< 30s', label: 'Temps de génération' },
  { value: '4', label: 'Formats supportés' },
  { value: '99.9%', label: 'Disponibilité' },
]

export function LandingHero({
  badge,
  title,
  body,
  cta,
  note,
  stats = DEFAULT_STATS,
}: LandingHeroProps) {
  return (
    <section className="landing-hero">
      <div className="landing-container-sm">
        <div className="landing-hero-eyebrow anim-up">
          <span className="landing-dot"></span>
          {badge}
        </div>
        <h1 className="landing-display landing-hero-display anim-up-1">{title}</h1>
        <p className="landing-body-lg landing-hero-body anim-up-2">{body}</p>
        <div className="landing-hero-cta anim-up-3">
          <Link href="/signup" className="landing-btn landing-btn-primary landing-btn-xl">
            {cta}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <span className="landing-hero-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {note}
          </span>
        </div>
        <div className="landing-stats-strip anim-up-4">
          {stats.map((stat) => (
            <div key={stat.label} className="landing-stat-item">
              <div className="landing-stat-num">{stat.value}</div>
              <div className="landing-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
