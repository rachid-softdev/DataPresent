'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { useRouter } from 'next/navigation'
import { CommentInput } from '@/components/comments/CommentInput'
import { CommentItem } from './CommentItem'
import { MessageSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Comment {
  id: string
  body: string
  createdAt: string
  updatedAt?: string | null
  slideId: string | null
  author: {
    id: string
    name: string | null
    image: string | null
    email: string | null
  }
}

interface CommentThreadProps {
  reportId: string
  currentSlideId?: string | null
  embedded?: boolean
  onClose?: () => void
}

export const CommentThread = memo(function CommentThread({
  reportId,
  currentSlideId,
  embedded = false,
  onClose
}: CommentThreadProps) {
  const router = useRouter()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>()

  useEffect(() => {
    const controller = new AbortController()

    const fetchData = async () => {
      try {
        // Parallel fetches for better performance
        const [commentsRes, userRes] = await Promise.all([
          fetch(`/api/reports/${reportId}/comments`, { signal: controller.signal }),
          fetch('/api/user', { signal: controller.signal })
        ])

        if (commentsRes.ok) {
          const data = await commentsRes.json()
          setComments(data)
        }

        if (userRes.ok) {
          const userData = await userRes.json()
          setCurrentUserId(userData.id)
        }
      } catch (error) {
        // Ignore abort errors - component unmounted
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to fetch comments:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    return () => controller.abort()
  }, [reportId])

  const handleSubmit = async (body: string) => {
    const res = await fetch(`/api/reports/${reportId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, slideId: currentSlideId })
    })

    if (res.ok) {
      const newComment = await res.json()
      setComments(prev => [...prev, newComment])
    }
  }

  const handleEdit = async (commentId: string, body: string) => {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    })

    if (res.ok) {
      const updated = await res.json()
      setComments(prev => prev.map(c => c.id === commentId ? updated : c))
    }
  }

  const handleDelete = async (commentId: string) => {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId))
    }
  }

  const slideComments = useMemo(
    () => comments.filter(c => c.slideId === currentSlideId),
    [comments, currentSlideId]
  )
  const generalComments = useMemo(
    () => comments.filter(c => !c.slideId),
    [comments]
  )

  const CommentList = useMemo(() => memo(function CommentList({
    list,
    emptyMessage
  }: { list: Comment[], emptyMessage: string }) {
    if (list.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
    }
    return (
      <>
        {list.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </>
    )
  }), [currentUserId, handleEdit, handleDelete])

  return (
    <div className={embedded ? "h-full flex flex-col" : "fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg flex flex-col z-50"}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <h3 className="font-semibold">Commentaires</h3>
          <span className="text-xs text-muted-foreground">({comments.length})</span>
        </div>
        {onClose && (
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : (
          <>
            {currentSlideId && slideComments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Commentaires sur cette slide
                </h4>
                <div className="space-y-1">
                  <CommentList list={slideComments} emptyMessage="Aucun commentaire sur cette slide" />
                </div>
              </div>
            )}

            {generalComments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Commentaires généraux
                </h4>
                <div className="space-y-1">
                  <CommentList list={generalComments} emptyMessage="Aucun commentaire général" />
                </div>
              </div>
            )}

            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun commentaire. Soyez le premier à commenter !
              </p>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t">
        <CommentInput
          onSubmit={handleSubmit}
          placeholder={currentSlideId ? "Commenter cette slide..." : "Ajouter un commentaire..."}
        />
      </div>
    </div>
  )
})