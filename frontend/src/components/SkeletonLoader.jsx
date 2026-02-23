export function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-surface-200 dark:border-dark-border">
      <div className="h-4 bg-surface-200 dark:bg-dark-border rounded w-3/4 mb-4" />
      <div className="h-3 bg-surface-200 dark:bg-dark-border rounded w-1/2 mb-2" />
      <div className="h-3 bg-surface-200 dark:bg-dark-border rounded w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-surface-100 dark:bg-dark-surface rounded-t-lg mb-1" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-surface-100 dark:border-dark-border">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-surface-200 dark:bg-dark-border rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
