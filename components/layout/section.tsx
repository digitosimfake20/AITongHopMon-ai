import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionProps {
  id?: string
  title: string
  description?: string
  align?: 'center' | 'left'
  className?: string
  children: ReactNode
}

export function Section({
  id,
  title,
  description,
  align = 'center',
  className,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24',
        className,
      )}
    >
      <div
        className={cn(
          'max-w-2xl',
          align === 'center' && 'mx-auto text-center',
        )}
      >
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-12 sm:mt-14">{children}</div>
    </section>
  )
}
