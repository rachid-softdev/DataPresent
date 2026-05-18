'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface CommentInputProps {
  onSubmit: (body: string) => Promise<void>
  placeholder?: string
  autoFocus?: boolean
}

export function CommentInput({
  onSubmit,
  placeholder = 'Ajouter un commentaire...',
  autoFocus = false
}: CommentInputProps) {
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!body.trim() || loading) return

    setLoading(true)
    try {
      await onSubmit(body.trim())
      setBody('')
    } catch (error) {
      console.error('Failed to submit comment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="min-h-[80px] resize-none"
        disabled={loading}
      />
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          Cmd+Entrée pour envoyer
        </span>
        <Button
          onClick={handleSubmit}
          disabled={!body.trim() || loading}
          size="sm"
        >
          <Send className="w-4 h-4 mr-2" />
          Envoyer
        </Button>
      </div>
    </div>
  )
}