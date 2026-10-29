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
        'p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3.5 max-w-lg mx-auto shadow-sm',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 shadow-inner">
        <Icon className="w-6 h-6 stroke-[1.5]" />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {description && (
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
