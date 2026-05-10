'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface Organization {
  id: string
  name: string
  slug: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  plan?: string
  memberCount?: number
  reportCount?: number
}

interface Member {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
}

export default function OrganizationSettingsPage() {
  const router = useRouter()
  const t = useTranslations('settings')
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [newOrgSlug, setNewOrgSlug] = useState('')

  useEffect(() => {
    fetch('/api/organizations')
      .then(res => res.json())
      .then(data => {
        setOrgs(data.organizations || [])
        if (data.organizations?.length > 0) {
          setSelectedOrg(data.organizations[0].id)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedOrg) {
      fetch(`/api/organizations/${selectedOrg}/members`)
        .then(res => res.json())
        .then(data => setMembers(data.members || []))
    }
  }, [selectedOrg])

  const handleCreateOrg = async () => {
    if (!newOrgName || !newOrgSlug) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setSaving(true)
    const res = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newOrgName, slug: newOrgSlug })
    })

    if (res.ok) {
      const data = await res.json()
      setOrgs([...orgs, data.organization])
      setSelectedOrg(data.organization.id)
      setNewOrgName('')
      setNewOrgSlug('')
      toast.success('Organisation créée')
      router.push(`/?org=${data.organization.id}`)
    } else {
      const error = await res.json()
      toast.error(error.error || 'Erreur lors de la création')
    }
    setSaving(false)
  }

  const handleInvite = async () => {
    if (!inviteEmail || !selectedOrg) return

    setSaving(true)
    const res = await fetch(`/api/organizations/${selectedOrg}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail })
    })

    if (res.ok) {
      const data = await res.json()
      setInviteEmail('')
      const membersRes = await fetch(`/api/organizations/${selectedOrg}/members`)
      const membersData = await membersRes.json()
      setMembers(membersData.members || [])
      toast.success('Membre invité')
    } else {
      const error = await res.json()
      toast.error(error.error || 'Erreur lors de l\'invitation')
    }
    setSaving(false)
  }

  const handleRemoveMember = async (userId: string) => {
    if (!selectedOrg) return

    const res = await fetch(`/api/organizations/${selectedOrg}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })

    if (res.ok) {
      setMembers(members.filter(m => m.id !== userId))
      toast.success('Membre supprimé')
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Paramètres organisation</h1>

      <Tabs defaultValue="organizations">
        <TabsList>
          <TabsTrigger value="organizations">Mes organisations</TabsTrigger>
          <TabsTrigger value="members" disabled={!selectedOrg}>
            Membres {selectedOrg && `(${members.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations">
          <div className="grid md:grid-cols-2 gap-6">
            {orgs.map(org => (
              <Card 
                key={org.id} 
                className={`cursor-pointer transition-all ${selectedOrg === org.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedOrg(org.id)}
              >
                <CardHeader>
                  <CardTitle>{org.name}</CardTitle>
                  <CardDescription>@{org.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Badge variant={org.role === 'OWNER' ? 'default' : 'secondary'}>
                      {org.role}
                    </Badge>
                    <Badge variant="outline">{org.plan}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle>Créer une organisation</CardTitle>
                <CardDescription>Créez une nouvelle équipe ou entreprise</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nom</label>
                  <Input
                    placeholder="Ma Société"
                    value={newOrgName}
                    onChange={(e) => {
                      setNewOrgName(e.target.value)
                      setNewOrgSlug(generateSlug(e.target.value))
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Slug (URL)</label>
                  <Input
                    placeholder="ma-societe"
                    value={newOrgSlug}
                    onChange={(e) => setNewOrgSlug(generateSlug(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">datapresent.com/{newOrgSlug || '...'}</p>
                </div>
                <Button onClick={handleCreateOrg} disabled={saving}>
                  {saving ? 'Création...' : 'Créer'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members">
          {selectedOrg && (
            <Card>
              <CardHeader>
                <CardTitle>Membres</CardTitle>
                <CardDescription>Gérez les membres de votre organisation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="email@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button onClick={handleInvite} disabled={saving || !inviteEmail}>
                    Inviter
                  </Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar src={member.image} fallback={member.name || member.email} />
                        <div>
                          <p className="font-medium">{member.name || 'Sans nom'}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{member.role}</Badge>
                        {member.role !== 'OWNER' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}