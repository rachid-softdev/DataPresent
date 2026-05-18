export default function ArticleLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header Skeleton */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="w-32 h-8 bg-muted animate-pulse rounded" />
          <div className="flex gap-4">
            <div className="w-20 h-8 bg-muted animate-pulse rounded" />
            <div className="w-20 h-8 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Article Header Skeleton */}
        <header className="border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
            <div className="w-24 h-4 bg-muted animate-pulse rounded mb-8" />
            <div className="flex gap-2 mb-6">
              <div className="w-16 h-6 bg-muted animate-pulse rounded" />
              <div className="w-20 h-6 bg-muted animate-pulse rounded" />
            </div>
            <div className="w-full h-12 bg-muted animate-pulse rounded mb-4" />
            <div className="w-3/4 h-12 bg-muted animate-pulse rounded mb-6" />
            <div className="w-full h-6 bg-muted animate-pulse rounded mb-8" />
            <div className="flex gap-6">
              <div className="w-32 h-4 bg-muted animate-pulse rounded" />
              <div className="w-24 h-4 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </header>

        {/* Cover Image Skeleton */}
        <div className="max-w-5xl mx-auto w-full px-6">
          <div className="bg-muted animate-pulse rounded-lg aspect-[21/9]" />
        </div>

        {/* Content Skeleton */}
        <article className="max-w-3xl mx-auto px-6 py-12 md:py-16">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-full" />
                <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
                <div className="h-4 bg-muted animate-pulse rounded w-4/6" />
              </div>
            ))}
          </div>
        </article>
      </main>
    </div>
  )
}