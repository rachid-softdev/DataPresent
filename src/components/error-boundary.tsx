'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f1f8ec] dark:bg-[#0c1407] p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#0c1407] border border-[#c5d9b3] dark:border-[#2d4a1f] rounded-2xl p-8 shadow-lg text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#17250e] dark:text-[#e3f1db] mb-2">
              Oups ! Quelque chose s'est mal passé
            </h2>
            <p className="text-[#17250e]/70 dark:text-[#e3f1db]/70 mb-6">
              Une erreur inattendue s'est produite. Veuillez rafraîchir la page ou retourner à l'accueil.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={this.handleReset}
                className="bg-[#3a6a20] text-white hover:bg-[#478524]"
              >
                Réessayer
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="border-[#c5d9b3] text-[#17250e] dark:text-[#e3f1db]"
              >
                Accueil
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}