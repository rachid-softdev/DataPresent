import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-lg border p-6">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
