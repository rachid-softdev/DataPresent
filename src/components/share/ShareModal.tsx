'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { X, Copy, Check, Globe, Lock, Users } from 'lucide-react'
import { toast } from 'sonner'

interface ShareModalProps {
  reportId: string
}

export function ShareModal({ reportId }: ShareModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    if (isOpen && !shareToken) {
      fetch(`/api/reports/${reportId}/share`)
        .then(res => res.json())
        .then(data => {
          setIsPublic(data.isPublic || false)
          setShareToken(data.shareToken || null)
          setShareUrl(data.shareUrl || null)
        })
        .finally(() => setInitialLoading(false))
    }
  }, [isOpen, reportId, shareToken])

  const togglePublic = async () => {
    setLoading(true)
    const res = await fetch(`/api/reports/${reportId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: !isPublic })
    })

    if (res.ok) {
      const data = await res.json()
      setIsPublic(data.isPublic)
      setShareToken(data.shareToken)
      setShareUrl(data.shareUrl)
      toast.success(isPublic ? 'Lien rendu privé' : 'Lien rendu public')
    } else {
      toast.error('Erreur lors de la mise à jour')
    }
    setLoading(false)
  }

  const copyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Lien copié dans le presse-papiers')
    }
  }

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        Partager
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
      <div className="relative z-50 w-full max-w-lg bg-surface border border-border rounded-lg shadow-lg p-6">
        <button
          className="absolute top-4 right-4 p-1 rounded hover:bg-muted transition-colors"
          onClick={() => setIsOpen(false)}
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-foreground mb-4">Partager le rapport</h2>

        {initialLoading ? (
          <div className="py-8 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Globe className="w-5 h-5 text-green-500" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-foreground">{isPublic ? 'Lien public activé' : 'Lien privé'}</p>
                  <p className="text-sm text-muted-foreground">
                    {isPublic ? 'Toute personne avec le lien peut voir' : 'Réservé aux membres'}
                  </p>
                </div>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={togglePublic}
                disabled={loading}
              />
            </div>

            {isPublic && shareUrl && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Lien de partage</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 border border-input bg-muted rounded-md text-sm"
                  />
                  <Button onClick={copyLink} variant="outline" size="icon" aria-label="Copier le lien">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Les commentaires sont automatiquement activés pour les liens publics</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
