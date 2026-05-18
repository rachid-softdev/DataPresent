import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12 dark:bg-gray-900">
      <div className="text-center">
        <p className="text-9xl font-bold text-gray-200 dark:text-gray-800">404</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Page non trouvée
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">
            Retour à l'accueil
          </Link>
        </Button>
      </div>
    </div>
  )
}