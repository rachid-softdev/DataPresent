'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Copy, Check, Globe, Lock, Users, Calendar, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface ShareModalProps {
  reportId: string
}

interface ShareSettings {
  isPublic: boolean
  shareToken: string | null
  shareUrl: string | null
  allowComments: boolean
  allowEmbed: boolean
  expiresAt: string | null
  hasPassword: boolean
}

export function ShareModal({ reportId }: ShareModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState<ShareSettings>({
    isPublic: false,
    shareToken: null,
    shareUrl: null,
    allowComments: true,
    allowEmbed: false,
    expiresAt: null,
    hasPassword: false,
  })
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // New password form state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [expiration, setExpiration] = useState<string>('none')

  useEffect(() => {
    if (isOpen) {
      fetch(`/api/reports/${reportId}/share`)
        .then((res) => res.json())
        .then((data) => {
          setSettings({
            isPublic: data.isPublic || false,
            shareToken: data.shareToken || null,
            shareUrl: data.shareUrl || null,
            allowComments: data.allowComments !== false,
            allowEmbed: data.allowEmbed || false,
            expiresAt: data.expiresAt || null,
            hasPassword: data.password || false,
          })
        })
        .finally(() => setInitialLoading(false))
    }
  }, [isOpen, reportId])

  const togglePublic = async () => {
    setLoading(true)
    const res = await fetch(`/api/reports/${reportId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: !settings.isPublic }),
    })

    if (res.ok) {
      const data = await res.json()
      setSettings((prev) => ({
        ...prev,
        isPublic: data.isPublic,
        shareToken: data.shareToken,
        shareUrl: data.shareUrl,
      }))
      toast.success(settings.isPublic ? 'Lien rendu privé' : 'Lien rendu public')
    } else {
      toast.error('Erreur lors de la mise à jour')
    }
    setLoading(false)
  }

  const updateSettings = async (updates: Partial<ShareSettings>) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        const data = await res.json()
        setSettings((prev) => ({
          ...prev,
          ...updates,
          hasPassword: data.password || false,
        }))
        toast.success('Paramètres mis à jour')
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 12) {
      toast.error('Le mot de passe doit contenir au moins 12 caractères')
      return
    }
    // Verify complexity requirements match server validation
    const hasUppercase = /[A-Z]/.test(newPassword)
    const hasLowercase = /[a-z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      toast.error('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial')
      return
    }

    await updateSettings({
      password: newPassword,
      expiresAt: expiration !== 'none' ? expiration : undefined,
    })
    setShowPasswordForm(false)
    setNewPassword('')
    setConfirmPassword('')
    setExpiration('none')
  }

  const handleRemovePassword = async () => {
    await updateSettings({ password: '' })
  }

  const copyLink = () => {
    if (settings.shareUrl) {
      navigator.clipboard.writeText(settings.shareUrl)
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
      <div className="relative z-50 w-full max-w-lg bg-surface border border-border rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
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
            {/* Public/Private Toggle */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                {settings.isPublic ? (
                  <Globe className="w-5 h-5 text-green-500" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-foreground">
                    {settings.isPublic ? 'Lien public activé' : 'Lien privé'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {settings.isPublic
                      ? 'Toute personne avec le lien peut voir'
                      : 'Réservé aux membres'}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.isPublic}
                onCheckedChange={togglePublic}
                disabled={loading}
              />
            </div>

            {/* Share URL */}
            {settings.isPublic && settings.shareUrl && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Lien de partage
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={settings.shareUrl}
                    className="flex-1 px-3 py-2 border border-input bg-muted rounded-md text-sm"
                  />
                  <Button
                    onClick={copyLink}
                    variant="outline"
                    size="icon"
                    aria-label="Copier le lien"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Password Protection */}
            {settings.isPublic && (
              <div className="border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Protection par mot de passe</p>
                      <p className="text-sm text-muted-foreground">
                        {settings.hasPassword ? 'Lien protégé' : 'Optionnel'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                  >
                    {settings.hasPassword ? 'Modifier' : 'Ajouter'}
                  </Button>
                </div>

                {showPasswordForm && (
                  <div className="space-y-3 pt-3 border-t">
                    <div>
                      <Label className="text-sm">Nouveau mot de passe</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 12 caractères"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Confirmer le mot de passe</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirmer"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handlePasswordSubmit} disabled={loading}>
                        Enregistrer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPasswordForm(false)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}

                {settings.hasPassword && !showPasswordForm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={handleRemovePassword}
                    disabled={loading}
                  >
                    Retirer la protection
                  </Button>
                )}
              </div>
            )}

            {/* Expiration */}
            {settings.isPublic && (
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Expiration du lien</p>
                    <p className="text-sm text-muted-foreground">
                      Le lien expire automatiquement après cette période
                    </p>
                  </div>
                </div>
                <Select
                  value={settings.expiresAt ? getExpirationValue(settings.expiresAt) : 'none'}
                  onValueChange={async (value) => {
                    setExpiration(value)
                    if (value !== 'none') {
                      await updateSettings({ expiresAt: value })
                    } else {
                      await updateSettings({ expiresAt: null })
                    }
                  }}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Jamais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Jamais</SelectItem>
                    <SelectItem value="7d">7 jours</SelectItem>
                    <SelectItem value="30d">30 jours</SelectItem>
                    <SelectItem value="90d">90 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Embed Option */}
            {settings.isPublic && (
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Autoriser l&apos;embed</p>
                  <p className="text-sm text-muted-foreground">允许在 otros sitios web</p>
                </div>
                <Switch
                  checked={settings.allowEmbed}
                  onCheckedChange={(checked) => updateSettings({ allowEmbed: checked })}
                  disabled={loading}
                />
              </div>
            )}

            {/* Comments Note */}
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

function getExpirationValue(expiresAt: string | null): string {
  if (!expiresAt) return 'none'
  const date = new Date(expiresAt)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 7) return '7d'
  if (diffDays <= 30) return '30d'
  if (diffDays <= 90) return '90d'
  return 'none'
}
