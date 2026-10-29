import React from 'react'
import { cn } from '@/lib/utils'

interface AdminPageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  maxWidth?: '5xl' | '6xl' | '7xl' | 'full'
}

export function AdminPageContainer({
  children,
  maxWidth = '7xl',
  className,
  ...props
}: AdminPageContainerProps) {
  const maxWidthClass = {
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  }[maxWidth]

  return (
    <div
      className={cn('p-4 sm:p-6 lg:p-8 space-y-6 mx-auto w-full', maxWidthClass, className)}
      {...props}
    >
      {children}
    </div>
  )
}
