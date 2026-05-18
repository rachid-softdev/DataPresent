import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listApiKeys, createApiKey, revokeApiKey } from '@/lib/api-keys'
import { getUserPlan } from '@/lib/plan-utils'
import { PLANS } from '@/lib/plans'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId, plan, planConfig } = await getUserPlan(session.user.id)
    
    // Only Agency plan has API access
    if (!planConfig.apiAccess) {
      return NextResponse.json({ error: 'API access not available on your plan' }, { status: 403 })
    }

    const keys = await listApiKeys(orgId)
    
    return NextResponse.json({ 
      keys,
      hasApiAccess: planConfig.apiAccess 
    })
  } catch (error) {
    console.error('Failed to list API keys:', error)
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId, planConfig } = await getUserPlan(session.user.id)
    
    // Only Agency plan has API access
    if (!planConfig.apiAccess) {
      return NextResponse.json({ error: 'API access not available on your plan' }, { status: 403 })
    }

    const body = await req.json()
    const { name, expiresInDays } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Name must be less than 100 characters' }, { status: 400 })
    }

    const result = await createApiKey({
      orgId,
      name: name.trim(),
      expiresInDays: expiresInDays ? parseInt(expiresInDays) : 365,
    })

    return NextResponse.json({ 
      key: result.key, // Only returned once!
      apiKey: result.apiKey 
    })
  } catch (error) {
    console.error('Failed to create API key:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId, planConfig } = await getUserPlan(session.user.id)
    
    if (!planConfig.apiAccess) {
      return NextResponse.json({ error: 'API access not available on your plan' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
    }

    const success = await revokeApiKey(keyId)
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to revoke API key:', error)
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }
}