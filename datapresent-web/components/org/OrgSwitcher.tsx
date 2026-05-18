'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2, ChevronDown, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface Organization {
  id: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  plan?: string
}

export function OrgSwitcher() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentOrgId = searchParams.get('org')
  
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/organizations')
      .then(res => res.json())
      .then(data => {
        setOrganizations(data.organizations || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const currentOrg = organizations.find(o => o.id === currentOrgId) || organizations[0]

  const handleOrgChange = (orgId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('org', orgId)
    router.push(`/?${params.toString()}`)
  }

  if (loading || organizations.length === 0) {
    return (
      <Button variant="ghost" size="sm" className="flex items-center gap-2" disabled>
        <Building2 className="w-4 h-4" />
        <span>...</span>
      </Button>
    )
  }

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      OWNER: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      MEMBER: 'bg-muted text-muted-foreground'
    }
    return colors[role] || colors.MEMBER
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <span className="max-w-[120px] truncate">{currentOrg?.name || 'Organisation'}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Vos organisations
        </div>
        {organizations.map(org => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleOrgChange(org.id)}
            className={`cursor-pointer ${org.id === currentOrg?.id ? 'bg-muted' : ''}`}
          >
            <div className="flex items-center justify-between w-full gap-2">
              <span className="truncate">{org.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadge(org.role)}`}>
                {org.role}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings/organization')}>
          <Plus className="w-4 h-4 mr-2" />
          Créer ou rejoindre une org
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
