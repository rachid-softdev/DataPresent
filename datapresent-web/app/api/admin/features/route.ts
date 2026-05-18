// ==========================================
// GET /api/admin/features
// PUT /api/admin/features/:key
// Admin only
// ==========================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { FeatureType } from '@prisma/client'

// GET all features
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const sort = searchParams.get('sort') ?? 'key:asc'

    const skip = (page - 1) * limit

    const [features, total] = await Promise.all([
      prisma.feature.findMany({
        skip,
        take: limit,
        orderBy: { key: 'asc' },
      }),
      prisma.feature.count(),
    ])

    return NextResponse.json({
      data: features,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[admin/features] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a feature
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Extract key from URL path
    const url = new URL(request.url)
    const key = url.pathname.split('/').slice(-2, -1)[0]

    const body = await request.json()
    const { description, type, defaultConfig, isActive } = body

    const feature = await prisma.feature.update({
      where: { key },
      data: {
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type: type as FeatureType }),
        ...(defaultConfig !== undefined && { defaultConfig }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(feature)
  } catch (error) {
    console.error('[admin/features] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new feature
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { key, description, type, defaultConfig, isActive } = body

    if (!key) {
      return NextResponse.json({ error: 'Missing required field: key' }, { status: 400 })
    }

    // Check if key already exists
    const existing = await prisma.feature.findUnique({ where: { key } })
    if (existing) {
      return NextResponse.json({ error: 'Feature key already exists' }, { status: 409 })
    }

    const feature = await prisma.feature.create({
      data: {
        key,
        description: description ?? null,
        type: (type as FeatureType) ?? 'BOOLEAN',
        defaultConfig: defaultConfig ?? null,
        isActive: isActive ?? true,
      },
    })

    return NextResponse.json(feature, { status: 201 })
  } catch (error) {
    console.error('[admin/features] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
