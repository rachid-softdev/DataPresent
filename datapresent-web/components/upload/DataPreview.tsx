'use client'

import { useState, useEffect } from 'react'
import { Loader2, Table, FileSpreadsheet, FileText } from 'lucide-react'

interface DataPreviewProps {
  file: File | null
}

interface PreviewData {
  headers: string[]
  rows: string[][]
  totalRows: number
  sheetName?: string
}

export function DataPreview({ file }: DataPreviewProps) {
  const [data, setData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setData(null)
      setError(null)
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') {
      setData(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const parseFile = async () => {
      try {
        const XLSX = await import('xlsx')
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

        if (cancelled) return

        if (jsonData.length === 0) {
          setError('Fichier vide')
          setLoading(false)
          return
        }

        const firstRow = jsonData[0]
        const headers = firstRow.map((h) => String(h || ''))
        const rows = jsonData.slice(1, 6).map((row) =>
          row.map((cell) => String(cell ?? ''))
        )
        // Pad rows to match header length
        rows.forEach((row) => {
          while (row.length < headers.length) row.push('')
        })

        setData({
          headers,
          rows,
          totalRows: jsonData.length - 1,
          sheetName,
        })
      } catch {
        if (!cancelled) setError('Impossible de lire le fichier')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    parseFile()
    return () => { cancelled = true }
  }, [file])

  if (!file) return null

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
        <FileText className="w-4 h-4" />
        <span>Apercu non disponible pour les fichiers PDF</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Chargement de l&apos;apercu...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-destructive p-4 bg-destructive/10 rounded-lg">
        {error}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileSpreadsheet className="w-4 h-4" />
        <span>
          {data.sheetName && `${data.sheetName} — `}
          {data.totalRows} ligne{data.totalRows > 1 ? 's' : ''}, {data.headers.length} colonne{data.headers.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              {data.headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.rows.map((row, i) => (
              <tr key={i} className="hover:bg-muted/30">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.totalRows > 5 && (
        <p className="text-xs text-muted-foreground text-center">
          ... et {data.totalRows - 5} autre{data.totalRows - 5 > 1 ? 's' : ''} ligne{data.totalRows - 5 > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
