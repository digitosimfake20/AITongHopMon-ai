import { GraduationCap } from 'lucide-react'
import { SITE_NAME } from '@/lib/content'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showWordmark?: boolean
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="size-4" aria-hidden="true" />
      </span>
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          {SITE_NAME}
        </span>
      ) : null}
      <span className="sr-only">{SITE_NAME} home</span>
    </span>
  )
}
