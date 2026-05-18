export default function DashboardLoading() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="w-48 h-8 bg-muted animate-pulse rounded" />
        <div className="w-32 h-10 bg-muted animate-pulse rounded" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="border border-border rounded-lg p-6">
              <div className="h-6 bg-muted rounded w-3/4 mb-4" />
              <div className="flex items-center gap-2">
                <div className="w-16 h-5 bg-muted rounded" />
                <div className="w-24 h-5 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}