'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Key, Trash2, Copy, AlertCircle, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ApiKey {
  id: string
  name: string
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
}

export default function ApiKeysPage() {
  const t = useTranslations('settings')
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [hasApiAccess, setHasApiAccess] = useState(false)
  const [error, setError] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/api-keys')
      const data = await res.json()
      
      if (res.ok) {
        setKeys(data.keys || [])
        setHasApiAccess(data.hasApiAccess || false)
      } else {
        setError(data.error || 'Failed to fetch API keys')
      }
    } catch (err) {
      setError('Failed to fetch API keys')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newKeyName.trim()) return
    
    setCreating(true)
    setError('')
    
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setNewKey(data.key) // The key is only returned once!
        setShowCreateDialog(false)
        fetchKeys()
      } else {
        setError(data.error || 'Failed to create API key')
      }
    } catch (err) {
      setError('Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer cette clé ? Cette action est irréversible.')) {
      return
    }
    
    try {
      const res = await fetch(`/api/api-keys?id=${keyId}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        setKeys(keys.filter(k => k.id !== keyId))
      } else {
        setError('Failed to revoke API key')
      }
    } catch (err) {
      setError('Failed to revoke API key')
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Jamais'
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: fr })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!hasApiAccess) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Clés API</h1>
          <p className="text-muted-foreground mt-2">
            Gérez les clés API pour accéder programmatiquement à DataPresent
          </p>
        </div>
        
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            L'accès API n'est disponible que sur le plan Agency. 
            <Button variant="link" className="h-auto p-0 ml-1" onClick={() => window.location.href = '/settings/billing'}>
              Voir les plans
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Clés API</h1>
          <p className="text-muted-foreground mt-2">
            Gérez les clés API pour accéder programmatiquement à DataPresent
          </p>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Key className="w-4 h-4 mr-2" />
          Créer une clé
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {newKey && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="flex items-center justify-between">
              <span>Votre nouvelle clé API (copiez-la maintenant, elle ne sera plus affichée):</span>
              <div className="flex items-center gap-2">
                <code className="bg-white px-3 py-1 rounded border">{newKey}</code>
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Clés API actives</CardTitle>
          <CardDescription>
            Ces clés permettent d'accéder à l'API DataPresent de manière programmatique
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune clé API pour le moment</p>
              <p className="text-sm mt-1">Créez votre première clé pour commencer</p>
            </div>
          ) : (
            <div className="space-y-4">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{key.name}</p>
                      {isExpired(key.expiresAt) && (
                        <Badge variant="destructive">Expirée</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Créée {formatDate(key.createdAt)}
                      {key.lastUsedAt && ` • Dernière utilisation ${formatDate(key.lastUsedAt)}`}
                    </p>
                    {key.expiresAt && (
                      <p className="text-sm text-muted-foreground">
                        Expire {formatDate(key.expiresAt)}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleRevoke(key.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Documentation API</CardTitle>
          <CardDescription>
            Comment utiliser l'API DataPresent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">Authentication</h4>
              <p>Ajoutez votre clé API dans l'en-tête Authorization:</p>
              <code className="bg-muted px-2 py-1 rounded block mt-1">Authorization: Bearer dp_xxxxxxxxxxxxx</code>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Rate Limiting</h4>
              <p>Les requêtes sont limitées à 1000 requêtes par heure par clé.</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Exemple</h4>
              <pre className="bg-muted p-3 rounded overflow-x-auto text-xs">
{`curl -X GET "https://api.datapresent.com/v1/reports" \\
  -H "Authorization: Bearer dp_xxxxxxxxxxxxx"`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une nouvelle clé API</DialogTitle>
            <DialogDescription>
              Donnez un nom descriptif à votre clé pour vous aider à la retrouver
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Nom de la clé
            </label>
            <Input
              placeholder="Ma clé API - Production"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newKeyName.trim()}>
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Créer la clé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}