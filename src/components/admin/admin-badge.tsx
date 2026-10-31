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
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      dotColor: 'bg-emerald-600',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dotColor: 'bg-amber-500',
    },
    danger: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      dotColor: 'bg-rose-600',
    },
    info: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      dotColor: 'bg-blue-600',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200',
      dotColor: 'bg-purple-600',
    },
    neutral: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dotColor: 'bg-slate-500',
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
