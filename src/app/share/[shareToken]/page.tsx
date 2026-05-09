import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Watermark } from '@/components/watermark/Watermark'
import { SlideCard } from '@/components/slides/SlideCard'

export default async function SharePage({ params }: { params: Promise<{ shareToken: string }> }) {
  const t = await getTranslations()
  const { shareToken } = await params

  const report = await prisma.report.findUnique({
    where: { shareToken, isPublic: true },
    include: { 
      slides: { orderBy: { position: 'asc' } },
      org: { include: { subscription: true } }
    },
  })

  if (!report) {
    notFound()
  }

  const plan = report.org.subscription?.plan || 'FREE'
  const showWatermark = plan === 'FREE'

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b py-4">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-xl font-bold text-primary">DataPresent</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{report.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{report.sector}</Badge>
          </div>
        </div>

        <div className="space-y-8">
          {report.slides.map((slide) => (
            <div key={slide.id} className="relative bg-card rounded-lg border p-6 shadow-sm">
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
      </main>
    </div>
  )
}