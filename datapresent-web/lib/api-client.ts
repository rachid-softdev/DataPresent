/**
 * CSRF-protected fetch wrapper for client-side use.
 * Automatically fetches and attaches CSRF token to mutations.
 */
let csrfTokenPromise: Promise<string> | null = null

async function fetchCsrfToken(): Promise<string> {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch('/api/csrf-token')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch CSRF token')
        return res.json()
      })
      .then(data => data.token as string)
  }
  return csrfTokenPromise
}

export function invalidateCsrfToken(): void {
  csrfTokenPromise = null
}

interface ApiOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
}

export async function apiFetch(url: string, options: ApiOptions = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase()

  // Only add CSRF token for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      const token = await fetchCsrfToken()
      options.headers = {
        ...options.headers,
        'x-csrf-token': token,
      }
    } catch {
      // If CSRF token fetch fails, proceed without it (server will reject)
      console.warn('[api-client] Failed to get CSRF token, request may be rejected')
    }
  }

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}
