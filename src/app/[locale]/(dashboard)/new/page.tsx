'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { DropZone } from '@/components/upload/DropZone'
import { SectorSelector } from '@/components/upload/SectorSelector'
import { SlideCountSlider } from '@/components/upload/SlideCountSlider'

export default function NewReportPage() {
  const t = useTranslations()
  const [file, setFile] = useState<File | null>(null)
  const [sector, setSector] = useState(useSearchParams()?.get('sector') || 'GENERIC')
  const [slideCount, setSlideCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sector', sector)
    formData.append('slideCount', slideCount.toString())

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (res.ok) {
      const { reportId } = await res.json()
      router.push(`/reports/${reportId}`)
    } else {
      setLoading(false)
      const data = await res.json()
      alert(t(data.error) || t('errors.generic'))
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('reports.new')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('upload.title')}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. {t('upload.title')}</CardTitle>
              <CardDescription>
                {t('upload.dragDrop')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DropZone
                onFileSelect={setFile}
                accept=".xlsx,.xls,.csv,.pdf"
                maxSize={10 * 1024 * 1024}
                disabled={loading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. {t('upload.sector.title')}</CardTitle>
              <CardDescription>
                {t('upload.sector.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SectorSelector
                value={sector}
                onChange={setSector}
                disabled={loading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. {t('upload.slideCount.title')}</CardTitle>
              <CardDescription>
                {t('upload.slideCount.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SlideCountSlider
                value={slideCount}
                onChange={setSlideCount}
                min={5}
                max={20}
                disabled={loading}
              />
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={!file || loading}
            className="w-full text-lg py-6"
          >
            {loading ? <Spinner className="mx-auto" /> : t('reports.generate')}
          </Button>
        </div>
      </form>
    </div>
  )
}