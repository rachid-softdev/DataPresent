'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Watermark } from '@/components/watermark/Watermark'
import { SlideCard } from '@/components/slides/SlideCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface Slide {
  id: string
  position: number
  title: string
  layout: string
  contentJson: Record<string, unknown>
  speakerNotes: string | null
}

interface ReportData {
  id: string
  title: string
  sector: string
  slides: Slide[]
  hasPassword: boolean
  isWatermarked: boolean
  expiresAt: string | null
  error?: string
}

export function SharePageClient({ initialData }: { initialData: Omit<ReportData, 'error'> }) {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)
  const router = useRouter()
  const params = useParams()
  const shareToken = params.shareToken as string

  useEffect(() => {
    // If no password required, show report directly
    if (!initialData.hasPassword) {
      setReport(initialData as ReportData)
      setLoading(false)
    } else {
      // Password required - wait for user input
      setLoading(false)
    }
  }, [initialData])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setVerifying(true)
    try {
      const res = await fetch(`/api/share/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken, password })
      })

      if (res.ok) {
        const data = await res.json()
        setReport(data.report)
        toast.success('Accès autorisé')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Mot de passe incorrect')
      }
    } catch {
      toast.error('Erreur lors de la vérification')
    } finally {
      setVerifying(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Password required
  if (!report && initialData.hasPassword) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b py-4">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-xl font-bold text-primary">DataPresent</h1>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-20">
          <div className="bg-card rounded-lg border p-8 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Rapport protégé</h1>
              <p className="text-muted-foreground mt-2">
                Entrez le mot de passe pour accéder à ce rapport
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={verifying}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={verifying || !password.trim()}>
                {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Vérifier
              </Button>
            </form>
          </div>
        </main>
      </div>
    )
  }

  // Report not available (error or expired)
  if (!report) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b py-4">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-xl font-bold text-primary">DataPresent</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Lien expiré ou invalide</h1>
          <p className="text-muted-foreground mt-2">
            Ce lien de partage n'est plus valide ou a expiré.
          </p>
        </main>
      </div>
    )
  }

  // Show report
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b py-4">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-xl font-bold text-primary">DataPresent</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{report.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{report.sector}</Badge>
          </div>
        </div>

        <div className="space-y-8">
          {report.slides.map((slide) => (
            <div key={slide.id} className="relative bg-card rounded-lg border p-6 shadow-sm">
              <SlideCard slide={slide as any} />
              {report.isWatermarked && (
                <Watermark show={report.isWatermarked} />
              )}
            </div>
          ))}
        </div>

        {report.isWatermarked && (
          <Watermark show={report.isWatermarked} position="footer" />
        )}
      </main>
    </div>
  )
}