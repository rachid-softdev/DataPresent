import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link href="/" className="text-xl font-bold text-primary">
              DataPresent
            </Link>
            <p className="text-sm text-muted-foreground">
              Transformez vos données en présentations professionnelles
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Politique de confidentialité
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Conditions d'utilisation
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border/50 text-center text-sm text-muted-foreground">
          <p>© {currentYear} DataPresent. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}
