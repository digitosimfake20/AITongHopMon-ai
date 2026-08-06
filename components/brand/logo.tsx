import Image from 'next/image'
import Link from 'next/link'
import { SITE_NAME } from '@/lib/content'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showWordmark?: boolean
  /** Set to `null` to render without a link wrapper */
  href?: string | null
  size?: number
}

export function Logo({
  className,
  showWordmark = true,
  href = '/',
  size = 32,
}: LogoProps) {
  const inner = (
    <>
      <Image
        src="/fpt.png"
        alt={`${SITE_NAME} logo`}
        width={size}
        height={size}
        className="rounded-md object-contain"
        style={{ width: size, height: 'auto' }}
        priority
      />
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          {SITE_NAME}
        </span>
      ) : null}
      <span className="sr-only">{SITE_NAME} home</span>
    </>
  )

  if (href !== null) {
    return (
      <Link
        href={href ?? '/'}
        className={cn('inline-flex shrink-0 items-center gap-2.5', className)}
      >
        {inner}
      </Link>
    )
  }

  return (
    <span className={cn('inline-flex shrink-0 items-center gap-2.5', className)}>
      {inner}
    </span>
  )
}
