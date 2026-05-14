export default function BlogLoading() {
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
        {/* Hero Skeleton */}
        <section className="py-16 md:py-24 px-6 border-b border-border">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-48 h-12 bg-muted animate-pulse rounded mx-auto mb-4" />
            <div className="w-96 h-6 bg-muted animate-pulse rounded mx-auto" />
          </div>
        </section>

        {/* Articles Grid Skeleton */}
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted aspect-video rounded-lg mb-4" />
                  <div className="flex gap-2 mb-3">
                    <div className="w-16 h-5 bg-muted rounded" />
                    <div className="w-16 h-5 bg-muted rounded" />
                  </div>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-6 bg-muted rounded w-1/2 mb-3" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="w-32 h-4 bg-muted animate-pulse rounded mx-auto" />
        </div>
      </footer>
    </div>
  )
}