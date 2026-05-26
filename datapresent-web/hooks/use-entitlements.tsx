// ==========================================
// useEntitlements Hook
// Client-side hook for feature flags & entitlements
// ==========================================

'use client'

import { useState, useEffect, useCallback, createContext, type ReactNode } from 'react'

// ==========================================
// Types
// ==========================================

export interface EntitlementsData {
  plan: string
  features: Record<string, boolean>
  limits: Record<string, number | null>
  usage: Record<string, number>
  resetAt: Record<string, string | null>
}

interface UseEntitlementsReturn {
  entitlements: EntitlementsData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

interface UseFeatureReturn {
  hasFeature: boolean
  isLoading: boolean
}

interface UseLimitReturn {
  limit: number | null
  used: number
  remaining: number | null
  resetAt: string | null
  isLoading: boolean
}

// ==========================================
// Context
// ==========================================

const EntitlementsContext = createContext<{
  entitlements: EntitlementsData | null
  setEntitlements: (data: EntitlementsData) => void
} | null>(null)

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const [entitlements, setEntitlements] = useState<EntitlementsData | null>(null)

  return (
    <EntitlementsContext.Provider value={{ entitlements, setEntitlements }}>
      {children}
    </EntitlementsContext.Provider>
  )
}

// ==========================================
// Main Hook
// ==========================================

export function useEntitlements(): UseEntitlementsReturn {
  const [entitlements, setEntitlements] = useState<EntitlementsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchEntitlements = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/me/entitlements')

      if (!response.ok) {
        throw new Error('Failed to fetch entitlements')
      }

      const data = await response.json()
      setEntitlements(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntitlements()
  }, [fetchEntitlements])

  return {
    entitlements,
    isLoading,
    error,
    refetch: fetchEntitlements,
  }
}

// ==========================================
// useFeature - Check if feature is enabled
// ==========================================

export function useFeature(featureKey: string): UseFeatureReturn {
  const { entitlements, isLoading } = useEntitlements()

  const hasFeature = entitlements?.features?.[featureKey] ?? false

  return {
    hasFeature,
    isLoading,
  }
}

// ==========================================
// useLimit - Get limit info for a feature
// ==========================================

export function useLimit(limitKey: string): UseLimitReturn {
  const { entitlements, isLoading } = useEntitlements()

  const limit = entitlements?.limits?.[limitKey] ?? null
  const used = entitlements?.usage?.[limitKey] ?? 0
  const resetAt = entitlements?.resetAt?.[limitKey] ?? null

  // null means unlimited
  const isUnlimited = limit === null
  const remaining = isUnlimited ? null : Math.max(0, limit - used)

  return {
    limit: isUnlimited ? null : limit,
    used,
    remaining,
    resetAt,
    isLoading,
  }
}

// ==========================================
// useCanConsume - Check if can consume (frontend-only check)
// ==========================================

export function useCanConsume(featureKey: string, amount: number = 1): boolean {
  const { entitlements } = useEntitlements()

  const limit = entitlements?.limits?.[featureKey] ?? null
  const used = entitlements?.usage?.[featureKey] ?? 0

  // null means unlimited
  if (limit === null) return true

  return used + amount <= limit
}

// ==========================================
// useRemainingUsage - Get remaining usage
// ==========================================

export function useRemainingUsage(featureKey: string): {
  remaining: number | null
  percentUsed: number
  isUnlimited: boolean
} {
  const { entitlements } = useEntitlements()

  const limit = entitlements?.limits?.[featureKey] ?? null
  const used = entitlements?.usage?.[featureKey] ?? 0

  const isUnlimited = limit === null

  return {
    remaining: isUnlimited ? null : Math.max(0, limit - used),
    percentUsed: isUnlimited ? 0 : (used / limit) * 100,
    isUnlimited,
  }
}

// ==========================================
// FeatureGuard Component
// ==========================================

interface FeatureGuardProps {
  feature: string
  children: ReactNode
  fallback?: ReactNode
  showUpgradePrompt?: boolean
}

export function FeatureGuard({
  feature,
  children,
  fallback = null,
  showUpgradePrompt = false,
}: FeatureGuardProps) {
  const { hasFeature } = useFeature(feature)

  if (!hasFeature) {
    if (showUpgradePrompt) {
      return (
        <>
          {fallback}
          <UpgradePrompt feature={feature} />
        </>
      )
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}

// ==========================================
// LimitGuard Component
// ==========================================

interface LimitGuardProps {
  feature: string
  amount?: number
  children: ReactNode
  fallback?: ReactNode
  showUpgradePrompt?: boolean
}

export function LimitGuard({
  feature,
  amount = 1,
  children,
  fallback = null,
  showUpgradePrompt = false,
}: LimitGuardProps) {
  const canConsume = useCanConsume(feature, amount)

  if (!canConsume) {
    if (showUpgradePrompt) {
      return (
        <>
          {fallback}
          <LimitReachedPrompt feature={feature} />
        </>
      )
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}

// ==========================================
// Helper Components
// ==========================================

function UpgradePrompt({ feature }: { feature: string }) {
  const { entitlements } = useEntitlements()

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <p className="text-sm text-amber-800">
        La fonctionnalité <strong>{feature}</strong> n'est pas disponible sur votre plan{' '}
        <strong>{entitlements?.plan ?? 'FREE'}</strong>.
      </p>
      <a
        href="/billing/upgrade"
        className="mt-2 inline-block text-sm font-medium text-amber-600 hover:text-amber-800"
      >
        Mettre à niveau mon plan →
      </a>
    </div>
  )
}

function LimitReachedPrompt({ feature }: { feature: string }) {
  const { entitlements } = useEntitlements()
  const limits = entitlements?.limits
  const usage = entitlements?.usage
  const resetAt = entitlements?.resetAt

  const limit = limits?.[feature] ?? 0
  const used = usage?.[feature] ?? 0
  const featureResetAt = resetAt?.[feature] ?? null
  // Keep 0 as fallback for display purposes in the prompt

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm text-red-800">
        Vous avez atteint la limite de <strong>{limit}</strong> utilisations pour{' '}
        <strong>{feature}</strong> ({used}/{limit}).
        {featureResetAt && (
          <span> Réinitialisation le {new Date(featureResetAt).toLocaleDateString('fr-FR')}.</span>
        )}
      </p>
      <a
        href="/billing/upgrade"
        className="mt-2 inline-block text-sm font-medium text-red-600 hover:text-red-800"
      >
        Mettre à niveau pour plus de limites →
      </a>
    </div>
  )
}

// ==========================================
// PlanBadge Component
// ==========================================

export function PlanBadge() {
  const { entitlements } = useEntitlements()

  const planColors: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-700',
    PRO: 'bg-blue-100 text-blue-700',
    TEAM: 'bg-purple-100 text-purple-700',
    AGENCY: 'bg-amber-100 text-amber-700',
  }

  const plan = entitlements?.plan ?? 'FREE'

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        planColors[plan] ?? planColors.FREE
      }`}
    >
      {plan}
    </span>
  )
}
