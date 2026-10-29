import React from 'react'
import { cn } from '@/lib/utils'

interface AdminTableSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

export function AdminTableSkeleton({
  rows = 5,
  columns = 5,
  className,
}: AdminTableSkeletonProps) {
  return (
    <div
      className={cn(
        'w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow animate-pulse',
        className
      )}
    >
      {/* Header skeleton */}
      <div className="h-10 bg-slate-950 border-b border-slate-800/80 px-4 flex items-center gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-slate-800 rounded w-20"
            style={{ width: `${Math.floor(60 + (i % 3) * 30)}px` }}
          />
        ))}
      </div>

      {/* Row skeletons */}
      <div className="divide-y divide-slate-800/50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="h-14 px-4 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, c) => (
              <div
                key={c}
                className="h-4 bg-slate-800/60 rounded"
                style={{ width: `${Math.floor(70 + ((r + c) % 4) * 25)}px` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
