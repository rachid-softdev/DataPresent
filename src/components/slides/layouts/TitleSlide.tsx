'use client'

import { Calendar } from 'lucide-react'

interface TitleSlideProps {
  content: {
    subtitle?: string
    date?: string
    author?: string
  }
}

export function TitleSlide({ content }: TitleSlideProps) {
  const { subtitle, date, author } = content

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6">
        <span className="text-2xl font-bold text-white">DP</span>
      </div>
      {subtitle && (
        <p className="text-lg text-gray-600 mb-4 max-w-lg">{subtitle}</p>
      )}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        {date && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{date}</span>
          </div>
        )}
        {author && <span>Par {author}</span>}
      </div>
    </div>
  )
}