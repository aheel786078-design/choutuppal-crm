import React from 'react'
import { FolderSearch } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminEmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function AdminEmptyState({
  icon: Icon = FolderSearch,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: AdminEmptyStateProps) {
  return (
    <div
      className={cn(
        'p-12 text-center bg-white border border-slate-200/80 rounded-2xl shadow-xs text-slate-900 flex flex-col items-center justify-center space-y-3.5 max-w-lg mx-auto shadow-sm',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
        <Icon className="w-6 h-6 stroke-[1.5]" />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {description && (
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
