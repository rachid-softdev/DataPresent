'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ShareModal } from '@/components/share/ShareModal'
import { Loader2, RotateCw } from 'lucide-react'
import { toast } from 'sonner'

interface ReportActionsProps {
  reportId: string
  status: string
}

export function ReportActions({ reportId, status }: ReportActionsProps) {
  const [regenerating, setRegenerating] = useState(false)

  const handleExport = async (format: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })
      
      if (res.ok) {
        toast.success(`Export ${format} en cours`)
      } else {
        toast.error('Erreur lors de l\'export')
      }
    } catch (error) {
      toast.error('Erreur lors de l\'export')
    }
  }

  const handleRegenerate = async () => {
    if (!confirm('Voulez-vous régénérer ce rapport? Les slides actuelles seront remplacées.')) {
      return
    }

    setRegenerating(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/regenerate`, {
        method: 'POST',
      })

      if (res.ok) {
        toast.success('Régénération du rapport initiée')
        setTimeout(() => window.location.reload(), 1000)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Erreur lors de la régénération')
      }
    } catch (error) {
      toast.error('Erreur lors de la régénération')
    } finally {
      setRegenerating(false)
    }
  }

  if (status !== 'DONE') {
    return null
  }

  return (
    <div className="flex gap-2">
      <ShareModal reportId={reportId} />
      <Button
        variant="outline"
        onClick={handleRegenerate}
        disabled={regenerating}
      >
        {regenerating ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <RotateCw className="w-4 h-4 mr-2" />
        )}
        Régénérer
      </Button>
      <Button variant="outline" onClick={() => handleExport('PPTX')}>
        Exporter PPTX
      </Button>
      <Button variant="outline" onClick={() => handleExport('PDF')}>
        Exporter PDF
      </Button>
      <Button variant="outline" onClick={() => handleExport('DOCX')}>
        Exporter Word
      </Button>
    </div>
  )
}