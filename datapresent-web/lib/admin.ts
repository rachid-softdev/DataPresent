import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export class AdminAuthError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message)
    this.name = 'AdminAuthError'
  }
}

/**
 * Require the current user to be an admin.
 * Returns the userId if authorized.
 * Throws AdminAuthError if not.
 */
export async function requireAdmin(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new AdminAuthError('Unauthorized', 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (user?.role !== 'ADMIN') {
    throw new AdminAuthError('Forbidden', 403)
  }

  return session.user.id
}

/**
 * Wrapper for admin API routes - handles auth + error responses
 */
export async function withAdmin<T>(handler: (userId: string) => Promise<T>): Promise<Response> {
  try {
    const userId = await requireAdmin()
    const result = await handler(userId)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('[Admin API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}