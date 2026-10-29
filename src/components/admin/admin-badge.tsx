import React from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'purple'

interface AdminBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: React.ReactNode
  size?: 'sm' | 'md'
  dot?: boolean
}

export function AdminBadge({
  variant = 'neutral',
  children,
  size = 'sm',
  dot = false,
  className,
  ...props
}: AdminBadgeProps) {
  const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; dotColor: string }> = {
    success: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      dotColor: 'bg-emerald-400',
    },
    warning: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      dotColor: 'bg-amber-400',
    },
    danger: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      dotColor: 'bg-rose-400',
    },
    info: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      dotColor: 'bg-blue-400',
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
      dotColor: 'bg-purple-400',
    },
    neutral: {
      bg: 'bg-slate-800/80',
      text: 'text-slate-300',
      border: 'border-slate-700/60',
      dotColor: 'bg-slate-400',
    },
  }

  const s = variantStyles[variant] || variantStyles.neutral

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border leading-none shrink-0',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        s.bg,
        s.text,
        s.border,
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', s.dotColor)} />
          <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', s.dotColor)} />
        </span>
      )}
      <span>{children}</span>
    </span>
  )
}
