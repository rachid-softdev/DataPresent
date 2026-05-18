'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, Globe, Lock, Link2, Calendar, MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ShareSettings {
  isPublic: boolean
  shareToken: string | null
  allowComments: boolean
  allowEmbed: boolean
  expiresAt: string | null
  password: string | null
  commentCount: number
  embedUrl: string | null
}

export default function SharePage({ params }: { params: { id: string } }) {
  const t = useTranslations('share')
  const reportId = params.id

  const [settings, setSettings] = useState<ShareSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [allowComments, setAllowComments] = useState(true)
  const [allowEmbed, setAllowEmbed] = useState(false)
  const [expiresIn, setExpiresIn] = useState<string>('never')
  const [hasPassword, setHasPassword] = useState(false)
  const [password, setPassword] = useState('')

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(`/api/reports/${reportId}/share`)
        if (res.ok) {
          const data = await res.json()
          setSettings(data)
          setShareUrl(data.shareUrl || null)
          setEmbedUrl(data.embedUrl || null)
          setAllowComments(data.allowComments ?? true)
          setAllowEmbed(data.allowEmbed ?? false)
          setExpiresIn(data.expiresAt ? 'custom' : 'never')
        }
      } catch (error) {
        console.error('Failed to fetch share settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [reportId])

  const copyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Lien copié dans le presse-papiers')
    }
  }

  const togglePublic = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !settings.isPublic })
      })

      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setShareUrl(data.shareUrl || null)
        toast.success(data.isPublic ? 'Rapport rendu public' : 'Rapport rendu privé')
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowComments,
          allowEmbed,
          expiresAt: expiresIn === 'never' ? null : expiresIn,
          password: hasPassword ? password : null,
        })
      })

      if (res.ok) {
        toast.success('Paramètres sauvegardés')
      } else {
        toast.error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const disableSharing = async () => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver le partage ?')) return

    setSaving(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: false })
      })

      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setShareUrl(null)
        toast.success('Partage désactivé')
      }
    } catch (error) {
      toast.error('Erreur lors de la désactivation')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Paramètres de partage</h1>
        <p className="text-muted-foreground mt-2">
          Gérez l'accès public à votre rapport
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {settings?.isPublic ? (
                <>
                  <Globe className="w-5 h-5 text-green-500" />
                  <span>Lien public actif</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Lien privé</span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              {settings?.isPublic
                ? 'Toute personne avec le lien peut voir ce rapport'
                : 'Seuls les membres de votre organisation peuvent voir ce rapport'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settings?.isPublic && shareUrl && (
              <div>
                <Label className="mb-2 block">Lien de partage</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="flex-1 font-mono text-sm"
                  />
                  <Button onClick={copyLink} variant="outline" size="icon">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            {settings?.isPublic && embedUrl && (
              <div>
                <Label className="mb-2 block">Lien d'intégration (iframe)</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={embedUrl}
                    className="flex-1 font-mono text-sm"
                  />
                  <Button onClick={() => {
                    navigator.clipboard.writeText(`<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`)
                    toast.success('Code iframe copié')
                  }} variant="outline" size="icon">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Copiez ce code HTML pour intégrer le rapport sur votre site
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {settings?.isPublic ? (
                  <Globe className="w-5 h-5 text-green-500" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {settings?.isPublic ? 'Rapport public' : 'Rapport privé'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {settings?.isPublic ? 'Visible par tous' : 'Réservé aux membres'}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings?.isPublic || false}
                onCheckedChange={togglePublic}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        {settings?.isPublic && (
          <Card>
            <CardHeader>
              <CardTitle>Options avancées</CardTitle>
              <CardDescription>
                Configurez des options supplémentaires pour le lien de partage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Autoriser les commentaires</p>
                    <p className="text-sm text-muted-foreground">
                      Permet aux visiteurs de commenter
                    </p>
                  </div>
                </div>
                <Switch
                  checked={allowComments}
                  onCheckedChange={setAllowComments}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Autoriser l'intégration (iframe)</p>
                    <p className="text-sm text-muted-foreground">
                      Permet d'intégrer le rapport sur un site externe
                    </p>
                  </div>
                </div>
                <Switch
                  checked={allowEmbed}
                  onCheckedChange={setAllowEmbed}
                />
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <Label className="mb-2 block">Expiration du lien</Label>
                  <Select value={expiresIn} onValueChange={setExpiresIn}>
                    <option value="never">Jamais</option>
                    <option value="7d">7 jours</option>
                    <option value="30d">30 jours</option>
                    <option value="90d">90 jours</option>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <Label className="mb-2 block">Mot de passe</Label>
                  <Input
                    type="password"
                    placeholder={hasPassword ? '••••••••' : 'Aucun mot de passe'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={!hasPassword}
                  />
                </div>
                <Switch
                  checked={hasPassword}
                  onCheckedChange={setHasPassword}
                  className="mt-6"
                />
              </div>

              <Button onClick={saveSettings} disabled={saving} className="w-full">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Sauvegarder les paramètres
              </Button>
            </CardContent>
          </Card>
        )}

        {settings?.isPublic && (
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <Button
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                onClick={disableSharing}
                disabled={saving}
              >
                Désactiver le partage
              </Button>
            </CardContent>
          </Card>
        )}

        {settings?.commentCount !== undefined && settings.commentCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  <span>{settings.commentCount} commentaire{settings.commentCount > 1 ? 's' : ''}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}