'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Select } from '@/components/ui/select'
import { Loader2, UserPlus, Trash2 } from 'lucide-react'

interface TeamMember {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
}

const ROLE_LABELS = {
  OWNER: 'Propriétaire',
  ADMIN: 'Admin',
  MEMBER: 'Membre',
}

const ROLE_COLORS = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-gray-100 text-gray-700',
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  if (email) {
    return email[0].toUpperCase()
  }
  return '?'
}

export default function TeamPage() {
  const t = useTranslations('settings')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const sessionRes = await fetch('/api/user')
        if (sessionRes.ok) {
          const userData = await sessionRes.json()
          setCurrentUserId(userData.id)
        }
      } catch (error) {
        console.error('Failed to fetch session:', error)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!orgId) return

    async function fetchMembers() {
      try {
        const res = await fetch(`/api/organizations/${orgId}/members`)
        if (res.ok) {
          const data = await res.json()
          setMembers(data.members)
          
          const currentMember = data.members.find((m: TeamMember) => m.id === currentUserId)
          if (currentMember) {
            setCurrentUserRole(currentMember.role)
          }
        }
      } catch (error) {
        console.error('Failed to fetch members:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [orgId, currentUserId])

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !orgId) return

    setInviting(true)
    setInviteError('')

    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })

      if (res.ok) {
        const res = await fetch(`/api/organizations/${orgId}/members`)
        if (res.ok) {
          const data = await res.json()
          setMembers(data.members)
        }
        setInviteEmail('')
        setShowInviteForm(false)
      } else {
        const error = await res.json()
        setInviteError(error.error || 'Erreur lors de l\'invitation')
      }
    } catch (error) {
      setInviteError('Erreur lors de l\'invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!orgId || !confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) return

    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberId }),
      })

      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== memberId))
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const canManageTeam = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Équipe</h1>
          <p className="text-muted-foreground mt-2">
            Gérez les membres de votre organisation
          </p>
        </div>

        {canManageTeam && !showInviteForm && (
          <Button onClick={() => setShowInviteForm(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Inviter un membre
          </Button>
        )}
      </div>

      {showInviteForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Inviter un membre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Adresse email
                </label>
                <Input
                  type="email"
                  placeholder="collegue@entreprise.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rôle
                </label>
                <Select 
                  value={inviteRole} 
                  onValueChange={(v: string) => setInviteRole(v as 'ADMIN' | 'MEMBER')}
                >
                  <option value="MEMBER">Membre</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </div>

              {inviteError && (
                <p className="text-sm text-red-500">{inviteError}</p>
              )}

              <div className="flex gap-2">
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Inviter
                </Button>
                <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Membres ({members.length})</CardTitle>
          <CardDescription>
            Les personnes ayant accès à votre organisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Aucun membre pour le moment
            </p>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <Avatar src={member.image} fallback={getInitials(member.name, member.email)} />
                    <div>
                      <p className="font-medium">
                        {member.name || member.email || 'Utilisateur'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[member.role]}`}>
                      {ROLE_LABELS[member.role]}
                    </span>

                    {canManageTeam && member.role !== 'OWNER' && member.id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleRemove(member.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}