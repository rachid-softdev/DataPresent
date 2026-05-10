'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useTheme } from '@/components/theme-provider'
import {
  BarChart3, Sparkles, Download, FileSpreadsheet, FileText,
  Zap, Shield, Users, Upload, ArrowRight, TrendingUp,
  Clock, CheckCircle2, ChevronRight
} from 'lucide-react'

const formats = [
  { icon: FileSpreadsheet, label: 'Excel (.xlsx)' },
  { icon: FileText, label: 'CSV' },
  { icon: FileText, label: 'PDF' },
  { icon: BarChart3, label: 'Google Sheets' },
]

const steps = [
  {
    step: '01',
    title: 'Importez vos données',
    desc: 'Glissez-déposez un fichier Excel, CSV, PDF ou connectez Google Sheets. Formats multiples supportés.',
    icon: Upload,
  },
  {
    step: '02',
    title: 'IA analyse & structure',
    desc: 'Notre IA détecte les KPIs, tendances et corrélations. Elle crée automatiquement une structure de slides pertinente.',
    icon: Sparkles,
  },
  {
    step: '03',
    title: 'Exportez en un clic',
    desc: 'Téléchargez en PowerPoint, PDF ou partagez un lien interactif. Prêt à présenter en quelques secondes.',
    icon: Download,
  },
]

const features = [
  { icon: Sparkles, title: 'Analyse IA intelligente', desc: 'Détection automatique des tendances, KPIs et insights pertinents dans vos données.' },
  { icon: BarChart3, title: 'Visualisations automatiques', desc: 'Graphiques, tableaux et diagrammes générés automatiquement selon vos données.' },
  { icon: TrendingUp, title: 'Mise en page optimisée', desc: 'Slides structurées avec titre, sous-titres, graphiques et commentaires contextuels.' },
  { icon: Zap, title: 'Ultra-rapide', desc: 'Présentations complètes générées en quelques secondes, pas en heures.' },
  { icon: Shield, title: 'Données sécurisées', desc: 'Stockage chiffré, vos données restent confidentielles et ne sont jamais partagées.' },
  { icon: Users, title: 'Collaboration équipe', desc: 'Partagez, commentez et collaborez en temps réel (plan Team).' },
]

const plans = [
  {
    name: 'Gratuit',
    price: '0€',
    desc: 'Pour découvrir',
    features: ['3 rapports / mois', '8 slides max', 'Export PPTX', 'Analyse IA de base', 'Watermark DataPresent'],
    cta: 'Démarrer gratuitement',
    popular: false,
  },
  {
    name: 'Pro',
    price: '19€',
    desc: 'Pour les pros',
    features: ['30 rapports / mois', '20 slides max', 'PPTX, PDF, DOCX', 'Analyse IA avancée', 'Sans watermark', 'Support email'],
    cta: 'Essayer Pro',
    popular: true,
  },
  {
    name: 'Team',
    price: '49€',
    desc: 'Pour les équipes',
    features: ['Rapports illimités', '30 slides max', 'Tous les formats', 'Collaboration équipe', 'Support prioritaire', 'API & webhooks'],
    cta: 'Contacter',
    popular: false,
  },
]

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const bg = isDark ? 'bg-[#0c1407]' : 'bg-[#f1f8ec]'
  const surface = isDark ? 'bg-[#1a2b11]' : 'bg-white'
  const surfaceAlt = isDark ? 'bg-[#16220e]' : 'bg-[#e8f0dc]'
  const text = isDark ? 'text-[#e3f1db]' : 'text-[#17250e]'
  const textMuted = isDark ? 'text-[#e3f1db]/60' : 'text-[#17250e]/60'
  const border = isDark ? 'border-[#2d4a1f]' : 'border-[#c5d9b3]'
  const primary = isDark ? 'text-[#afdf95]' : 'text-[#3a6a20]'
  const primaryBg = isDark ? 'bg-[#afdf95]' : 'bg-[#3a6a20]'
  const primaryBgHover = isDark ? 'hover:bg-[#9edb7b]' : 'hover:bg-[#478524]'
  const primarySubtle = isDark ? 'bg-[#2d4a1f]/40' : 'bg-[#c5d9b3]/40'
  const accent = isDark ? 'text-[#6dcf35]' : 'text-[#68ca2f]'
  const cardBg = isDark ? 'bg-[#1a2b11] border-[#2d4a1f]' : 'bg-white border-[#c5d9b3]'
  const cardHover = isDark ? 'hover:border-[#478524]' : 'hover:border-[#3a6a20]'

  return (
    <div className={`min-h-screen ${bg} ${text} transition-colors duration-300`}>
      {/* ─── Header ─── */}
      <header className={`sticky top-0 z-50 border-b ${border} backdrop-blur-md ${isDark ? 'bg-[#0c1407]/85' : 'bg-[#f1f8ec]/85'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className={`w-9 h-9 rounded-lg ${primaryBg} flex items-center justify-center transition-transform group-hover:scale-105`}>
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-bold tracking-tight ${text}`}>DataPresent</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" className={`${textMuted} hover:${text}`}>
                Connexion
              </Button>
            </Link>
            <Link href="/signup">
              <Button className={`${primaryBg} ${primaryBgHover} text-white`}>
                Essayer gratuitement
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative py-28 px-6 overflow-hidden">
        <div className={`absolute inset-0 pointer-events-none ${isDark ? 'bg-[radial-gradient(ellipse_at_top,_rgba(109,207,53,0.08),transparent_60%)]' : 'bg-[radial-gradient(ellipse_at_top,_rgba(58,106,32,0.06),transparent_60%)]'}`} />
        <div className="max-w-5xl mx-auto text-center relative">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-10 ${primarySubtle} ${primary}`}>
            <Sparkles className="w-4 h-4" />
            Propulsé par l&apos;IA
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-8">
            Vos données deviennent
            <br />
            <span className={`${primary} bg-clip-text`}>
              des présentations percutantes
            </span>
          </h1>
          <p className={`text-lg md:text-xl ${textMuted} mb-12 max-w-2xl mx-auto leading-relaxed`}>
            Importez Excel, CSV, PDF ou Google Sheets. L&apos;IA analyse, structure et génère
            automatiquement des slides professionnelles — prêtes en quelques secondes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup">
              <Button size="lg" className={`${primaryBg} ${primaryBgHover} text-white text-base px-10 py-6 h-auto font-semibold group`}>
                Commencer gratuitement
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          <p className={`text-sm ${textMuted} mt-5`}>
            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
            Sans carte bancaire • 3 rapports gratuits / mois
          </p>
        </div>

        {/* Stats bar */}
        <div className={`max-w-4xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-6`}>
          {[
            { value: '+10K', label: 'Présentations générées' },
            { value: '3', label: 'Formats supportés' },
            { value: '< 30s', label: 'Temps de génération' },
            { value: '99.9%', label: 'Disponibilité' },
          ].map((stat) => (
            <div key={stat.label} className={`text-center p-5 rounded-2xl ${surfaceAlt}`}>
              <div className={`text-2xl md:text-3xl font-extrabold ${primary} mb-1`}>{stat.value}</div>
              <div className={`text-xs ${textMuted}`}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Formats ─── */}
      <section className={`py-20 px-6 ${surface}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className={`text-xs font-semibold uppercase tracking-widest mb-3 ${primary}`}>Compatibilité</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Importez depuis n&apos;importe quelle source</h2>
            <p className={`${textMuted} max-w-xl mx-auto`}>
              Glissez-déposez vos fichiers ou connectez vos outils existants
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {formats.map((fmt) => (
              <div key={fmt.label} className={`${surfaceAlt} rounded-2xl p-8 text-center border ${border} ${cardHover} transition-all hover:-translate-y-1`}>
                <div className={`w-14 h-14 rounded-xl ${primarySubtle} flex items-center justify-center mx-auto mb-4`}>
                  <fmt.icon className={`w-7 h-7 ${primary}`} />
                </div>
                <span className={`font-semibold text-sm ${text}`}>{fmt.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className={`text-xs font-semibold uppercase tracking-widest mb-3 ${primary}`}>Processus</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Comment ça marche</h2>
            <p className={`${textMuted} max-w-xl mx-auto`}>
              Trois étapes pour passer de vos données brutes à une présentation impeccable
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10 relative">
            {/* Connecting line (desktop) */}
            <div className={`hidden md:block absolute top-16 left-[calc(16.67%+32px)] right-[calc(16.67%+32px)] h-0.5 ${isDark ? 'bg-[#2d4a1f]' : 'bg-[#c5d9b3]'}`} />
            {steps.map((item, i) => (
              <div key={item.step} className="text-center relative">
                <div className={`w-32 h-32 rounded-full ${surface} border-4 ${border} flex items-center justify-center mx-auto mb-6 relative z-10 ${isDark ? 'shadow-[0_0_30px_rgba(109,207,53,0.1)]' : 'shadow-lg'}`}>
                  <item.icon className={`w-10 h-10 ${primary}`} />
                </div>
                <div className={`text-xs font-bold ${primary} mb-2`}>ÉTAPE {item.step}</div>
                <h3 className={`text-xl font-bold mb-3`}>{item.title}</h3>
                <p className={`${textMuted} text-sm leading-relaxed max-w-xs mx-auto`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className={`py-24 px-6 ${surface}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className={`text-xs font-semibold uppercase tracking-widest mb-3 ${primary}`}>Fonctionnalités</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tout ce dont vous avez besoin</h2>
            <p className={`${textMuted} max-w-xl mx-auto`}>
              Des outils puissants pour transformer vos données en présentations impactantes
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => (
              <Card key={feat.title} className={`${cardBg} ${cardHover} transition-all duration-300 hover:-translate-y-1 group`}>
                <CardContent className="p-7">
                  <div className={`w-12 h-12 rounded-xl ${primarySubtle} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <feat.icon className={`w-6 h-6 ${primary}`} />
                  </div>
                  <h3 className={`text-lg font-bold mb-2.5`}>{feat.title}</h3>
                  <p className={`${textMuted} text-sm leading-relaxed`}>{feat.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className={`text-xs font-semibold uppercase tracking-widest mb-3 ${primary}`}>Tarifs</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple et transparent</h2>
            <p className={`${textMuted} max-w-xl mx-auto`}>
              Choisissez le plan qui correspond à vos besoins. Pas de frais cachés.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.popular
                  ? `${isDark ? 'border-[#afdf95] ring-2 ring-[#afdf95]/20' : 'border-[#3a6a20] ring-2 ring-[#3a6a20]/20'} shadow-xl`
                  : cardBg
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className={`${primaryBg} text-white text-xs font-bold px-5 py-1.5 rounded-full`}>
                      Le plus populaire
                    </span>
                  </div>
                )}
                <CardContent className="p-7 pt-9 text-center">
                  <h3 className={`text-lg font-bold mb-1`}>{plan.name}</h3>
                  <p className={`${textMuted} text-sm mb-5`}>{plan.desc}</p>
                  <div className="mb-7">
                    <span className={`text-5xl font-extrabold ${text}`}>{plan.price}</span>
                    <span className={`${textMuted} text-sm ml-1`}>/mois</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className={`flex items-center gap-3 text-sm ${textMuted}`}>
                        <CheckCircle2 className={`w-4 h-4 ${primary} flex-shrink-0`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup">
                    <Button
                      className={`w-full font-semibold ${plan.popular
                        ? `${primaryBg} ${primaryBgHover} text-white`
                        : `${surfaceAlt} ${text} hover:${primaryBg} hover:text-white`
                      }`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className={`py-24 px-6 ${isDark ? 'bg-[#1a2b11]' : 'bg-[#17250e]'}`}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5">
            Prêt à transformer vos données ?
          </h2>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto leading-relaxed">
            Rejoignez les entreprises qui automatisent leurs présentations et gagnent des heures chaque semaine.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-white text-[#17250e] hover:bg-[#e3f1db] text-base px-10 py-6 h-auto font-bold group">
              Créer un compte gratuit
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className={`border-t ${border} py-12 px-6 ${surface}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg ${primaryBg} flex items-center justify-center`}>
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <span className={`text-lg font-bold`}>DataPresent</span>
              </div>
              <p className={`${textMuted} text-sm leading-relaxed`}>
                Transformez vos données en présentations professionnelles grâce à l&apos;intelligence artificielle.
              </p>
            </div>
            <div>
              <h4 className={`font-semibold mb-4`}>Produit</h4>
              <ul className="space-y-2.5">
                {['Fonctionnalités', 'Tarifs', 'Formats supportés', 'Templates'].map((l) => (
                  <li key={l}><Link href="#" className={`${textMuted} text-sm hover:${primary} transition-colors`}>{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className={`font-semibold mb-4`}>Légal</h4>
              <ul className="space-y-2.5">
                {['Confidentialité', 'CGU', 'Mentions légales'].map((l) => (
                  <li key={l}><Link href="#" className={`${textMuted} text-sm hover:${primary} transition-colors`}>{l}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className={`pt-8 border-t ${border} flex flex-col sm:flex-row justify-between items-center gap-4`}>
            <p className={`${textMuted} text-sm`}>© 2025 DataPresent. Tous droits réservés.</p>
            <div className="flex items-center gap-2">
              <span className={`${textMuted} text-xs`}>Thème :</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
