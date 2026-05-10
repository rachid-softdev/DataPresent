import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SlideCard } from '@/components/slides/SlideCard'
import { Watermark } from '@/components/watermark/Watermark'

export default async function EmbedPage({ params, searchParams }: {
  params: Promise<{ shareToken: string }>
  searchParams: Promise<{ theme?: string; autoplay?: string }>
}) {
  const { shareToken } = await params
  const { theme } = await searchParams

  // Determine autoplay from searchParams (reserved for future carousel implementation)
  // const autoplay = searchParams?.autoplay === 'true' — not yet implemented

  const report = await prisma.report.findUnique({
    where: { shareToken, isPublic: true, allowEmbed: true },
    include: {
      slides: { orderBy: { position: 'asc' } },
      org: { include: { subscription: true } }
    }
  })

  if (!report) {
    notFound()
  }

  const plan = report.org.subscription?.plan || 'FREE'
  const showWatermark = plan === 'FREE'
  const isDark = theme === 'dark'

  return (
    <div className={`min-h-screen ${isDark ? 'bg-black' : 'bg-white'}`}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {report.title}
        </h1>

        <div className="space-y-8">
          {report.slides.map((slide) => (
            <div key={slide.id} className="relative">
              <SlideCard slide={slide} />
              {showWatermark && (
                <Watermark show={showWatermark} />
              )}
            </div>
          ))}
        </div>

        {showWatermark && (
          <Watermark show={showWatermark} position="footer" />
        )}
      </div>
    </div>
  )
}