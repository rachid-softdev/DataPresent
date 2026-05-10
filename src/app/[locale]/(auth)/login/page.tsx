'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { GoogleIcon } from '@/components/ui/icons'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const { theme } = useTheme()
  const t = useTranslations()
  const isDark = theme === 'dark'
  
  const error = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: t(data.message) || data.message })
        setEmail('')
      } else {
        setMessage({ type: 'error', text: t(data.error) || data.error })
      }
    } catch {
      setMessage({ type: 'error', text: t('errors.generic') })
    } finally {
      setLoading(false)
    }
  }

  const getErrorMessage = () => {
    if (!error) return null
    if (error.startsWith('errors.')) {
      return t(error)
    }
    return null
  }

  const errorMessage = getErrorMessage()

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0c1407]' : 'bg-[#f1f8ec]'}`}>
      <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b ${isDark ? 'bg-[#0c1407]/90 border-[#2d4a1f]' : 'bg-[#f1f8ec]/90 border-[#c5d9b3]'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className={`text-2xl font-bold ${isDark ? 'text-[#afdf95]' : 'text-[#3a6a20]'}`}>
            DataPresent
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-md mx-auto">
          <div className={`rounded-2xl p-8 shadow-lg border ${isDark ? 'bg-[#0c1407] border-[#2d4a1f]' : 'bg-white border-[#c5d9b3]'}`}>
            <h1 className={`text-2xl font-bold text-center mb-2 ${isDark ? 'text-[#e3f1db]' : 'text-[#17250e]'}`}>
              Connexion
            </h1>
            <p className={`text-center mb-8 ${isDark ? 'text-[#e3f1db] opacity-70' : 'text-[#17250e] opacity-70'}`}>
              Connectez-vous à votre compte DataPresent
            </p>

            {errorMessage && (
              <div className={`mb-6 p-4 rounded-lg text-sm ${isDark ? 'bg-red-900/20 text-red-400 border border-red-900/30' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <Button
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className={`w-full flex items-center justify-center gap-3 py-3 cursor-pointer ${isDark ? 'bg-[#e3f1db] text-[#0c1407] hover:bg-[#afdf95]' : 'bg-white border-2 border-[#c5d9b3] text-[#17250e] hover:bg-[#e8f0dc]'}`}
              >
                <GoogleIcon className="w-5 h-5" />
                Se connecter avec Google
              </Button>
            </div>

            <div className={`relative my-8 ${isDark ? 'text-[#e3f1db]' : 'text-[#17250e]'}`}>
              <div className={`absolute inset-0 flex items-center ${isDark ? 'text-[#2d4a1f]' : 'text-[#c5d9b3]'}`}>
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-4 ${isDark ? 'bg-[#0c1407] text-[#e3f1db] opacity-50' : 'bg-white text-[#17250e] opacity-50'}`}>ou</span>
              </div>
            </div>

            <form onSubmit={handleMagicLink}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-[#e3f1db]' : 'text-[#17250e]'}`}>
                    Adresse email
                  </label>
                  <Input
                    type="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full py-3 cursor-pointer ${isDark ? 'bg-[#1a2b11] border-[#2d4a1f] text-[#e3f1db] placeholder:text-[#e3f1db]/40' : 'bg-white border-[#c5d9b3] text-[#17250e] placeholder:text-[#17250e]/40'}`}
                    required
                  />
                </div>
                
                {message && (
                  <div className={`p-4 rounded-lg text-sm ${
                    message.type === 'success' 
                      ? isDark ? 'bg-green-900/20 text-green-400 border border-green-900/30' : 'bg-green-50 text-green-600 border border-green-200'
                      : isDark ? 'bg-red-900/20 text-red-400 border border-red-900/30' : 'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                    {message.text}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email}
                  className={`w-full py-3 cursor-pointer ${isDark ? 'bg-[#afdf95] text-[#0c1407] hover:bg-[#478524]' : 'bg-[#3a6a20] text-white hover:bg-[#478524]'}`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi en cours...
                    </span>
                  ) : (
                    'Envoyer le lien de connexion'
                  )}
                </Button>
              </div>
            </form>

            <p className={`text-center text-sm mt-8 ${isDark ? 'text-[#e3f1db] opacity-70' : 'text-[#17250e] opacity-70'}`}>
              Pas encore de compte ?{' '}
              <Link href="/signup" className={`${isDark ? 'text-[#afdf95] hover:underline' : 'text-[#3a6a20] hover:underline'}`}>
                Créez un compte
              </Link>
            </p>
          </div>

          <p className={`text-center text-xs mt-6 ${isDark ? 'text-[#e3f1db] opacity-40' : 'text-[#17250e] opacity-40'}`}>
            Le lien de connexion expire dans 10 minutes • Usage unique
          </p>
        </div>
      </main>
    </div>
  )
}
