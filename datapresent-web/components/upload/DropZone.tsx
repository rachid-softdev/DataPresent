'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DropZoneProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number
  disabled?: boolean
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  xlsx: <FileSpreadsheet className="w-8 h-8 text-green-600" />,
  xls: <FileSpreadsheet className="w-8 h-8 text-green-600" />,
  csv: <FileSpreadsheet className="w-8 h-8 text-blue-600" />,
  pdf: <FileText className="w-8 h-8 text-red-600" />,
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function DropZone({
  onFileSelect,
  accept = '.xlsx,.xls,.csv,.pdf',
  maxSize = 10 * 1024 * 1024,
  disabled = false,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const validateFile = useCallback((file: File): string | null => {
    const ext = getFileExtension(file.name)
    const allowedExts = accept.split(',').map(e => e.trim().replace('.', ''))
    
    if (!allowedExts.includes(ext)) {
      return `Format non supporté. Utilisez: ${accept}`
    }
    
    if (file.size > maxSize) {
      return `Fichier trop volumineux. Maximum: ${formatFileSize(maxSize)}`
    }
    
    return null
  }, [accept, maxSize])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled) return
    
    const file = e.dataTransfer.files[0]
    if (!file) return
    
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    
    setError(null)
    setSelectedFile(file)
    onFileSelect(file)
  }, [disabled, validateFile, onFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    
    setError(null)
    setSelectedFile(file)
    onFileSelect(file)
  }, [validateFile, onFileSelect])

  const handleClear = useCallback(() => {
    setSelectedFile(null)
    setError(null)
  }, [])

  if (selectedFile) {
    const ext = getFileExtension(selectedFile.name)
    return (
      <div className="relative flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
        {FILE_ICONS[ext] || <FileText className="w-8 h-8" />}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{selectedFile.name}</p>
          <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
        </div>
        <button
          onClick={handleClear}
          className="p-1 hover:bg-muted rounded-full transition-colors"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all",
        isDragging && "border-primary bg-primary/5 scale-[1.02]",
        disabled && "opacity-50 cursor-not-allowed",
        !isDragging && "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30",
        error && "border-red-500 bg-red-50"
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      
      <div className={cn(
        "flex flex-col items-center gap-3 text-center",
        isDragging && "scale-110 transition-transform"
      )}>
        <div className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
          isDragging ? "bg-primary/20" : "bg-muted"
        )}>
          <Upload className={cn(
            "w-6 h-6 transition-colors",
            isDragging ? "text-primary" : "text-muted-foreground"
          )} />
        </div>
        
        <div>
          <p className="font-medium">
            {isDragging ? "Déposez votre fichier ici" : "Glissez votre fichier ici ou cliquez pour parcourir"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Excel (.xlsx, .xls), CSV, ou PDF
          </p>
        </div>
      </div>
      
      {error && (
        <p className="mt-3 text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  )
}