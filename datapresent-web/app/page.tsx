'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useTheme } from '@/components/theme-provider'
import {
  LandingHero,
  LandingFormats,
  LandingHowItWorks,
  LandingFeatures,
  LandingPricing,
  LandingCta,
  LandingFooter,
} from '@/components/landing'

export default function LandingPage() {
  useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch - show nothing until mounted
  if (!mounted) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />
  }

  return (
    <>
      {/* ─── Nav ─── */}
      <header className="landing-nav">
        <div className="landing-container">
          <div className="landing-nav-inner">
            <Link href="/" className="landing-logo">
              <div className="landing-logo-mark">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M3 3v18h18" />
                  <path d="M7 16l4-8 4 4 4-6" />
                </svg>
              </div>
              <span className="landing-logo-text">DataPresent</span>
            </Link>
            <div className="landing-nav-actions">
              <ThemeToggle />
              <Link href="/login" className="landing-btn landing-btn-ghost landing-btn-sm">Connexion</Link>
              <Link href="/signup" className="landing-btn landing-btn-primary landing-btn-sm">
                Essayer gratuitement
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <LandingHero
        badge="Propulsé par l'IA · Nouveau"
        title={
          <>
            Vos données deviennent
            <br />
            des slides <em>percutantes</em>
          </>
        }
        body="Importez Excel, CSV, PDF ou Google Sheets. Notre IA analyse, structure et génère automatiquement des présentations professionnelles — en quelques secondes."
        cta="Commencer gratuitement"
        note="Sans carte bancaire · 3 rapports gratuits / mois"
      />

      {/* ─── Formats ─── */}
      <LandingFormats label="Compatibilité" title="Importez depuis n'importe quelle source" />

      {/* ─── How It Works ─── */}
      <LandingHowItWorks
        label="Processus"
        title="Trois étapes, zéro friction"
        subtitle="De vos données brutes à une présentation impeccable, plus vite que vous ne l'imaginez."
      />

      {/* ─── Features ─── */}
      <LandingFeatures label="Fonctionnalités" title="Tout ce dont vous avez besoin" />

      {/* ─── Pricing ─── */}
      <LandingPricing
        label="Tarifs"
        title="Simple et transparent"
        subtitle="Choisissez le plan qui correspond à vos besoins. Pas de frais cachés."
      />

      {/* ─── CTA ─── */}
      <LandingCta
        title={
          <>
            Prêt à transformer
            <br />
            <em>vos données ?</em>
          </>
        }
        body="Rejoignez les équipes qui automatisent leurs présentations et gagnent des heures chaque semaine."
        button="Créer un compte gratuit"
      />

      {/* ─── Footer ─── */}
      <LandingFooter
        description="Transformez vos données en présentations professionnelles grâce à l'intelligence artificielle."
        copyright="© 2025 DataPresent · Tous droits réservés"
      />
    </>
  )
}
