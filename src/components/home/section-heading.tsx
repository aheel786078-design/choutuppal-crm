import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  title: string
  action?: React.ReactNode
  className?: string
  id?: string
}

export function SectionHeading({
  title,
  action,
  className,
  id,
}: SectionHeadingProps) {
  return (
    <div
      id={id}
      className={cn(
        'flex items-center justify-between gap-4 px-1 sm:px-2',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
