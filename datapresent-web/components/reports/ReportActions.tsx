'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ShareModal } from '@/components/share/ShareModal'
import { Loader2, RotateCw, Download } from 'lucide-react'
import { toast } from 'sonner'

interface ReportActionsProps {
  reportId: string
  status: string
}

export function ReportActions({ reportId, status }: ReportActionsProps) {
  const [regenerating, setRegenerating] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)

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
        toast.error("Erreur lors de l'export")
      }
    } catch {
      toast.error("Erreur lors de l'export")
    }
  }

  const handleRegenerate = async () => {
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
    } catch {
      toast.error('Erreur lors de la régénération')
    } finally {
      setRegenerating(false)
    }
  }

  if (status !== 'DONE') {
    return null
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <ShareModal reportId={reportId} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRegenerateConfirm(true)}
          disabled={regenerating}
          aria-label="Régénérer le rapport"
        >
          {regenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCw className="w-4 h-4" />
          )}
          <span className="hidden sm:inline ml-2">Régénérer</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('PPTX')} aria-label="Exporter en PPTX">
          <Download className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">PPTX</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('PDF')} aria-label="Exporter en PDF">
          <Download className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">PDF</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('DOCX')} aria-label="Exporter en Word">
          <Download className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Word</span>
        </Button>
      </div>

      <ConfirmDialog
        open={showRegenerateConfirm}
        onOpenChange={setShowRegenerateConfirm}
        title="Régénérer le rapport ?"
        description="Les slides actuelles seront remplacées par une nouvelle génération IA."
        confirmLabel="Régénérer"
        cancelLabel="Annuler"
        onConfirm={handleRegenerate}
      />
    </>
  )
}
