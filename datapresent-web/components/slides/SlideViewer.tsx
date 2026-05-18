'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, MessageSquare, List, X } from 'lucide-react'
import { SlideCard } from './SlideCard'
import { SortableSlideList } from './SortableSlideList'
import { CommentThread } from '@/components/comments/CommentThread'
import type { Slide } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface SlideViewerProps {
  slides: Slide[]
  reportId: string
}

interface SlideCommentCount {
  [slideId: string]: number
}

export function SlideViewer({ slides: initialSlides, reportId }: SlideViewerProps) {
  const [slides, setSlides] = useState(initialSlides)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [commentCounts, setCommentCounts] = useState<SlideCommentCount>({})

  useEffect(() => {
    const controller = new AbortController()

    async function fetchCommentCounts() {
      try {
        const res = await fetch(`/api/reports/${reportId}/comments`, {
          signal: controller.signal
        })
        if (res.ok) {
          const comments = await res.json()
          const counts: SlideCommentCount = {}
          comments.forEach((c: { slideId: string | null }) => {
            if (c.slideId) {
              counts[c.slideId] = (counts[c.slideId] || 0) + 1
            }
          })
          setCommentCounts(counts)
        }
      } catch (error) {
        // Ignore abort errors - component unmounted
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to fetch comment counts:', error)
        }
      }
    }

    fetchCommentCounts()
    return () => controller.abort()
  }, [reportId])

  const goToPrev = () => setCurrentIndex(i => Math.max(0, i - 1))
  const goToNext = () => setCurrentIndex(i => Math.min(slides.length - 1, i + 1))

  const handleReorder = useCallback(async (reorderedSlides: Slide[]) => {
    setSlides(reorderedSlides)
    // Persist the new order
    try {
      const res = await fetch(`/api/reports/${reportId}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slideOrder: reorderedSlides.map((s, i) => ({ id: s.id, position: i })),
        }),
      })
      if (!res.ok) {
        toast.error('Erreur lors de la reorganisation')
      }
    } catch {
      toast.error('Erreur lors de la reorganisation')
    }
  }, [reportId])

  if (slides.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune slide disponible
      </div>
    )
  }

  const currentSlide = slides[currentIndex]
  const currentSlideCommentCount = currentSlide?.id ? commentCounts[currentSlide.id] || 0 : 0
  const totalComments = Object.values(commentCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="relative flex gap-4">
      {/* Sidebar with sortable slide list */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden border rounded-lg bg-card p-3"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Slides</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSidebar(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <SortableSlideList
              slides={slides}
              currentIndex={currentIndex}
              onSelect={setCurrentIndex}
              onReorder={handleReorder}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main viewer */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {!showSidebar && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSidebar(true)}
                aria-label="Afficher la liste des slides"
              >
                <List className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrev}
              disabled={currentIndex === 0}
              aria-label="Slide precedente"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Slide {currentIndex + 1} sur {slides.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              disabled={currentIndex === slides.length - 1}
              aria-label="Slide suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {slides.map((slide, i) => {
                const slideCommentCount = commentCounts[slide.id] || 0
                return (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentIndex(i)}
                    className="p-2 group"
                    aria-label={`Slide ${i + 1} sur ${slides.length}${slideCommentCount > 0 ? `, ${slideCommentCount} commentaires` : ''}`}
                    aria-current={i === currentIndex ? 'true' : undefined}
                  >
                    <span className={`block h-2 rounded-full transition-all ${
                      i === currentIndex
                        ? 'w-8 bg-primary'
                        : 'w-2 bg-muted group-hover:bg-muted-foreground/50'
                    }`}>
                      {slideCommentCount > 0 && i !== currentIndex && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
                      )}
                    </span>
                  </button>
                )
              })}
            </div>

            <Button
              variant={showComments ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              {totalComments > 0 ? totalComments : 'Commenter'}
            </Button>
          </div>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <SlideCard slide={currentSlide} />
            </motion.div>
          </AnimatePresence>
        </div>

        {currentSlideCommentCount > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <span>{currentSlideCommentCount} commentaire{currentSlideCommentCount > 1 ? 's' : ''} sur cette slide</span>
            <button
              onClick={() => setShowComments(true)}
              className="text-sm text-primary hover:underline h-auto p-0 bg-transparent border-none cursor-pointer"
            >
              Voir tout
            </button>
          </div>
        )}

        <AnimatePresence>
          {showComments && (
            <>
              <div
                className="fixed inset-0 bg-black/20 z-40"
                onClick={() => setShowComments(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg z-50"
              >
                <CommentThread
                  reportId={reportId}
                  currentSlideId={currentSlide?.id || null}
                  embedded
                  onClose={() => setShowComments(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
