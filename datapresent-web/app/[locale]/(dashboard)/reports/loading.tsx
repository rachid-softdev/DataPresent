export default function ReportsLoading() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div className="w-48 h-9 bg-muted animate-pulse rounded" />
        <div className="w-32 h-10 bg-muted animate-pulse rounded" />
      </div>

      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left">
                <div className="w-20 h-4 bg-muted animate-pulse rounded" />
              </th>
              <th className="px-6 py-3 text-left">
                <div className="w-16 h-4 bg-muted animate-pulse rounded" />
              </th>
              <th className="px-6 py-3 text-left">
                <div className="w-16 h-4 bg-muted animate-pulse rounded" />
              </th>
              <th className="px-6 py-3 text-left">
                <div className="w-16 h-4 bg-muted animate-pulse rounded" />
              </th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...Array(10)].map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <div className="w-48 h-5 bg-muted animate-pulse rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="w-20 h-5 bg-muted animate-pulse rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="w-16 h-6 bg-muted animate-pulse rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="w-24 h-4 bg-muted animate-pulse rounded" />
                </td>
                <td className="px-6 py-4">
                  <div className="w-16 h-8 bg-muted animate-pulse rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
