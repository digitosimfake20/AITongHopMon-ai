import { cn } from '@/lib/utils'

interface SkipLinkProps {
  href?: string
  className?: string
  children?: React.ReactNode
}

/** Visually hidden until focused; jumps to main content landmark. */
export function SkipLink({
  href = '#main-content',
  className,
  children = 'Chuyển tới nội dung chính',
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'bg-background text-foreground border-border absolute top-3 left-3 z-[100] -translate-y-[220%] rounded-lg border px-4 py-2 text-sm font-medium shadow-md transition-transform focus:translate-y-0 focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      {children}
    </a>
  )
}
