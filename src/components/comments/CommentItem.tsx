'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MoreHorizontal, Pencil, Trash2, Check } from 'lucide-react'

interface CommentItemProps {
  comment: {
    id: string
    body: string
    createdAt: string
    updatedAt?: string | null
    slideId?: string | null
    author: {
      id: string
      name: string | null
      image: string | null
      email: string | null
    }
  }
  currentUserId?: string
  onEdit: (id: string, body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  if (email) {
    return email[0].toUpperCase()
  }
  return '?'
}

export function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwner = currentUserId === comment.author.id

  const handleSaveEdit = async () => {
    if (!editBody.trim()) return
    await onEdit(comment.id, editBody.trim())
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await onDelete(comment.id)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex gap-3 p-4 rounded-lg hover:bg-muted/30 transition-colors group">
      <Avatar className="w-8 h-8" src={comment.author.image} fallback={getInitials(comment.author.name, comment.author.email)} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {comment.author.name || comment.author.email || 'Utilisateur'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: fr })}
          </span>
          {comment.updatedAt && (
            <span className="text-xs text-muted-foreground">(modifié)</span>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="min-h-[60px] resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}>
                <Check className="w-4 h-4 mr-1" />
                Sauvegarder
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{comment.body}</p>
        )}
      </div>

      {isOwner && !isEditing && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 text-red-500 hover:text-red-600"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}