export default function BillingLoading() {
  return (
    <div>
      <div className="w-64 h-9 bg-muted animate-pulse rounded mb-8" />

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border rounded-lg p-6">
            <div className="w-24 h-4 bg-muted animate-pulse rounded mb-2" />
            <div className="w-32 h-8 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>

      <div className="border rounded-lg p-6">
        <div className="w-48 h-6 bg-muted animate-pulse rounded mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b">
              <div className="w-32 h-4 bg-muted animate-pulse rounded" />
              <div className="w-16 h-4 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
