'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface OnboardingStep {
  id: string
  target?: string
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

interface OnboardingContextType {
  currentStep: number
  steps: OnboardingStep[]
  nextStep: () => void
  prevStep: () => void
  complete: () => void
  isComplete: boolean
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}

interface OnboardingProviderProps {
  steps: OnboardingStep[]
  children: React.ReactNode
  storageKey?: string
}

export function OnboardingProvider({ steps, children, storageKey = 'onboarding_complete' }: OnboardingProviderProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const { complete, step } = JSON.parse(stored)
      if (complete) {
        setIsComplete(true)
      } else {
        setCurrentStep(step || 0)
        setIsOpen(true)
      }
    } else {
      setIsOpen(true)
    }
  }, [storageKey])

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      complete()
    }
  }, [currentStep, steps.length])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const complete = useCallback(() => {
    setIsComplete(true)
    setIsOpen(false)
    localStorage.setItem(storageKey, JSON.stringify({ complete: true, step: 0 }))
  }, [storageKey])

  return (
    <OnboardingContext.Provider value={{ currentStep, steps, nextStep, prevStep, complete, isComplete }}>
      {children}
      {isOpen && !isComplete && <OnboardingOverlay />}
    </OnboardingContext.Provider>
  )
}

function OnboardingOverlay() {
  const { currentStep, steps, nextStep, prevStep, complete } = useOnboarding()
  const step = steps[currentStep]
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (step.target) {
      const el = document.querySelector(`[data-onboarding="${step.target}"]`)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Add highlight
        el.classList.add('ring-4', 'ring-primary', 'z-[101]', 'relative')
        return () => {
          el.classList.remove('ring-4', 'ring-primary', 'z-[101]', 'relative')
        }
      }
    }
    setTargetRect(null)
  }, [currentStep, step.target])

  const getTooltipPosition = () => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

    const pos = step.position || 'bottom'
    const gap = 12
    const tooltipW = 320
    const tooltipH = 200

    switch (pos) {
      case 'bottom':
        return {
          top: `${targetRect.bottom + gap}px`,
          left: `${targetRect.left + targetRect.width / 2 - tooltipW / 2}px`,
        }
      case 'top':
        return {
          top: `${targetRect.top - tooltipH - gap}px`,
          left: `${targetRect.left + targetRect.width / 2 - tooltipW / 2}px`,
        }
      case 'right':
        return {
          top: `${targetRect.top + targetRect.height / 2 - tooltipH / 2}px`,
          left: `${targetRect.right + gap}px`,
        }
      case 'left':
        return {
          top: `${targetRect.top + targetRect.height / 2 - tooltipH / 2}px`,
          left: `${targetRect.left - tooltipW - gap}px`,
        }
      default:
        return {
          top: `${targetRect.bottom + gap}px`,
          left: `${targetRect.left + targetRect.width / 2 - tooltipW / 2}px`,
        }
    }
  }

  const position = getTooltipPosition()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-[100]"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          style={targetRect ? { position: 'fixed', ...position } : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          className="bg-surface border border-border rounded-lg shadow-xl w-80 p-5 z-[101]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {currentStep + 1}
              </div>
              <span className="text-sm text-muted-foreground">
                Étape {currentStep + 1} sur {steps.length}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={complete}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-2">{step.title}</h2>
          <p className="text-muted-foreground mb-6">{step.content}</p>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              Précédent
            </Button>

            <div className="flex gap-2">
              {currentStep < steps.length - 1 ? (
                <Button size="sm" onClick={nextStep}>
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={complete}>
                  Terminer
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export const DEFAULT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenue sur DataPresent !',
    content: 'Découvrez comment transformer vos données en présentations professionnelles en quelques clics.',
  },
  {
    id: 'new-report',
    target: 'new-report',
    title: 'Créez votre premier rapport',
    content: 'Cliquez sur "Nouveau rapport" pour importer vos données et laisser l\'IA générer votre présentation.',
    position: 'bottom',
  },
  {
    id: 'upload',
    target: 'upload-zone',
    title: 'Importez vos données',
    content: 'Glissez un fichier Excel, CSV ou PDF. Notre IA analysera automatiquement la structure et le contenu.',
    position: 'bottom',
  },
  {
    id: 'sector',
    target: 'sector-selector',
    title: 'Choisissez votre secteur',
    content: 'Finance, Marketing, RH ou SaaS : chaque secteur dispose de modèles et insights adaptés.',
    position: 'bottom',
  },
  {
    id: 'generate',
    target: 'generate-button',
    title: "Laissez l'IA générer",
    content: 'En quelques secondes, votre présentation est prête avec graphiques, KPIs et recommandations.',
    position: 'top',
  },
  {
    id: 'export',
    title: 'Exportez ou partagez',
    content: 'Téléchargez en PPTX, PDF ou Word, ou partagez via un lien public avec commentaires.',
  },
]

interface OnboardingButtonProps {
  className?: string
}

export function RestartOnboardingButton({ className }: OnboardingButtonProps) {
  const handleRestart = () => {
    localStorage.removeItem('onboarding_complete')
    window.location.reload()
  }

  return (
    <Button variant="outline" size="sm" onClick={handleRestart} className={className}>
      Recommencer le guide
    </Button>
  )
}
