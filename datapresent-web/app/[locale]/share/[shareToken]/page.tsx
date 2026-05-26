'use client'

import { useState, useEffect, Suspense } from 'react'
import { notFound, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Watermark } from '@/components/watermark/Watermark'
import { SlideCard } from '@/components/slides/SlideCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Lock, AlertCircle } from 'lucide-react'

interface SlideData {
  id: string
  position: number
  title: string
  layout: string
  contentJson: any
  speakerNotes: string | null
  reportId: string
  createdAt: Date
}

interface ReportData {
  id: string
  title: string
  sector: string
  slides: SlideData[]
  isWatermarked: boolean
}

interface ShareMeta {
  hasPassword: boolean
  title: string
  sector: string
}

function SharePageContent() {
  const params = useParams()
  const shareToken = params.shareToken as string
  const t = useTranslations('share')

  const [report, setReport] = useState<ReportData | null>(null)
  const [meta, setMeta] = useState<ShareMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (shareToken) {
      // First get metadata to check if password is required
      fetch(`/api/share/meta?token=${shareToken}`)
        .then((res) => {
          if (!res.ok) {
            if (res.status === 404) {
              notFound()
            }
            if (res.status === 410) {
              setError(t('linkExpired'))
            }
            throw new Error('Failed to get meta')
          }
          return res.json()
        })
        .then((data: ShareMeta) => {
          setMeta(data)
          if (data.hasPassword) {
            setPasswordRequired(true)
            setLoading(false)
          } else {
            // No password required, fetch the report directly
            checkReportAccess(shareToken, '')
          }
        })
        .catch(() => {
          notFound()
        })
    }
  }, [shareToken])

  const checkReportAccess = async (token: string, pwd: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/share/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken: token, password: pwd }),
      })

      const data = await res.json()

      if (res.status === 401) {
        setPasswordRequired(true)
        setLoading(false)
        return
      }

      if (res.status === 410) {
        setError(t('linkExpired'))
        setLoading(false)
        return
      }

      if (res.ok && data.report) {
        setReport(data.report)
        setPasswordRequired(false)
      } else {
        notFound()
      }
    } catch (err) {
      setError(t('loadingError'))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shareToken || !password) return

    setVerifying(true)
    await checkReportAccess(shareToken, password)
    setVerifying(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-destructive mb-2">{t('errorTitle')}</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  // Show password form if required
  if (passwordRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{t('protectedReport')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('passwordRequired')}
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-center"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={verifying || !password}>
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('verifying')}
                </>
              ) : (
                t('accessReport')
              )}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  if (!report) {
    notFound()
  }

  const showWatermark = report.isWatermarked

  return (
    <div className="min-h-screen bg-background">
      <header className="app-nav">
        <div className="max-w-7xl mx-auto px-4 app-nav-inner">
          <div className="app-logo">
            <div className="app-logo-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path d="M3 3v18h18" />
                <path d="M7 16l4-8 4 4 4-6" />
              </svg>
            </div>
            <span className="app-logo-text">DataPresent</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="app-heading app-heading-xl">{report.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{report.sector}</Badge>
          </div>
        </div>

        <div className="space-y-8">
          {report.slides.map((slide) => (
            <div key={slide.id} className="relative bg-card rounded-lg border p-6 shadow-sm">
              <SlideCard slide={slide} />
              {showWatermark && <Watermark show={showWatermark} />}
            </div>
          ))}
        </div>

        {showWatermark && <Watermark show={showWatermark} position="footer" />}
      </main>
    </div>
  )
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <SharePageContent />
    </Suspense>
  )
}
