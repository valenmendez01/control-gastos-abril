export function MonthDetailsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-200 rounded-lg w-48" />
        <div className="h-10 bg-gray-200 rounded-full w-32" />
      </div>

      {/* Totals cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
        ))}
      </div>

      {/* Expense list */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-6">
      <div className="h-10 bg-gray-200 rounded-lg w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-52 bg-gray-200 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}